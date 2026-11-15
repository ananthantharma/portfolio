/* eslint-disable simple-import-sort/imports */
import {getServerSession} from 'next-auth/next';
import type {NextApiRequest, NextApiResponse} from 'next';

import clientPromise from '../../lib/mongodb';
import {authOptions} from '@/lib/auth';
import {cleanAttachments, cleanTags, faviconFor} from '@/lib/bookmarkFields';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.email) {
      return res.status(401).json({error: 'Unauthorized'});
    }

    if (!clientPromise) {
      return res.status(503).json({error: 'Database not configured. Please set MONGODB_URI environment variable.'});
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'qt_portfolio');
    const collection = db.collection('bookmarks');
    const userEmail = session.user.email;

    if (req.method === 'GET') {
      const bookmarks = await collection.find({userEmail}).sort({category: 1, title: 1}).toArray();
      res.status(200).json({bookmarks});
    } else if (req.method === 'POST') {
      const {title, url, category, description, tags, notes, favorite} = req.body;

      if (!title || typeof url !== 'string' || !category) {
        return res.status(400).json({error: 'Missing required fields'});
      }

      // A bookmark can also be a document kept in Google Drive (downloaded from the bookmarks list)
      const {kind, driveFileId, fileName, mimeType, size} = req.body;
      const isFile = kind === 'file' && typeof driveFileId === 'string' && /^[A-Za-z0-9_-]+$/.test(driveFileId);

      const newBookmark = {
        userEmail,
        title: String(title).slice(0, 300),
        url,
        category: String(category).slice(0, 80),
        description: typeof description === 'string' ? description : '',
        notes: typeof notes === 'string' ? notes.slice(0, 20000) : '',
        tags: cleanTags(tags),
        path: [category],
        favorite: favorite === true,
        attachments: cleanAttachments(req.body.attachments),
        openCount: 0,
        added_timestamp: Math.floor(Date.now() / 1000).toString(),
        icon: isFile ? '' : faviconFor(url),
        ...(isFile
          ? {
              kind: 'file',
              driveFileId,
              fileName: typeof fileName === 'string' ? fileName.slice(0, 500) : title,
              mimeType: typeof mimeType === 'string' ? mimeType.slice(0, 200) : '',
              size: Number.isFinite(Number(size)) ? Number(size) : 0,
            }
          : {}),
      };

      const result = await collection.insertOne(newBookmark);
      res.status(201).json({success: true, id: result.insertedId, icon: newBookmark.icon});
    } else if (req.method === 'PATCH') {
      // Rename a category on every bookmark in it (renaming onto an existing one merges them)
      const {action, from, to} = req.body || {};
      if (action !== 'renameCategory' || typeof from !== 'string' || typeof to !== 'string' || !to.trim()) {
        return res.status(400).json({error: 'Give the category a name'});
      }
      const name = to.trim().slice(0, 80);
      const result = await collection.updateMany({userEmail, category: from}, {$set: {category: name, path: [name]}});
      res.status(200).json({success: true, modified: result.modifiedCount});
    } else {
      res.status(405).json({error: 'Method not allowed'});
    }
  } catch (e: unknown) {
    console.error('API Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    res.status(500).json({error: `Failed to process request: ${errorMessage}`});
  }
}
