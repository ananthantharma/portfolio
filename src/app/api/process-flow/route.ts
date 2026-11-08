export const dynamic = 'force-dynamic';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
// @ts-ignore
import ProcessFlow from '@/models/ProcessFlow';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  await dbConnect();

  const {searchParams} = new URL(req.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const flow = await ProcessFlow.findOne({_id: id, userId: session.user?.email});
      if (!flow) return NextResponse.json({error: 'Flow not found'}, {status: 404});
      return NextResponse.json({flow});
    } else {
      const flows = await ProcessFlow.find(
        {userId: session.user?.email},
        {name: 1, lastUpdated: 1, _id: 1, kind: 1, preview: 1},
      ).sort({lastUpdated: -1});

      return NextResponse.json({flows});
    }
  } catch (error) {
    console.error('Error fetching process flow(s):', error);
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Unknown error fetching flows'},
      {status: 500},
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const {id, name, data, kind, preview} = await req.json();

  await dbConnect();
  try {
    let flow;
    if (id) {
      // Only the fields that were sent change (a rename doesn't resend the board)
      const update: Record<string, unknown> = {lastUpdated: new Date()};
      if (typeof name === 'string' && name.trim()) update.name = name.trim().slice(0, 200);
      if (data !== undefined) update.data = data;
      if (kind === 'whiteboard' || kind === 'mindmap') update.kind = kind;
      if (preview !== undefined) update.preview = preview;
      flow = await ProcessFlow.findOneAndUpdate({_id: id, userId: session.user?.email}, update, {new: true}).select({_id: 1, name: 1, lastUpdated: 1, kind: 1});
      if (!flow) return NextResponse.json({error: 'Flow not found'}, {status: 404});
    } else {
      flow = await ProcessFlow.create({
        userId: session.user?.email,
        name: (typeof name === 'string' && name.trim()) || 'Untitled Flow',
        data: data || {},
        kind: kind === 'mindmap' ? 'mindmap' : 'whiteboard',
        preview: preview ?? null,
        lastUpdated: new Date(),
      });
      flow = {_id: flow._id, name: flow.name, lastUpdated: flow.lastUpdated, kind: flow.kind};
    }

    return NextResponse.json({success: true, flow});
  } catch (error) {
    console.error('Error saving process flow:', error);
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Unknown error saving flow'},
      {status: 500},
    );
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const {searchParams} = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({error: 'ID required'}, {status: 400});

  await dbConnect();
  try {
    await ProcessFlow.deleteOne({_id: id, userId: session.user?.email});
    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error deleting process flow:', error);
    return NextResponse.json({error: 'Failed to delete'}, {status: 500});
  }
}
