import type {NextApiRequest, NextApiResponse} from 'next';
import dbConnect from '@/lib/dbConnect';
import TableDoc from '@/models/TableDoc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      // List all tables, selecting only name and timestamps for lighter payload
      const tables = await TableDoc.find({}, 'name createdAt updatedAt').sort({updatedAt: -1});
      res.status(200).json({success: true, data: tables});
    } catch (error) {
      res.status(500).json({success: false, error: 'Failed to fetch tables'});
    }
  } else if (req.method === 'POST') {
    try {
      // Create new table
      const {name, columns, rows} = req.body;
      const newTable = await TableDoc.create({name, columns, rows});
      res.status(201).json({success: true, data: newTable});
    } catch (error) {
      res.status(400).json({success: false, error: 'Failed to create table'});
    }
  } else {
    res.status(405).json({success: false, message: 'Method not allowed'});
  }
}
