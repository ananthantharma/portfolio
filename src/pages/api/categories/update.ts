import type { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '../../../lib/mongodb';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { oldCategory, newCategory } = req.body;

        if (!oldCategory || !newCategory) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || 'BookmarkManager');

        const result = await db.collection('bookmarks').updateMany(
            { category: oldCategory },
            { $set: { category: newCategory } }
        );

        res.status(200).json({
            success: true,
            modifiedCount: result.modifiedCount
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update category' });
    }
}
