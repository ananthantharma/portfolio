import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';


import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import NotePage from '@/models/NotePage';
import ToDo from '@/models/ToDo';

export const runtime = 'nodejs';

export async function GET(_req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const userEmail = session.user.email;



        // Helper to init/get stats object
        const getStats = (obj: any, id: string) => {
            if (!obj[id]) obj[id] = {
                todo: { count: 0, minDays: null as number | null },
                important: 0,
                flagged: 0
            };
            return obj[id];
        };

        const counts = {
            pages: {} as Record<string, { todo: { count: number, minDays: number | null }; important: number; flagged: number }>,
            sections: {} as Record<string, { todo: { count: number, minDays: number | null }; important: number; flagged: number }>,
            categories: {} as Record<string, { todo: { count: number, minDays: number | null }; important: number; flagged: number }>,
        };

        const todoStats = await ToDo.aggregate([
            { $match: { userEmail, isCompleted: false } },
            {
                $lookup: {
                    from: 'notepages',
                    localField: 'sourcePageId',
                    foreignField: '_id',
                    as: 'page'
                }
            },
            { $unwind: '$page' },
            {
                $lookup: {
                    from: 'notesections',
                    localField: 'page.sectionId',
                    foreignField: '_id',
                    as: 'section'
                }
            },
            { $unwind: '$section' },
            {
                $group: {
                    _id: '$page._id',
                    sectionId: { $first: '$section._id' },
                    categoryId: { $first: '$section.categoryId' },
                    count: { $sum: 1 },
                    minDate: { $min: '$dueDate' }
                }
            }
        ]);

        const updateMinDays = (currentMin: number | null, newDate: Date | null) => {
            if (!newDate) return currentMin;
            // Calculate days diff: (Target - Now) in days
            // If negative, it's overdue (urgent).
            const days = Math.ceil((new Date(newDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (currentMin === null) return days;
            return Math.min(currentMin, days);
        };

        // Loop through aggregated pages (todoStats is now an array of page summaries)
        todoStats.forEach((page: any) => {
            const pageId = page._id.toString();
            const sectionId = page.sectionId.toString();
            const categoryId = page.categoryId.toString();

            const minDays = updateMinDays(null, page.minDate);

            // Update Page
            const pStats = getStats(counts.pages, pageId);
            pStats.todo.count += page.count;
            pStats.todo.minDays = minDays; // For a single page group, minDate is absolute min

            // Update Section
            const sStats = getStats(counts.sections, sectionId);
            sStats.todo.count += page.count;
            sStats.todo.minDays = sStats.todo.minDays === null ? minDays : Math.min(sStats.todo.minDays, minDays ?? 9999);
            if (sStats.todo.minDays === 9999 && minDays === null) sStats.todo.minDays = null; // Revert if both null

            // Update Category
            const cStats = getStats(counts.categories, categoryId);
            cStats.todo.count += page.count;
            cStats.todo.minDays = cStats.todo.minDays === null ? minDays : Math.min(cStats.todo.minDays, minDays ?? 9999);
            if (cStats.todo.minDays === 9999 && minDays === null) cStats.todo.minDays = null;
        });

        // 2. Aggregate Important/Flagged Tabs
        const tabStats = await NotePage.aggregate([
            { $match: { userEmail } },
            { $unwind: '$tabs' },
            {
                $match: {
                    $or: [
                        { 'tabs.isImportant': true },
                        { 'tabs.isFlagged': true }
                    ]
                }
            },
            // Look up Section to get Category
            {
                $lookup: {
                    from: 'notesections',
                    localField: 'sectionId',
                    foreignField: '_id',
                    as: 'section'
                }
            },
            { $unwind: '$section' },
            {
                $project: {
                    pageId: '$_id',
                    sectionId: '$section._id',
                    categoryId: '$section.categoryId',
                    isImportant: { $cond: [{ $eq: ['$tabs.isImportant', true] }, 1, 0] },
                    isFlagged: { $cond: [{ $eq: ['$tabs.isFlagged', true] }, 1, 0] }
                }
            }
        ]);

        // Sum up flags
        tabStats.forEach(item => {
            if (item.isImportant) {
                getStats(counts.pages, item.pageId).important += item.isImportant;
                getStats(counts.sections, item.sectionId).important += item.isImportant;
                getStats(counts.categories, item.categoryId).important += item.isImportant;
            }
            if (item.isFlagged) {
                getStats(counts.pages, item.pageId).flagged += item.isFlagged;
                getStats(counts.sections, item.sectionId).flagged += item.isFlagged;
                getStats(counts.categories, item.categoryId).flagged += item.isFlagged;
            }
        });

        return NextResponse.json({ success: true, data: counts });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
    }
}
