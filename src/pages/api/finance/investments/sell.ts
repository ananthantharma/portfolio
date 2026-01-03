import type {NextApiRequest, NextApiResponse} from 'next';
import {getServerSession} from 'next-auth/next';

import dbConnect from '@/lib/dbConnect';
import Investment from '@/models/Investment';
import {authOptions} from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.email) {
    return res.status(401).json({success: false, message: 'Unauthorized'});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({success: false, message: 'Method not allowed'});
  }

  await dbConnect();

  const {ticker, category, quantity} = req.body;
  const sellQty = Number(quantity);

  if (!ticker || !category || !sellQty || sellQty <= 0) {
    return res.status(400).json({success: false, message: 'Invalid input'});
  }

  try {
    // 1. Find all lots for this user/ticker/category, sorted by oldest purchaseDate first
    const investments = await Investment.find({
      userEmail: session.user.email,
      ticker: ticker,
      category: category,
    }).sort({purchaseDate: 1});

    let remainingSellQty = sellQty;
    const totalOwned = investments.reduce((sum, inv) => sum + inv.quantity, 0);

    if (totalOwned < sellQty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient shares. You have ${totalOwned}, but tried to sell ${sellQty}.`,
      });
    }

    // 2. Iterate and deplete lots (FIFO)
    for (const lot of investments) {
      if (remainingSellQty <= 0) break;

      if (lot.quantity <= remainingSellQty) {
        // Sell entire lot
        remainingSellQty -= lot.quantity;
        await Investment.findByIdAndDelete(lot._id);
      } else {
        // Partial sell of this lot
        lot.quantity -= remainingSellQty;
        remainingSellQty = 0;
        await lot.save();
      }
    }

    return res.status(200).json({success: true, message: 'Sold successfully'});
  } catch (error) {
    console.error('Sell error:', error);
    return res.status(500).json({success: false, message: 'Internal Server Error'});
  }
}
