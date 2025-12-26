/* eslint-disable simple-import-sort/imports */
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next';

import clientPromise from '../../../lib/mongodb';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid bookmark ID' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!clientPromise) {
      return res.status(503).json({ error: 'Database not configured. Please set MONGODB_URI environment variable.' });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'qt_portfolio');
    const collection = db.collection('bookmarks');

    if (req.method === 'PUT') {
      // Update bookmark - Ensure owned by user
      const { title, url, category, description } = req.body;

      const result = await collection.updateOne(
        { _id: new ObjectId(id), userEmail: session.user.email },
        {
          $set: {
            title,
            url,
            category,
            description,
            updated_timestamp: Math.floor(Date.now() / 1000).toString(),
          },
        },
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Bookmark not found or you do not have permission' });
      }

      res.status(200).json({ success: true });
    } else if (req.method === 'DELETE') {
      // Delete bookmark - Ensure owned by user
      const result = await collection.deleteOne({ _id: new ObjectId(id), userEmail: session.user.email });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Bookmark not found or you do not have permission' });
      }

      res.status(200).json({ success: true });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to process request' });
  }
}
