import { NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import ToDo from '@/models/ToDo';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const { sourcePageId, title, priority, dueDate, category, notes } = body;

        const newToDo = await ToDo.create({
            sourcePageId,
            title,
            priority,
            dueDate,
            category,
            notes,
        });

        return NextResponse.json({ success: true, data: newToDo }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch To Dos' }, { status: 500 });
    }
}
