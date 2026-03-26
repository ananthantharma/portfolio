import {getServerSession} from 'next-auth';
import {NextResponse} from 'next/server';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import OrgHabit from '@/models/OrgHabit';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, {params}: {params: {id: string}}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();

    const body = await req.json();
    const updated = await OrgHabit.findByIdAndUpdate(params.id, body, {new: true});

    if (!updated) {
      return NextResponse.json({success: false, error: 'Habit not found'}, {status: 404});
    }

    return NextResponse.json({success: true, data: updated});
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}

export async function DELETE(_req: Request, {params}: {params: {id: string}}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();

    const deleted = await OrgHabit.findByIdAndDelete(params.id);

    if (!deleted) {
      return NextResponse.json({success: false, error: 'Habit not found'}, {status: 404});
    }

    return NextResponse.json({success: true, data: {}});
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}
