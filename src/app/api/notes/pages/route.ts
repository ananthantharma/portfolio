/* eslint-disable simple-import-sort/imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {getServerSession} from 'next-auth';
import {NextResponse} from 'next/server';

import dbConnect from '@/lib/dbConnect';
import NoteCategory from '@/models/NoteCategory'; // Ensure registration
import NotePage from '@/models/NotePage';
import NoteSection from '@/models/NoteSection'; // Ensure registration
import ToDo from '@/models/ToDo';
import {authOptions} from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }
  const userEmail = session.user.email;
  await dbConnect();

  // Ensure models are registered to avoid MissingSchemaError during population
  console.log('Registered Models:', NoteSection.modelName, NoteCategory.modelName);

  const {searchParams} = new URL(request.url);
  const sectionId = searchParams.get('sectionId');
  const isFlagged = searchParams.get('isFlagged') === 'true';
  const isImportant = searchParams.get('isImportant') === 'true';
  const search = searchParams.get('search');
  const searchPageTitlesOnly = searchParams.get('searchPageTitlesOnly') === 'true';
  const searchSectionNamesOnly = searchParams.get('searchSectionNamesOnly') === 'true';

  try {
    const query: Record<string, unknown> = {userEmail};
    if (search) {
      const searchRegex = {$regex: search, $options: 'i'};
      const specificSearch = searchPageTitlesOnly || searchSectionNamesOnly;

      if (specificSearch) {
        let results: any[] = [];

        if (searchPageTitlesOnly) {
          const pages = await NotePage.find({title: searchRegex, userEmail}).sort({order: 1}).populate({
            path: 'sectionId',
            select: 'categoryId name',
          });
          results = [...results, ...pages.map(p => ({...p.toObject(), type: 'page'}))];
        }

        if (searchSectionNamesOnly) {
          console.log('DEBUG: Searching Sections/Categories with regex:', search);

          // Search Sections
          const sections = await NoteSection.find({name: searchRegex, userEmail}).populate('categoryId');
          results = [
            ...results,
            ...sections.map(s => ({
              ...s.toObject(),
              type: 'section',
              title: `[Section] ${s.name}`, // Explicit label
              sectionId: {name: s.name, categoryId: s.categoryId}, // Mock sectionId for UI display
            })),
          ];

          // Search Categories (Notebooks)
          const categories = await NoteCategory.find({name: searchRegex, userEmail});
          console.log(
            'DEBUG: Matched Categories:',
            categories.map(c => c.name),
          );

          // Return Categories as "Sections" for UI consistency
          results = [
            ...results,
            ...categories.map(c => ({
              ...c.toObject(),
              type: 'section',
              title: `[Notebook] ${c.name}`, // Explicit label
              sectionId: {name: 'Notebook', categoryId: c._id},
            })),
          ];
        }

        // Remove duplicates by ID and sort
        const seen = new Set();
        const uniqueResults = results.filter(item => {
          const id = item._id.toString();
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        return NextResponse.json({success: true, data: uniqueResults});
      } else {
        // Standard Search: Title OR Hierarchy (Category/Section) OR Content
        const matchedCategories = await NoteCategory.find({name: searchRegex, userEmail}).select('_id');
        const matchedCategoryIds = matchedCategories.map(c => c._id);

        const matchedSections = await NoteSection.find({
          $and: [{userEmail}, {$or: [{name: searchRegex}, {categoryId: {$in: matchedCategoryIds}}]}],
        }).select('_id');
        const matchedSectionIds = matchedSections.map(s => s._id);

        query.$or = [{title: searchRegex}, {sectionId: {$in: matchedSectionIds}}, {content: searchRegex}];
      }
    } else if (isFlagged) {
      query.isFlagged = true;
    } else if (isImportant) {
      query.isImportant = true;
    } else if (sectionId) {
      query.sectionId = sectionId;
    }

    const pages = await NotePage.find(query).sort({order: 1}).populate({
      path: 'sectionId',
      select: 'categoryId name', // Populate categoryId to allow full navigation
    });

    // Aggregate active To-Do counts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageIds = pages.map((p: any) => p._id);
    const activeToDos = await ToDo.find({
      userEmail,
      isCompleted: false,
      sourcePageId: {$in: pageIds},
    }).select('sourcePageId');

    const pageToDoCounts: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeToDos.forEach((todo: any) => {
      const pid = todo.sourcePageId?.toString();
      if (pid) {
        pageToDoCounts[pid] = (pageToDoCounts[pid] || 0) + 1;
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pagesWithCount = pages.map((p: any) => ({
      ...p.toObject(),
      todoCount: pageToDoCounts[p._id.toString()] || 0,
    }));

    return NextResponse.json({success: true, data: pagesWithCount});
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({success: false, error: errorMessage}, {status: 400});
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
    const count = await NotePage.countDocuments({sectionId: body.sectionId});
    const page = await NotePage.create({
      ...body,
      userEmail: session.user.email,
      order: count,
      image: body.image || null,
    });
    return NextResponse.json({success: true, data: page}, {status: 201});
  } catch (error) {
    return NextResponse.json({success: false, error: error}, {status: 400});
  }
}
