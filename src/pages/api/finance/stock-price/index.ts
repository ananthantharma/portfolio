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
    const response = await fetch(`https://api.api-ninjas.com/v1/stockprice?ticker=${ticker}`, {
      headers: {
        'X-Api-Key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`API Ninjas Error: ${response.statusText}`);
    }

    const data = await response.json();
    // API Ninjas returns object like { ticker: 'AAPL', price: 150.00, ... }
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching stock price:', error);
    return res.status(500).json({ message: 'Failed to fetch stock price' });
  }
}
