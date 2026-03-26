import {getServerSession} from 'next-auth';
import {NextResponse} from 'next/server';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import OrgTask from '@/models/OrgTask';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();

    const body = await req.json();
    const {updates} = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json({success: false, error: 'updates must be an array'}, {status: 400});
    }

    const bulkOps = updates.map((update: {id: string; order: number}) => ({
      updateOne: {
        filter: {_id: update.id},
        update: {$set: {order: update.order}},
      },
    }));

    await OrgTask.bulkWrite(bulkOps);

    return NextResponse.json({success: true});
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}
