import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import TaskGroup from '@/models/TaskGroup';

export const dynamic = 'force-dynamic';

// GET: the user's own task groups, A–Z
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    await dbConnect();
    const groups = await TaskGroup.find({userEmail: session.user.email}).collation({locale: 'en'}).sort({name: 1}).lean();
    return NextResponse.json({success: true, data: groups});
  } catch (error) {
    console.error('Error fetching task groups:', error);
    return NextResponse.json({success: false, error: 'Could not load task groups'}, {status: 500});
  }
}

// POST: create a group (returns the existing one if the name is already taken)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    const {name} = (await req.json()) as {name?: unknown};
    const clean = typeof name === 'string' ? name.trim().slice(0, 80) : '';
    if (!clean) return NextResponse.json({success: false, error: 'Give the group a name.'}, {status: 400});
    await dbConnect();
    const existing = await TaskGroup.findOne({userEmail: session.user.email, name: clean}).collation({locale: 'en', strength: 2});
    const group = existing || (await TaskGroup.create({userEmail: session.user.email, name: clean}));
    return NextResponse.json({success: true, data: group}, {status: existing ? 200 : 201});
  } catch (error) {
    console.error('Error creating task group:', error);
    return NextResponse.json({success: false, error: 'Could not create the group'}, {status: 500});
  }
}
