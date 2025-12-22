import mongoose from 'mongoose';
import {NextApiRequest, NextApiResponse} from 'next';

import dbConnect from '@/lib/dbConnect';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({success: false, message: 'Method not allowed'});
  }

  try {
    await dbConnect();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    const stats = await db.stats();

    // stats.storageSize: The size of the data in the database
    // stats.indexSize: The size of the indexes
    const totalSize = (stats.storageSize || 0) + (stats.indexSize || 0);

    return res.status(200).json({
      success: true,
      data: {
        totalSizeBytes: totalSize,
        storageSize: stats.storageSize,
        indexSize: stats.indexSize,
        objectCount: stats.objects,
      },
    });
  } catch (error) {
    console.error('Error fetching database stats:', error);
    return res.status(500).json({success: false, message: 'Internal Server Error'});
  }
}
