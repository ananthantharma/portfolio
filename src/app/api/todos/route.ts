import '@/models/NotePage'; // Ensure NotePage is registered for population

import { NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import ToDo from '@/models/ToDo';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();
        const { sourcePageId, title, priority, dueDate, category, notes } = body;

        console.log('Creating To Do:', { title, priority, sourcePageId });

        const newToDo = await ToDo.create({
            sourcePageId,
            title,
            priority,
            dueDate,
            category,
            notes,
        });

        console.log('To Do Created:', newToDo._id);
        return NextResponse.json({ success: true, data: newToDo }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/todos:', error);
        return NextResponse.json({ success: false, error: 'Failed to create To Do' }, { status: 500 });
    }
}

export async function GET(_req: Request) {
    try {
        await dbConnect();
        // Potential filters could be added here later (e.g. ?isCompleted=false)

        const todos = await ToDo.find().sort({ createdAt: -1 }).populate('sourcePageId', 'title');

        console.log(`Fetched ${todos.length} todos`);
        return NextResponse.json({ success: true, data: todos });
    } catch (error) {
        console.error('Error fetching To Dos:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch To Dos' }, { status: 500 });
    }
}
