/* eslint-disable simple-import-sort/imports */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import NoteSection from '@/models/NoteSection';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';


import NotePage from '@/models/NotePage';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure mongoose is connected via centralized helper
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userEmail: session.user.email };
    if (categoryId) query.categoryId = categoryId;

    const sections = await NoteSection.find(query).sort({ order: 1 });

    // Fetch important pages to count
    // Optimization: If we have many sections, fetching ALL important pages might be slightly redundant if we only care about specific sections, 
    // but for consistency and simplicity (and since filtering by section list in mongo might be complex if list is large), fetching all important for user is fine.
    const importantPages = await NotePage.find({
      userEmail: session.user.email,
      isImportant: true
    }).select('sectionId');

    const flaggedPages = await NotePage.find({
      userEmail: session.user.email,
      isFlagged: true
    }).select('sectionId');

    const sectionImportantCounts: Record<string, number> = {};
    importantPages.forEach((page) => {
      const secId = page.sectionId.toString();
      sectionImportantCounts[secId] = (sectionImportantCounts[secId] || 0) + 1;
    });

    const sectionFlaggedCounts: Record<string, number> = {};
    flaggedPages.forEach((page) => {
      const secId = page.sectionId.toString();
      sectionFlaggedCounts[secId] = (sectionFlaggedCounts[secId] || 0) + 1;
    });

    const sectionsWithCount = sections.map((sec) => ({
      ...sec.toObject(),
      importantCount: sectionImportantCounts[sec._id.toString()] || 0,
      flaggedCount: sectionFlaggedCounts[sec._id.toString()] || 0
    }));

    return NextResponse.json({ success: true, data: sectionsWithCount });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  try {
    const body = await request.json();
    const count = await NoteSection.countDocuments({ categoryId: body.categoryId });
    const section = await NoteSection.create({
      ...body,
      userEmail: session.user.email,
      order: count,
      image: body.image || null,
    });
    return NextResponse.json({ success: true, data: section }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
