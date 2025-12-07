import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import NotePage from '@/models/NotePage';
import NoteSection from '@/models/NoteSection'; // Ensure registration
import NoteCategory from '@/models/NoteCategory'; // Ensure registration
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get('sectionId');
  const isFlagged = searchParams.get('isFlagged') === 'true';
  const isImportant = searchParams.get('isImportant') === 'true';

  try {
    let query = {};
    if (isFlagged) {
      query = { isFlagged: true };
    } else if (isImportant) {
      query = { isImportant: true };
    } else if (sectionId) {
      query = { sectionId };
    }

    const pages = await NotePage.find(query)
      .sort({ updatedAt: -1 })
      .populate({
        path: 'sectionId',
        select: 'categoryId name', // Populate categoryId to allow full navigation
      });

    return NextResponse.json({ success: true, data: pages });
  } catch (error) {
    console.error("Error fetching pages:", error);
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  try {
    const body = await request.json();
    const page = await NotePage.create(body);
    return NextResponse.json({ success: true, data: page }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
