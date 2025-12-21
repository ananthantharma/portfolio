/* eslint-disable simple-import-sort/imports */
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
      const orConditions: Record<string, unknown>[] = [];

      // Flag to track if we should do a restricted search
      const specificSearch = searchPageTitlesOnly || searchSectionNamesOnly;

      if (specificSearch) {
        // Additive Logic: If either flag is present, stick to those fields ONLY (no content search)

        if (searchPageTitlesOnly) {
          orConditions.push({ title: searchRegex });
        }

        if (searchSectionNamesOnly) {
          // Find Sections matching the name
          const matchedSections = await NoteSection.find({ name: searchRegex }).select('_id');
          const matchedSectionIds = matchedSections.map(s => s._id);

          if (matchedSectionIds.length > 0) {
            orConditions.push({ sectionId: { $in: matchedSectionIds } });
          }
        }
      } else {
        // Standard Search: Title OR Hierarchy (Category/Section) OR Content
        const matchedCategories = await NoteCategory.find({ name: searchRegex }).select('_id');
        const matchedCategoryIds = matchedCategories.map(c => c._id);

        const matchedSections = await NoteSection.find({
          $or: [{ name: searchRegex }, { categoryId: { $in: matchedCategoryIds } }],
        }).select('_id');
        const matchedSectionIds = matchedSections.map(s => s._id);

        orConditions.push(
          { title: searchRegex },
          { sectionId: { $in: matchedSectionIds } },
          { content: searchRegex }
        );
      }

      // If specific search was requested but no criteria matched (e.g. checkbox checked but array empty), 
      // we need to ensure we don't return everything. $or with empty array returns nothing usually, 
      // but let's be safe.
      if (orConditions.length > 0) {
        query.$or = orConditions;
      } else {
        // Force no results if specific search yielded no sub-queries (e.g. section checked but no section found)
        return NextResponse.json({ success: true, data: [] });
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
