import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import PromptLibraryItem from '@/models/PromptLibraryItem';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

// GET: List all prompt library items for the current user
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();

    const items = await PromptLibraryItem.find({userEmail: session.user.email}).sort({createdAt: -1});

    return NextResponse.json({success: true, data: items});
  } catch (error) {
    console.error('Error fetching prompt library items:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}

// POST: Create a new prompt library item
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();

    const body = await req.json();
    const item = await PromptLibraryItem.create({
      userEmail: session.user.email,
      title: String(body.title || '').trim().slice(0, 200) || 'Untitled prompt',
      description: typeof body.description === 'string' ? body.description.slice(0, 500) : '',
      content: typeof body.content === 'string' ? body.content : '',
      category: (typeof body.category === 'string' && body.category.trim().slice(0, 60)) || 'General',
      favorite: body.favorite === true,
      pinned: body.pinned === true,
    });

    return NextResponse.json({success: true, data: item}, {status: 201});
  } catch (error) {
    console.error('Error creating prompt library item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}
