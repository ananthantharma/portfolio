import mongoose from 'mongoose';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import TaskGroup from '@/models/TaskGroup';
import ToDo from '@/models/ToDo';

export const dynamic = 'force-dynamic';

// PATCH: rename a group
export async function PATCH(req: Request, {params}: {params: {id: string}}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({success: false, error: 'Group not found'}, {status: 404});
    const {name} = (await req.json()) as {name?: unknown};
    const clean = typeof name === 'string' ? name.trim().slice(0, 80) : '';
    if (!clean) return NextResponse.json({success: false, error: 'Give the group a name.'}, {status: 400});
    await dbConnect();
    const group = await TaskGroup.findOneAndUpdate({_id: params.id, userEmail: session.user.email}, {name: clean}, {new: true});
    if (!group) return NextResponse.json({success: false, error: 'Group not found'}, {status: 404});
    return NextResponse.json({success: true, data: group});
  } catch (error) {
    console.error('Error renaming task group:', error);
    return NextResponse.json({success: false, error: 'Could not rename the group'}, {status: 500});
  }
}

// DELETE: remove a group; its tasks stay and simply become ungrouped
export async function DELETE(_req: Request, {params}: {params: {id: string}}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({success: false, error: 'Group not found'}, {status: 404});
    await dbConnect();
    const group = await TaskGroup.findOneAndDelete({_id: params.id, userEmail: session.user.email});
    if (!group) return NextResponse.json({success: false, error: 'Group not found'}, {status: 404});
    await ToDo.updateMany({userEmail: session.user.email, taskGroupId: group._id}, {$set: {taskGroupId: null}});
    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error deleting task group:', error);
    return NextResponse.json({success: false, error: 'Could not delete the group'}, {status: 500});
  }
}
