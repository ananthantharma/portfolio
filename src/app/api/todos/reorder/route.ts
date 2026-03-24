export const dynamic = "force-dynamic";
import {NextResponse} from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ToDo from '@/models/ToDo';

// PUT: Bulk update To Do order
export async function PUT(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const {updates} = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json({success: false, error: 'updates must be an array'}, {status: 400});
    }

    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: {_id: update.id},
        update: {$set: {order: update.order}},
      },
    }));

    await ToDo.bulkWrite(bulkOps);

    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error in bulk reorder To Dos:', error);
    return NextResponse.json({success: false, error: 'Failed to reorder'}, {status: 500});
  }
}
