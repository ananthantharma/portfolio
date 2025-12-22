import '@/models/NotePage'; // Ensure NotePage is registered for population
import '@/models/NoteSection'; // Ensure NoteSection is registered for population

import { NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import ToDo from '@/models/ToDo';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const { sourcePageId, title, priority, dueDate, category, notes, attachments } = body;

        console.log('Creating To Do:', { title, priority, sourcePageId: sourcePageId || 'None', attachmentsCount: attachments?.length || 0 });

        const newToDo = await ToDo.create({
            sourcePageId: sourcePageId || undefined,
            title,
            priority,
            dueDate,
            category,
            notes,
            attachments,
        });

        console.log('To Do Created:', newToDo._id);
        return NextResponse.json({ success: true, data: newToDo }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/todos:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}

export async function GET(_req: Request) {
    try {
        await dbConnect();
        // Potential filters could be added here later (e.g. ?isCompleted=false)

        const todos = await ToDo.find()
            .sort({ createdAt: -1 })
            .populate({
                path: 'sourcePageId',
                select: 'title sectionId',
                populate: {
                    path: 'sectionId',
                    select: 'categoryId'
                }
            });

        console.log(`Fetched ${todos.length} todos`);
        return NextResponse.json({ success: true, data: todos });
    } catch (error) {
        console.error('Error fetching To Dos:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
