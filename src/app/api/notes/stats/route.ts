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

        // Process ToDo Counts
        const counts = {
            pages: {} as Record<string, number>,
            sections: {} as Record<string, number>,
            categories: {} as Record<string, number>,
        };

        if (todoStats.length > 0) {
            const stats = todoStats[0];
            stats.pages.forEach((id: any) => { counts.pages[id] = (counts.pages[id] || 0) + 1; });
            stats.sections.forEach((id: any) => { counts.sections[id] = (counts.sections[id] || 0) + 1; });
            stats.categories.forEach((id: any) => { counts.categories[id] = (counts.categories[id] || 0) + 1; });
        }

        // 2. Aggregate Important/Flagged Tabs
        // Unwind tabs, match flags.
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
                    flags: {
                        $add: [
                            { $cond: [{ $eq: ['$tabs.isImportant', true] }, 1, 0] },
                            { $cond: [{ $eq: ['$tabs.isFlagged', true] }, 1, 0] }
                        ]
                    }
                }
            }
        ]);

        // Sum up flags
        tabStats.forEach(item => {
            // item.flags is the count for THAT tab.
            // We assume simple summation.
            const inc = item.flags;
            counts.pages[item.pageId] = (counts.pages[item.pageId] || 0) + inc;
            counts.sections[item.sectionId] = (counts.sections[item.sectionId] || 0) + inc;
            counts.categories[item.categoryId] = (counts.categories[item.categoryId] || 0) + inc;
        });

        return NextResponse.json({ success: true, data: counts });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
    }
}
