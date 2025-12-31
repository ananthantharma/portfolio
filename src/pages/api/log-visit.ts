
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import AccessLog from '@/models/AccessLog';

import { authOptions } from './auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    await dbConnect();
    const session = await getServerSession(req, res, authOptions);

    try {
        const { path } = req.body;

        // Extract IP
        const ip =
            (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            req.socket.remoteAddress ||
            'unknown';

        const userAgent = req.headers['user-agent'] || 'unknown';

        await AccessLog.create({
            ip,
            path: path || 'unknown',
            timestamp: new Date(),
            userEmail: session?.user?.email || undefined,
            userAgent,
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Log Visit Error:', error);
        return res.status(500).json({ error: 'Failed to log visit' });
    }
}
