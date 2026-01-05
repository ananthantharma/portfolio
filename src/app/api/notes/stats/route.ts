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

        // 1. Aggregate Active ToDos
        // ToDos have `sourcePageId`. We need to group by Page, and also look up Section -> Category.
        // However, ToDos only store `sourcePageId`. We need to populate/lookup to get hierarchy.
        // Aggregation pipeline is best.

        const todoStats = await ToDo.aggregate([
            { $match: { userEmail, isCompleted: false } },
            // Lookup Page to get SectionId
            {
                $lookup: {
                    from: 'notepages',
                    localField: 'sourcePageId',
                    foreignField: '_id',
                    as: 'page'
                }
            },
            { $unwind: '$page' },
            // Lookup Section to get CategoryId
            {
                $lookup: {
                    from: 'notesections',
                    localField: 'page.sectionId',
                    foreignField: '_id',
                    as: 'section'
                }
            },
            { $unwind: '$section' },
            // Now we have page._id, section._id, section.categoryId
            {
                $group: {
                    _id: null,
                    pages: { $push: '$page._id' },
                    sections: { $push: '$section._id' },
                    categories: { $push: '$section.categoryId' }
                }
            }
        ]);

        // Helper to init/get stats object
        const getStats = (obj: any, id: string) => {
            if (!obj[id]) obj[id] = { todo: 0, important: 0, flagged: 0 };
            return obj[id];
        };

        const counts = {
            pages: {} as Record<string, { todo: number; important: number; flagged: number }>,
            sections: {} as Record<string, { todo: number; important: number; flagged: number }>,
            categories: {} as Record<string, { todo: number; important: number; flagged: number }>,
        };

        if (todoStats.length > 0) {
            const stats = todoStats[0];
            stats.pages.forEach((id: any) => { getStats(counts.pages, id).todo++; });
            stats.sections.forEach((id: any) => { getStats(counts.sections, id).todo++; });
            stats.categories.forEach((id: any) => { getStats(counts.categories, id).todo++; });
        }

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
