/* eslint-disable simple-import-sort/imports */
import {getServerSession} from 'next-auth/next';
import {ObjectId} from 'mongodb';
import type {NextApiRequest, NextApiResponse} from 'next';

import clientPromise from '../../../lib/mongodb';
import {authOptions} from '@/lib/auth';
import {cleanAttachments, cleanTags, faviconFor} from '@/lib/bookmarkFields';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {id} = req.query;

  if (typeof id !== 'string' || !ObjectId.isValid(id)) {
    return res.status(400).json({error: 'Invalid bookmark ID'});
  }

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

    if (req.method === 'PUT') {
      // Only the fields that were sent change (so starring a bookmark doesn't wipe its notes)
      const b = req.body || {};
      const set: Record<string, unknown> = {updated_timestamp: Math.floor(Date.now() / 1000).toString()};
      if (typeof b.title === 'string' && b.title.trim()) set.title = b.title.trim().slice(0, 300);
      if (typeof b.url === 'string') {
        set.url = b.url;
        const icon = faviconFor(b.url);
        if (icon) set.icon = icon;
      }
      if (typeof b.category === 'string' && b.category.trim()) {
        set.category = b.category.trim().slice(0, 80);
        set.path = [set.category];
      }
      if (typeof b.description === 'string') set.description = b.description;
      if (typeof b.notes === 'string') set.notes = b.notes.slice(0, 20000);
      if (b.tags !== undefined) set.tags = cleanTags(b.tags);
      if (typeof b.favorite === 'boolean') set.favorite = b.favorite;
      if (b.attachments !== undefined) set.attachments = cleanAttachments(b.attachments);

      // "opened": the bookmark was just opened, for "Recent" and "Most used"
      const update: Record<string, unknown> = b.opened === true ? {$set: {...set, lastOpenedAt: Date.now()}, $inc: {openCount: 1}} : {$set: set};

      const result = await collection.updateOne({_id: new ObjectId(id), userEmail: session.user.email}, update);

      if (result.matchedCount === 0) {
        return res.status(404).json({error: 'Bookmark not found or you do not have permission'});
      }

      res.status(200).json({success: true, icon: set.icon});
    } else if (req.method === 'DELETE') {
      // Delete bookmark - Ensure owned by user
      const result = await collection.deleteOne({_id: new ObjectId(id), userEmail: session.user.email});

      if (result.deletedCount === 0) {
        return res.status(404).json({error: 'Bookmark not found or you do not have permission'});
      }

      res.status(200).json({success: true});
    } else {
      res.status(405).json({error: 'Method not allowed'});
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({error: 'Failed to process request'});
  }
}
