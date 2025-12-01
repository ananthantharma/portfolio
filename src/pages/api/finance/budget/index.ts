import {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import BudgetItem from '@/models/BudgetItem';
import {authOptions} from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
        return res.status(401).json({success: false, message: 'Unauthorized'});
    }

    await dbConnect();

    const {method} = req;

    switch (method) {
        case 'GET':
            try {
                const budgetItems = await BudgetItem.find({}).sort({createdAt: -1});
                res.status(200).json(budgetItems);
            } catch (error) {
                res.status(400).json({success: false, error});
            }
            break;

        case 'POST':
            try {
                const budgetItem = await BudgetItem.create(req.body);
                res.status(201).json(budgetItem);
            } catch (error) {
                res.status(400).json({success: false, error});
            }
            break;

        default:
            res.status(400).json({success: false});
            break;
    }
}
