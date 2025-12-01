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

    const {
        query: {id},
        method,
    } = req;

    switch (method) {
        case 'PUT':
            try {
                const budgetItem = await BudgetItem.findByIdAndUpdate(id, req.body, {
                    new: true,
                    runValidators: true,
                });

                if (!budgetItem) {
                    return res.status(404).json({success: false});
                }

                res.status(200).json(budgetItem);
            } catch (error) {
                res.status(400).json({success: false, error});
            }
            break;

        case 'DELETE':
            try {
                const deletedBudgetItem = await BudgetItem.deleteOne({_id: id});

                if (!deletedBudgetItem) {
                    return res.status(404).json({success: false});
                }

                res.status(200).json({success: true, data: {}});
            } catch (error) {
                res.status(400).json({success: false, error});
            }
            break;

        default:
            res.status(400).json({success: false});
            break;
    }
}
