import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

import dbConnect from '@/lib/dbConnect';
import Investment from '@/models/Investment';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user?.email) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.query;

    await dbConnect();

    if (req.method === 'PUT') {
        try {
            const updatedInvestment = await Investment.findOneAndUpdate(
                { _id: id, userEmail: session.user.email },
                req.body,
                { new: true, runValidators: true }
            );

            if (!updatedInvestment) {
                return res.status(404).json({ success: false, message: 'Investment not found' });
            }

            return res.status(200).json({ success: true, data: updatedInvestment });
        } catch (error) {
            console.error('Error updating investment:', error);
            return res.status(500).json({ success: false, message: 'Server Error' });
        }
    } else if (req.method === 'DELETE') {
        try {
            const deletedInvestment = await Investment.findOneAndDelete({
                _id: id,
                userEmail: session.user.email,
            });

            if (!deletedInvestment) {
                return res.status(404).json({ success: false, message: 'Investment not found' });
            }

            return res.status(200).json({ success: true, message: 'Investment deleted' });
        } catch (error) {
            console.error('Error deleting investment:', error);
            return res.status(500).json({ success: false, message: 'Server Error' });
        }
    } else {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
}
