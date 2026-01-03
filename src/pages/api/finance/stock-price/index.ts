import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import yahooFinance from 'yahoo-finance2';

import { authOptions } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { ticker } = req.query;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Ticker is required' });
  }

  try {
    const quote = await yahooFinance.quote(ticker);

    if (!quote) {
      return res.status(404).json({ error: 'Ticker not found' });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const price = (quote as any).regularMarketPrice;

    return res.status(200).json({ price });
  } catch (error) {
    console.error(`Error fetching price for ${ticker}:`, error);
    return res.status(500).json({ error: 'Failed to fetch price' });
  }
}
