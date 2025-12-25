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

    await dbConnect();

    if (req.method === 'GET') {
        try {
            const investments = await Investment.find({ userEmail: session.user.email }).sort({ createdAt: -1 });
            return res.status(200).json(investments);
        } catch (error) {
            console.error('Error fetching investments:', error);
            return res.status(500).json({ success: false, message: 'Server Error' });
        }
    } else if (req.method === 'POST') {
        try {
            const { ticker, quantity, purchaseDate, bookPrice, category } = req.body;

            if (!ticker || !quantity || !bookPrice || !category) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }

            const newInvestment = await Investment.create({
                userEmail: session.user.email,
                ticker,
                quantity,
                purchaseDate,
                bookPrice,
                category,
            });

            return res.status(201).json({ success: true, data: newInvestment });
        } catch (error) {
            console.error('Error creating investment:', error);
            return res.status(500).json({ success: false, message: 'Server Error' });
        }
    } else {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }
}
