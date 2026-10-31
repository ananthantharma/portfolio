export const dynamic = 'force-dynamic';
/* eslint-disable simple-import-sort/imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {getServerSession} from 'next-auth';
import {NextResponse} from 'next/server';

import dbConnect from '@/lib/dbConnect';
import {logActivity} from '@/lib/projectActivity';
import NoteCategory from '@/models/NoteCategory'; // Ensure registration
import NotePage from '@/models/NotePage';
import NoteSection from '@/models/NoteSection'; // Ensure registration
import ToDo from '@/models/ToDo';
import {authOptions} from '@/lib/auth';

const BLOCK_TAGS = /<\/?(p|div|br|li|ul|ol|h\d|tr|td|th|table|blockquote)\b[^>]*>/gi;

/** Plain words from a note's HTML: no tags, no embedded pictures. */
function plainText(html: string) {
  return html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(BLOCK_TAGS, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A note's words, all tabs in order (falls back to the legacy single-body field). */
function pageText(page: any) {
  const tabs: any[] = Array.isArray(page.tabs) ? page.tabs : [];
  const ordered = [...tabs].sort((a, b) => (a.order || 0) - (b.order || 0));
  return (ordered.map(t => plainText(t.content || '')).join(' ').trim() || plainText(page.content || '')).slice(0, 20000);
}

/**
 * A list entry without the note bodies. `text` keeps the words (for previews and vendor search);
 * `summary: true` tells the app to load the full note before opening it in the editor.
 */
function summarizePage(page: any, text?: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {content: _legacy, searchText: _s, searchTextAt: _a, ...rest} = page;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tabs = (Array.isArray(page.tabs) ? page.tabs : []).map(({content: _c, ...tab}: any) => tab);
  return text === undefined ? {...rest, tabs, summary: true} : {...rest, tabs, text, summary: true};
}

// List queries leave the note bodies in the database (pasted pictures make them megabytes each)
const LIST_FIELDS = '-content -tabs.content';
const LIST_FIELDS_WITH_TEXT = LIST_FIELDS + ' +searchText +searchTextAt';
const stamp = (value: any) => (value ? new Date(value).getTime() : 0);

/**
 * Words for each listed page without loading its body: each page keeps a copy of its words
 * (`searchText`) stamped with the `updatedAt` it was made from. Pages edited since, or never
 * copied, are read in full once and their copy refreshed.
 */
async function attachText(pages: any[]) {
  const stale = pages.filter(p => typeof p.searchText !== 'string' || stamp(p.searchTextAt) !== stamp(p.updatedAt));
  const fresh = new Map<string, string>();
  if (stale.length) {
    const full = await NotePage.find({_id: {$in: stale.map(p => p._id)}}).select('tabs content updatedAt').lean();
    await Promise.allSettled(
      full.map((page: any) => {
        const text = pageText(page);
        fresh.set(String(page._id), text);
        // Straight to the collection so saving the copy doesn't count as an edit (updatedAt stays put)
        return NotePage.collection.updateOne({_id: page._id}, {$set: {searchText: text, searchTextAt: page.updatedAt || null}});
      }),
    );
  }
  return pages.map(p => summarizePage(p, fresh.get(String(p._id)) ?? p.searchText ?? ''));
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }
  const userEmail = session.user.email;
  await dbConnect();

  // Ensure models are registered to avoid MissingSchemaError during population
  void NoteSection.modelName;
  void NoteCategory.modelName;

  const {searchParams} = new URL(request.url);
  const sectionId = searchParams.get('sectionId');
  const categoryId = searchParams.get('categoryId');
  const isFlagged = searchParams.get('isFlagged') === 'true';
  const isImportant = searchParams.get('isImportant') === 'true';
  const search = searchParams.get('search');
  const searchPageTitlesOnly = searchParams.get('searchPageTitlesOnly') === 'true';
  const searchSectionNamesOnly = searchParams.get('searchSectionNamesOnly') === 'true';
  // summary=1: lists only need titles, details and the words, not each note's full HTML (pasted pictures make it huge)
  // summary=titles: titles and details only (search results, flagged lists)
  const summaryParam = searchParams.get('summary');
  const summary = summaryParam === '1' || summaryParam === 'titles';
  const withText = summaryParam === '1';

  try {
    const query: Record<string, unknown> = {userEmail};
    if (search) {
      const searchRegex = {$regex: search, $options: 'i'};
      const specificSearch = searchPageTitlesOnly || searchSectionNamesOnly;

      if (specificSearch) {
        let results: any[] = [];

        if (searchPageTitlesOnly) {
          const titleQuery = () =>
            NotePage.find({title: searchRegex, userEmail}).sort({order: 1}).populate({
              path: 'sectionId',
              select: 'categoryId name',
            });
          let pages: any[] | null = null;
          if (summary) {
            try {
              pages = (await titleQuery().select(LIST_FIELDS)).map(p => summarizePage(p.toObject()));
            } catch (projectionError) {
              console.error('Pages: title search projection failed, loading whole pages:', projectionError);
            }
          }
          if (!pages) pages = (await titleQuery()).map(p => (summary ? summarizePage(p.toObject()) : p.toObject()));
          results = [...results, ...pages.map(p => ({...p, type: 'page'}))];
        }

        if (searchSectionNamesOnly) {
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

        query.$or = [
          {title: searchRegex},
          {sectionId: {$in: matchedSectionIds}},
          {categoryId: {$in: matchedCategoryIds}}, // category-level (sectionless) pages
          {content: searchRegex},
          {'tabs.title': searchRegex},
          {'tabs.content': searchRegex},
        ];
      }
    } else if (isFlagged) {
      query.$or = [{isFlagged: true}, {'tabs.isFlagged': true}];
    } else if (isImportant) {
      query.$or = [{isImportant: true}, {'tabs.isImportant': true}];
    } else if (sectionId) {
      query.sectionId = sectionId;
    } else if (categoryId) {
      // Pages living directly under a category (no section)
      query.categoryId = categoryId;
      query.sectionId = null;
    }

    const listQuery = () =>
      NotePage.find(query)
        .sort({order: 1})
        .populate({
          path: 'sectionId',
          select: 'categoryId name', // Populate categoryId to allow full navigation
        })
        .populate({
          path: 'categoryId',
          select: 'name', // For category-level pages
        });

    let pages: any[] | null = null;
    let bodiesLoaded = false;
    if (summary) {
      try {
        pages = (await listQuery().select(withText ? LIST_FIELDS_WITH_TEXT : LIST_FIELDS)).map(p => p.toObject());
      } catch (projectionError) {
        console.error('Pages: list projection failed, loading whole pages:', projectionError);
      }
    }
    if (!pages) {
      pages = (await listQuery()).map(p => p.toObject());
      bodiesLoaded = true;
    }

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

    const counted = pages.map(p => ({...p, todoCount: pageToDoCounts[p._id.toString()] || 0}));
    let pagesWithCount: any[] = counted;
    if (summary && withText) {
      let attached: any[] | null = bodiesLoaded ? counted.map(p => summarizePage(p, pageText(p))) : null;
      if (!attached) {
        try {
          attached = await attachText(counted);
        } catch (textError) {
          console.error('Pages: stored text unavailable, reading whole pages:', textError);
        }
      }
      if (!attached) {
        const full = new Map((await listQuery()).map(p => [String(p._id), pageText(p.toObject())]));
        attached = counted.map(p => summarizePage(p, full.get(String(p._id)) ?? ''));
      }
      pagesWithCount = attached;
    } else if (summary) {
      pagesWithCount = counted.map(p => summarizePage(p));
    }

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
    // A page can be created inside a section OR directly under a category
    const scope = body.sectionId
      ? {sectionId: body.sectionId}
      : {categoryId: body.categoryId, sectionId: null};
    const count = await NotePage.countDocuments({userEmail: session.user.email, ...scope});
    const page = await NotePage.create({
      ...body,
      sectionId: body.sectionId || null,
      categoryId: body.sectionId ? null : body.categoryId || null,
      userEmail: session.user.email,
      order: count,
      image: body.image || null,
    });
    // Project/vendor history: notes and meeting notes added
    if (page.sectionId) {
      const meeting = /^(project|vendor) meeting\b/i.test(page.title);
      await logActivity(session.user.email, page.sectionId, {
        type: 'note',
        action: meeting ? 'meeting' : 'created',
        label: meeting ? 'Meeting note added' : 'Note added',
        title: page.title,
        refId: String(page._id),
      });
    }
    return NextResponse.json({success: true, data: page}, {status: 201});
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({success: false, error: errorMessage}, {status: 400});
  }
}
