/* eslint-disable simple-import-sort/imports */
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import NoteCategory from '@/models/NoteCategory';
import {authOptions} from '@/lib/auth';

export const dynamic = 'force-dynamic';

import NotePage from '@/models/NotePage';
import NoteSection from '@/models/NoteSection';
import {INoteSection} from '@/models/NoteSection';
import ToDo from '@/models/ToDo';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  // Ensure mongoose is connected via centralized helper
  await dbConnect();
  try {
    const userEmail = session!.user!.email;
    const categories = await NoteCategory.find({userEmail}).sort({order: 1});

    // Fetch all sections for mapping
    const sections = await NoteSection.find({userEmail});
    const sectionToCategoryMap: Record<string, string> = {};
    sections.forEach((sec: INoteSection) => {
      sectionToCategoryMap[sec._id.toString()] = sec.categoryId.toString();
    });

    // Fetch all important pages
    const importantPages = await NotePage.find({userEmail, isImportant: true}).select('sectionId');

    // Fetch all flagged pages
    const flaggedPages = await NotePage.find({userEmail, isFlagged: true}).select('sectionId');

    // Count important pages per category
    const categoryImportantCounts: Record<string, number> = {};
    importantPages.forEach(page => {
      const catId = sectionToCategoryMap[page.sectionId.toString()];
      if (catId) {
        categoryImportantCounts[catId] = (categoryImportantCounts[catId] || 0) + 1;
      }
    });

    // Count flagged pages per category
    const categoryFlaggedCounts: Record<string, number> = {};
    flaggedPages.forEach(page => {
      const catId = sectionToCategoryMap[page.sectionId.toString()];
      if (catId) {
        categoryFlaggedCounts[catId] = (categoryFlaggedCounts[catId] || 0) + 1;
      }
    });

    // Valid Active To-Dos (isCompleted: false)
    // We want to count HOW MANY PAGES have at least one active to-do.
    // Logic:
    // 1. Get all active ToDos with a sourcePageId
    // 2. Get distinct sourcePageIds
    // 3. Find sectionId for those pages
    // 4. Aggregate by Category

    const activeToDos = await ToDo.find({
      userEmail,
      isCompleted: false,
      sourcePageId: {$ne: null},
    }).select('sourcePageId');

    const todoPageIds = [...new Set(activeToDos.map(t => t.sourcePageId?.toString() || ''))].filter(id => id);

    // Find the pages to get their section IDs
    const todoPages = await NotePage.find({
      _id: {$in: todoPageIds},
      userEmail,
    }).select('sectionId');

    const categoryToDoCounts: Record<string, number> = {};
    todoPages.forEach(page => {
      const catId = sectionToCategoryMap[page.sectionId.toString()];
      if (catId) {
        categoryToDoCounts[catId] = (categoryToDoCounts[catId] || 0) + 1;
      }
    });

    const categoriesWithCount = categories.map(cat => ({
      ...cat.toObject(),
      importantCount: categoryImportantCounts[cat._id.toString()] || 0,
      flaggedCount: categoryFlaggedCounts[cat._id.toString()] || 0,
      todoCount: categoryToDoCounts[cat._id.toString()] || 0,
    }));

    return NextResponse.json({success: true, data: categoriesWithCount});
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({success: false, error: errorMessage}, {status: 400});
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }
  await dbConnect();
  try {
    const body = await request.json();
    const count = await NoteCategory.countDocuments({userEmail: session.user.email});
    const category = await NoteCategory.create({
      ...body,
      userEmail: session.user.email,
      order: count,
    });
    return NextResponse.json({success: true, data: category}, {status: 201});
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({success: false, error: errorMessage}, {status: 400});
  }
}
