/* eslint-disable simple-import-sort/imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import NoteCategory from '@/models/NoteCategory'; // Ensure registration
import NotePage from '@/models/NotePage';
import NoteSection from '@/models/NoteSection'; // Ensure registration
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();

  // Ensure models are registered to avoid MissingSchemaError during population
  console.log('Registered Models:', NoteSection.modelName, NoteCategory.modelName);

  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get('sectionId');
  const isFlagged = searchParams.get('isFlagged') === 'true';
  const isImportant = searchParams.get('isImportant') === 'true';
  const search = searchParams.get('search');
  const searchPageTitlesOnly = searchParams.get('searchPageTitlesOnly') === 'true';
  const searchSectionNamesOnly = searchParams.get('searchSectionNamesOnly') === 'true';

  try {
    const query: Record<string, unknown> = {};
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      const specificSearch = searchPageTitlesOnly || searchSectionNamesOnly;

      if (specificSearch) {
        let results: any[] = [];

        if (searchPageTitlesOnly) {
          const pages = await NotePage.find({ title: searchRegex }).sort({ order: 1 }).populate({
            path: 'sectionId',
            select: 'categoryId name',
          });
          results = [...results, ...pages.map(p => ({ ...p.toObject(), type: 'page' }))];
        }

        if (searchSectionNamesOnly) {
          console.log('DEBUG: Searching Sections/Categories with regex:', search);

          // Search Sections
          const sections = await NoteSection.find({ name: searchRegex }).populate('categoryId');
          results = [...results, ...sections.map(s => ({
            ...s.toObject(),
            type: 'section',
            title: `[Section] ${s.name}`, // Explicit label
            sectionId: { name: s.name, categoryId: s.categoryId } // Mock sectionId for UI display
          }))];

          // Search Categories (Notebooks)
          const categories = await NoteCategory.find({ name: searchRegex });
          console.log('DEBUG: Matched Categories:', categories.map(c => c.name));

          // Return Categories as "Sections" for UI consistency
          results = [...results, ...categories.map(c => ({
            ...c.toObject(),
            type: 'section',
            title: `[Notebook] ${c.name}`, // Explicit label
            sectionId: { name: 'Notebook', categoryId: c._id }
          }))];
        }

        // Remove duplicates by ID and sort
        const seen = new Set();
        const uniqueResults = results.filter(item => {
          const id = item._id.toString();
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        return NextResponse.json({ success: true, data: uniqueResults });

      } else {
        // Standard Search: Title OR Hierarchy (Category/Section) OR Content
        const matchedCategories = await NoteCategory.find({ name: searchRegex }).select('_id');
        const matchedCategoryIds = matchedCategories.map(c => c._id);

        const matchedSections = await NoteSection.find({
          $or: [{ name: searchRegex }, { categoryId: { $in: matchedCategoryIds } }],
        }).select('_id');
        const matchedSectionIds = matchedSections.map(s => s._id);

        query.$or = [
          { title: searchRegex },
          { sectionId: { $in: matchedSectionIds } },
          { content: searchRegex }
        ];
      }
    } else if (isFlagged) {
      query.isFlagged = true;
    } else if (isImportant) {
      query.isImportant = true;
    } else if (sectionId) {
      query.sectionId = sectionId;
    }

    const pages = await NotePage.find(query).sort({ order: 1 }).populate({
      path: 'sectionId',
      select: 'categoryId name', // Populate categoryId to allow full navigation
    });

    return NextResponse.json({ success: true, data: pages });
  } catch (error) {
    console.error('Error fetching pages:', error);
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
    const count = await NotePage.countDocuments({ sectionId: body.sectionId });
    const page = await NotePage.create({ ...body, order: count });
    return NextResponse.json({ success: true, data: page }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
