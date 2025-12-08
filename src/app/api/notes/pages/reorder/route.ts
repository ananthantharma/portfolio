import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import NotePage from '@/models/NotePage';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const { items } = await request.json(); // Expect array of { id: string }

        if (!Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        const bulkOps = items.map((item, index) => ({
            updateOne: {
                filter: { _id: item.id },
                update: { $set: { order: index } },
            },
        }));

        if (bulkOps.length > 0) {
            await NotePage.bulkWrite(bulkOps);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error }, { status: 400 });
    }
}
