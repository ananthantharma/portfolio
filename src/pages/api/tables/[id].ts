import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import TableDoc from '@/models/TableDoc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    await dbConnect();

    if (req.method === 'GET') {
        try {
            const table = await TableDoc.findById(id);
            if (!table) {
                return res.status(404).json({ success: false, error: 'Table not found' });
            }
            res.status(200).json({ success: true, data: table });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to fetch table' });
        }
    } else if (req.method === 'PUT') {
        try {
            const { name, columns, rows } = req.body;
            const updatedTable = await TableDoc.findByIdAndUpdate(
                id,
                { name, columns, rows },
                { new: true, runValidators: true }
            );
            if (!updatedTable) {
                return res.status(404).json({ success: false, error: 'Table not found' });
            }
            res.status(200).json({ success: true, data: updatedTable });
        } catch (error) {
            res.status(400).json({ success: false, error: 'Failed to update table' });
        }
    } else if (req.method === 'DELETE') {
        try {
            const deletedTable = await TableDoc.findByIdAndDelete(id);
            if (!deletedTable) {
                return res.status(404).json({ success: false, error: 'Table not found' });
            }
            res.status(200).json({ success: true, data: {} });
        } catch (error) {
            res.status(400).json({ success: false, error: 'Failed to delete table' });
        }
    } else {
        res.status(405).json({ success: false, message: 'Method not allowed' });
    }
}
