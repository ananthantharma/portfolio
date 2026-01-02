
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session: any = await getServerSession(req, res, authOptions);

    if (!session || !session.user?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    await dbConnect();

    const { method } = req;

    switch (method) {
        case 'GET':
            try {
                const user = await User.findOne({ email: session.user.email });
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }
                res.status(200).json({ prompt: user.organizePrompt || null });
            } catch (error) {
                console.error('Error fetching prompt', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
            break;

        case 'PUT':
            try {
                const { prompt } = req.body;

                if (typeof prompt !== 'string') {
                    return res.status(400).json({ error: 'Invalid prompt format' });
                }

                const user = await User.findOneAndUpdate(
                    { email: session.user.email },
                    { organizePrompt: prompt },
                    { new: true }
                );

                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                res.status(200).json({ prompt: user.organizePrompt });
            } catch (error) {
                console.error('Error updating prompt', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
            break;

        default:
            res.setHeader('Allow', ['GET', 'PUT']);
            res.status(405).end(`Method ${method} Not Allowed`);
    }
}
