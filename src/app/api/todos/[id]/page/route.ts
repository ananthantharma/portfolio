import mongoose from 'mongoose';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import TaskPage from '@/models/TaskPage';
import ToDo from '@/models/ToDo';

export const dynamic = 'force-dynamic';

// A page's HTML can hold pasted pictures; keep requests under the hosting body limit
const MAX_CONTENT = 3_800_000;

async function ownTask(id: string) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return {error: NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401})};
  if (!mongoose.isValidObjectId(id)) return {error: NextResponse.json({success: false, error: 'Task not found'}, {status: 404})};
  await dbConnect();
  const task = await ToDo.findOne({_id: id, userEmail: email}).select('_id').lean();
  if (!task) return {error: NextResponse.json({success: false, error: 'Task not found'}, {status: 404})};
  return {email};
}

// GET: the task's page (empty if nothing has been written yet)
export async function GET(_req: Request, {params}: {params: {id: string}}) {
  try {
    const own = await ownTask(params.id);
    if (own.error) return own.error;
    const page = await TaskPage.findOne({taskId: params.id, userEmail: own.email}).lean();
    return NextResponse.json({success: true, data: {content: page?.content || '', updatedAt: page?.updatedAt || null}});
  } catch (error) {
    console.error('Error loading task page:', error);
    return NextResponse.json({success: false, error: 'Could not load the page'}, {status: 500});
  }
}

// PUT: save the task's page
export async function PUT(req: Request, {params}: {params: {id: string}}) {
  try {
    const own = await ownTask(params.id);
    if (own.error) return own.error;
    const {content} = (await req.json()) as {content?: unknown};
    if (typeof content !== 'string') return NextResponse.json({success: false, error: 'Nothing to save'}, {status: 400});
    if (content.length > MAX_CONTENT) return NextResponse.json({success: false, error: 'This page is too large to save. Try smaller pictures.'}, {status: 413});
    // Plain find-then-write (the hosted database is happiest without upserts)
    const existing = await TaskPage.findOne({taskId: params.id, userEmail: own.email});
    if (existing) {
      existing.content = content;
      await existing.save();
    } else {
      await TaskPage.create({taskId: params.id, userEmail: own.email, content});
    }
    return NextResponse.json({success: true, data: {updatedAt: new Date()}});
  } catch (error) {
    console.error('Error saving task page:', error);
    return NextResponse.json({success: false, error: 'Could not save the page'}, {status: 500});
  }
}
