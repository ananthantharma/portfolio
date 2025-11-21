import type {NextApiRequest, NextApiResponse} from 'next';

import clientPromise from '../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'BookmarkManager');
    const collection = db.collection('bookmarks');

    if (req.method === 'GET') {
      const bookmarks = await collection.find({}).sort({category: 1, title: 1}).toArray();
      res.status(200).json({bookmarks});
    } else if (req.method === 'POST') {
      const {title, url, category, description} = req.body;

      if (!title || !url || !category) {
        return res.status(400).json({error: 'Missing required fields'});
      }

      const newBookmark = {
        title,
        url,
        category,
        description: description || '',
        path: [category],
        added_timestamp: Math.floor(Date.now() / 1000).toString(),
        icon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`,
      };

      const result = await collection.insertOne(newBookmark);
      res.status(201).json({success: true, id: result.insertedId});
    } else {
      res.status(405).json({error: 'Method not allowed'});
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({error: 'Failed to process request'});
  }
}
