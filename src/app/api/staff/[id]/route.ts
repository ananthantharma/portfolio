import mongoose from 'mongoose';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Staff from '@/models/Staff';

export const dynamic = 'force-dynamic';

// DELETE: remove someone from the list (tasks already assigned to them keep their name)
export async function DELETE(_req: Request, {params}: {params: {id: string}}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({success: false, error: 'Not found'}, {status: 404});
    await dbConnect();
    const removed = await Staff.findOneAndDelete({_id: params.id, userEmail: session.user.email});
    if (!removed) return NextResponse.json({success: false, error: 'Not found'}, {status: 404});
    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json({success: false, error: 'Could not remove that person'}, {status: 500});
  }
}
