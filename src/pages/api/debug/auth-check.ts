import { NextApiRequest, NextApiResponse } from 'next';

import clientPromise from '../../../lib/mongodb';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
    try {
        const client = await clientPromise;
        const db = client.db('qt_portfolio');

        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const accounts = await db.collection('accounts').find({ provider: 'google' }).toArray();

        const debugData = accounts.map(acc => ({
            userId: acc.userId,
            provider: acc.provider,
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            hasRefreshToken: !!acc.refresh_token,
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            expiresAt: acc.expires_at,
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            tokenType: acc.token_type,
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            scope: acc.scope ? 'Present' : 'Missing'
        }));

        res.status(200).json({
            deployment: 'debug-check-v1',
            accountsFound: debugData.length,
            details: debugData
        });
    } catch (error) {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        res.status(500).json({ error: (error as any).message });
    }
}
