import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import AIChatSession from '@/models/AIChatSession';

// GET: List all sessions (titles only) or get a single session with messages
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();

    const {searchParams} = new URL(req.url);
    const sessionId = searchParams.get('id');

    if (sessionId) {
      // Load a specific session with full messages
      const chatSession = await AIChatSession.findOne({
        _id: sessionId,
        userId: session.user.email,
      });

      if (!chatSession) {
        return NextResponse.json({error: 'Session not found'}, {status: 404});
      }

      return NextResponse.json({success: true, data: chatSession});
    }

    // List all sessions - titles only (no messages) for performance
    const sessions = await AIChatSession.find(
      {userId: session.user.email},
      {title: 1, provider: 1, model: 1, createdAt: 1, updatedAt: 1},
    )
      .sort({updatedAt: -1})
      .lean();

    return NextResponse.json({success: true, data: sessions});
  } catch (error: any) {
    console.error('AI Chat Sessions GET Error:', error);
    return NextResponse.json({error: 'Failed to fetch sessions', details: error.message}, {status: 500});
  }
}

// POST: Create a new session
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();
    const body = await req.json();

    const chatSession = await AIChatSession.create({
      title: body.title || 'New Chat',
      provider: body.provider,
      model: body.model,
      messages: body.messages || [],
      userId: session.user.email,
    });

    return NextResponse.json({success: true, data: chatSession}, {status: 201});
  } catch (error: any) {
    console.error('AI Chat Sessions POST Error:', error);
    return NextResponse.json({error: 'Failed to create session', details: error.message}, {status: 500});
  }
}

// PUT: Update an existing session (add messages, rename title)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({error: 'Session ID is required'}, {status: 400});
    }

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.messages !== undefined) updateData.messages = body.messages;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.provider !== undefined) updateData.provider = body.provider;

    const chatSession = await AIChatSession.findOneAndUpdate(
      {_id: body.id, userId: session.user.email},
      {$set: updateData},
      {new: true},
    );

    if (!chatSession) {
      return NextResponse.json({error: 'Session not found'}, {status: 404});
    }

    return NextResponse.json({success: true, data: chatSession});
  } catch (error: any) {
    console.error('AI Chat Sessions PUT Error:', error);
    return NextResponse.json({error: 'Failed to update session', details: error.message}, {status: 500});
  }
}

// DELETE: Delete a session
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();
    const {searchParams} = new URL(req.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({error: 'Session ID is required'}, {status: 400});
    }

    const chatSession = await AIChatSession.findOneAndDelete({
      _id: sessionId,
      userId: session.user.email,
    });

    if (!chatSession) {
      return NextResponse.json({error: 'Session not found'}, {status: 404});
    }

    return NextResponse.json({success: true});
  } catch (error: any) {
    console.error('AI Chat Sessions DELETE Error:', error);
    return NextResponse.json({error: 'Failed to delete session', details: error.message}, {status: 500});
  }
}
