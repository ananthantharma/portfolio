export const dynamic = 'force-dynamic';
import {NextResponse} from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ToDo from '@/models/ToDo';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';

// PUT: Bulk update To Do order
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    await dbConnect();
    const body = await req.json();
    const {updates} = body;

    if (!Array.isArray(updates) || updates.some(update => !update || typeof update.id !== 'string' || !Number.isFinite(update.order))) {
      return NextResponse.json({success: false, error: 'updates must be an array'}, {status: 400});
    }

    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: {_id: update.id, userEmail: session.user.email},
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
