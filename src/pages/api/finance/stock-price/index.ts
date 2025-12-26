import type {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth/next'; // Optional: Protect this route if needed

import {authOptions} from '@/pages/api/auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Optional protection: Only logged in users can fetch prices to save quota
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({message: 'Unauthorized'});
  }

  const {ticker} = req.query;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({message: 'Ticker symbol is required'});
  }

  const apiKey = process.env.API_NINJAS_KEY;
  if (!apiKey) {
    console.error('API_NINJAS_KEY is missing in environment variables');
    return res.status(500).json({message: 'Server configuration error'});
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
    return res.status(500).json({message: 'Failed to fetch stock price'});
  }
}
