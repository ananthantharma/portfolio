export const dynamic = 'force-dynamic';

import {getServerSession} from 'next-auth';
import {NextResponse} from 'next/server';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import PromptLibraryItem from '@/models/PromptLibraryItem';

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
      title: body.title,
      description: body.description || '',
      content: body.content,
      category: body.category || 'General',
    });

    return NextResponse.json({success: true, data: item}, {status: 201});
  } catch (error) {
    console.error('Error creating prompt library item:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}
