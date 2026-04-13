/* eslint-disable simple-import-sort/imports */
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import NoteSection from '@/models/NoteSection';
import {authOptions} from '@/lib/auth';

export const dynamic = 'force-dynamic';

import NotePage from '@/models/NotePage';
import ToDo from '@/models/ToDo';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  // Ensure mongoose is connected via centralized helper
  await dbConnect();

  const {searchParams} = new URL(request.url);
  const categoryId = searchParams.get('categoryId');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {userEmail: session.user.email};
    if (categoryId) query.categoryId = categoryId;

    // Run all independent queries concurrently
    const [sections, importantPages, flaggedPages, activeToDos] = await Promise.all([
      NoteSection.find(query).sort({order: 1}),
      NotePage.find({userEmail: session.user.email, isImportant: true}).select('sectionId'),
      NotePage.find({userEmail: session.user.email, isFlagged: true}).select('sectionId'),
      ToDo.find({userEmail: session.user.email, isCompleted: false, sourcePageId: {$ne: null}}).select('sourcePageId'),
    ]);

    // Fetch todo pages (depends on activeToDos result)
    const todoPageIds = [...new Set(activeToDos.map(t => t.sourcePageId?.toString() || ''))].filter(id => id);
    const todoPages = todoPageIds.length
      ? await NotePage.find({_id: {$in: todoPageIds}, userEmail: session.user.email}).select('sectionId')
      : [];

    const sectionImportantCounts: Record<string, number> = {};
    importantPages.forEach(page => {
      const secId = page.sectionId.toString();
      sectionImportantCounts[secId] = (sectionImportantCounts[secId] || 0) + 1;
    });

    const sectionFlaggedCounts: Record<string, number> = {};
    flaggedPages.forEach(page => {
      const secId = page.sectionId.toString();
      sectionFlaggedCounts[secId] = (sectionFlaggedCounts[secId] || 0) + 1;
    });

    const sectionToDoCounts: Record<string, number> = {};
    todoPages.forEach(page => {
      const secId = page.sectionId.toString();
      sectionToDoCounts[secId] = (sectionToDoCounts[secId] || 0) + 1;
    });

    const sectionsWithCount = sections.map(sec => ({
      ...sec.toObject(),
      importantCount: sectionImportantCounts[sec._id.toString()] || 0,
      flaggedCount: sectionFlaggedCounts[sec._id.toString()] || 0,
      todoCount: sectionToDoCounts[sec._id.toString()] || 0,
    }));

    return NextResponse.json({success: true, data: sectionsWithCount});
  } catch (error) {
    return NextResponse.json({success: false, error: error}, {status: 400});
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }
  await dbConnect();
  try {
    const body = await request.json();
    const count = await NoteSection.countDocuments({categoryId: body.categoryId});
    const section = await NoteSection.create({
      ...body,
      userEmail: session.user.email,
      order: count,
      image: body.image || null,
    });
    return NextResponse.json({success: true, data: section}, {status: 201});
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({success: false, error: errorMessage}, {status: 400});
  }
}
