import mongoose from 'mongoose';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import NotePage from '@/models/NotePage';
import NoteSection from '@/models/NoteSection';
import ToDo from '@/models/ToDo';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

type Stats = {todo: {count: number; minDays: number | null}; important: number; flagged: number};
type Id = {toString(): string} | null | undefined;
type PageRef = {_id: Id; sectionId?: Id; categoryId?: Id};

// Plain finds joined in JS: the hosted database (Oracle's MongoDB API) fails on these
// $lookup/$unwind aggregation pipelines with internal errors.
export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();
    const userEmail = session.user.email;

    const counts = {
      pages: {} as Record<string, Stats>,
      sections: {} as Record<string, Stats>,
      categories: {} as Record<string, Stats>,
    };
    const getStats = (obj: Record<string, Stats>, id: string) => {
      if (!obj[id]) obj[id] = {todo: {count: 0, minDays: null}, important: 0, flagged: 0};
      return obj[id];
    };

    // Section → category, loaded once for every page we touch
    const sectionCategory = new Map<string, string>();
    const loadSections = async (pages: PageRef[]) => {
      const ids = [...new Set(pages.map(p => p.sectionId?.toString()).filter((id): id is string => !!id && !sectionCategory.has(id)))];
      if (!ids.length) return;
      const sections = await NoteSection.find({_id: {$in: ids}}).select('categoryId').lean();
      sections.forEach(s => sectionCategory.set(String(s._id), s.categoryId ? String(s.categoryId) : ''));
    };
    const placeOf = (page: PageRef) => {
      const sectionId = page.sectionId?.toString() || '';
      // Pages that live directly under a category have no section
      const categoryId = (sectionId && sectionCategory.get(sectionId)) || page.categoryId?.toString() || '';
      return {sectionId, categoryId};
    };

    // 1. Open tasks linked to a note page: count and nearest due date per page, section and category
    try {
      const todos = await ToDo.find({userEmail, isCompleted: false, sourcePageId: {$ne: null}})
        .select('sourcePageId dueDate')
        .lean();
      const byPage = new Map<string, {count: number; minDate: number | null}>();
      todos.forEach(t => {
        const pageId = String(t.sourcePageId);
        // Some older tasks stored a bad link (e.g. the text "undefined"); skip those
        if (!/^[a-f\d]{24}$/i.test(pageId) || !mongoose.isValidObjectId(pageId)) return;
        const entry = byPage.get(pageId) || {count: 0, minDate: null};
        entry.count += 1;
        const due = t.dueDate ? new Date(t.dueDate).getTime() : NaN;
        if (!Number.isNaN(due)) entry.minDate = entry.minDate === null ? due : Math.min(entry.minDate, due);
        byPage.set(pageId, entry);
      });

      if (byPage.size) {
        const pages = (await NotePage.find({_id: {$in: [...byPage.keys()]}}).select('sectionId categoryId').lean()) as PageRef[];
        await loadSections(pages);
        const minDaysOf = (time: number | null) => (time === null ? null : Math.ceil((time - Date.now()) / (1000 * 60 * 60 * 24)));
        const mergeMin = (current: number | null, next: number | null) => (current === null ? next : next === null ? current : Math.min(current, next));

        pages.forEach(page => {
          const pageId = String(page._id);
          const entry = byPage.get(pageId);
          if (!entry) return;
          const minDays = minDaysOf(entry.minDate);
          const {sectionId, categoryId} = placeOf(page);
          const targets = [getStats(counts.pages, pageId), sectionId && getStats(counts.sections, sectionId), categoryId && getStats(counts.categories, categoryId)];
          targets.forEach(stats => {
            if (!stats) return;
            stats.todo.count += entry.count;
            stats.todo.minDays = mergeMin(stats.todo.minDays, minDays);
          });
        });
      }
    } catch (error) {
      console.error('Error fetching stats (tasks per page):', error);
    }

    // 2. Important / flagged tabs per page, section and category
    try {
      const flagged = {userEmail, $or: [{'tabs.isImportant': true}, {'tabs.isFlagged': true}]};
      type FlagPage = PageRef & {tabs?: {isImportant?: boolean; isFlagged?: boolean}[]};
      let pages: FlagPage[];
      try {
        // Only the flags, not the tab contents
        pages = (await NotePage.find(flagged).select('sectionId categoryId tabs.isImportant tabs.isFlagged').lean()) as FlagPage[];
      } catch (projectionError) {
        console.error('Stats: flag projection failed, retrying with whole tabs:', projectionError);
        pages = (await NotePage.find(flagged).select('sectionId categoryId tabs').lean()) as FlagPage[];
      }
      await loadSections(pages);
      pages.forEach(page => {
        const important = (page.tabs || []).filter(tab => tab.isImportant === true).length;
        const flags = (page.tabs || []).filter(tab => tab.isFlagged === true).length;
        if (!important && !flags) return;
        const pageId = String(page._id);
        const {sectionId, categoryId} = placeOf(page);
        [getStats(counts.pages, pageId), sectionId && getStats(counts.sections, sectionId), categoryId && getStats(counts.categories, categoryId)].forEach(stats => {
          if (!stats) return;
          stats.important += important;
          stats.flagged += flags;
        });
      });
    } catch (error) {
      console.error('Error fetching stats (important/flagged tabs):', error);
    }

    return NextResponse.json({success: true, data: counts});
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({success: false, error: 'Failed to fetch stats'}, {status: 500});
  }
}
