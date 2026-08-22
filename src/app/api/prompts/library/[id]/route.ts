import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import PromptLibraryItem from '@/models/PromptLibraryItem';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

// PUT: Update a prompt library item
export async function PUT(req: Request, {params}: {params: {id: string}}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();

    const body = await req.json();
    const update: Record<string, string> = {};
    if (typeof body.title === 'string') update.title = body.title;
    if (typeof body.description === 'string') update.description = body.description;
    if (typeof body.content === 'string') update.content = body.content;
    if (typeof body.category === 'string') update.category = body.category;

    const item = await PromptLibraryItem.findOneAndUpdate({_id: params.id, userEmail: session.user.email}, update, {
      new: true,
    });

    if (!item) {
      return NextResponse.json({success: false, error: 'Prompt not found'}, {status: 404});
    }

    return NextResponse.json({success: true, data: item});
  } catch (error) {
    console.error('Error updating prompt library item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}

// DELETE: Remove a prompt library item
export async function DELETE(_req: Request, {params}: {params: {id: string}}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();

    const deleted = await PromptLibraryItem.findOneAndDelete({_id: params.id, userEmail: session.user.email});

    if (!deleted) {
      return NextResponse.json({success: false, error: 'Prompt not found'}, {status: 404});
    }

    return NextResponse.json({success: true, data: {}});
  } catch (error) {
    console.error('Error deleting prompt library item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}
