import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';

export async function GET(_req: NextRequest) {
  try {
    await dbConnect();

    // Fetch all transactions, sorted by date desc
    const transactions = await Transaction.find({}).sort({ date: -1, createdAt: -1 });

    // Find the latest uploaded/created date
    // We can do this by sorting by createdAt desc and taking top 1,
    // or just iterating since we have them all (if list isn't huge).
    // Let's just query specifically for it to be efficient if list is large
    const latest = await Transaction.findOne({}).sort({ createdAt: -1 }).select('createdAt');

    const lastUpdated = latest ? latest.createdAt : null;

    return NextResponse.json({
      success: true,
      data: transactions,
      lastUpdated,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    await dbConnect();
    const result = await Transaction.deleteMany({});
    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error clearing transactions:', error);
    return NextResponse.json({ error: 'Failed to clear transactions' }, { status: 500 });
  }
}
