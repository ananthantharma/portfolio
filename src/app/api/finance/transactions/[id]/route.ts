import {NextRequest, NextResponse} from 'next/server';

import dbConnect from '@/lib/dbConnect';
import Transaction from '@/models/Transaction';

export async function DELETE(_req: NextRequest, {params}: {params: {id: string}}) {
  try {
    await dbConnect();

    const {id} = params;

    const deleted = await Transaction.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({error: 'Transaction not found'}, {status: 404});
    }

    return NextResponse.json({
      success: true,
      data: deleted,
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({error: 'Failed to delete transaction'}, {status: 500});
  }
}

export async function PUT(req: NextRequest, {params}: {params: {id: string}}) {
  try {
    await dbConnect();

    const {id} = params;
    const body = await req.json();

    // Allow updating category, description, amount, etc.
    const updated = await Transaction.findByIdAndUpdate(id, {$set: body}, {new: true, runValidators: true});

    if (!updated) {
      return NextResponse.json({error: 'Transaction not found'}, {status: 404});
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({error: 'Failed to update transaction'}, {status: 500});
  }
}
