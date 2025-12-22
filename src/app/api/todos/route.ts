import '@/models/NotePage'; // Ensure NotePage is registered for population
import '@/models/NoteSection'; // Ensure NoteSection is registered for population

import { NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import { uploadFileToGridFS } from '@/lib/gridfs';
import ToDo from '@/models/ToDo';

// POST: Create a new To Do item
export async function POST(req: Request) {
    try {
        await dbConnect();

        let data;
        // Check if content-type is multipart/form-data
        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const title = formData.get('title') as string;
            const priority = formData.get('priority') as string;
            const dueDate = formData.get('dueDate') as string;
            const category = formData.get('category') as string;
            const notes = formData.get('notes') as string;
            const sourcePageId = formData.get('sourcePageId') as string;

            const files = formData.getAll('files') as File[];
            const attachments = [];

            for (const file of files) {
                if (file.size > 0) {
                    const fileId = await uploadFileToGridFS(file, file.name, file.type);
                    attachments.push({
                        name: file.name,
                        type: file.type,
                        fileId: fileId,
                        size: file.size
                    });
                }
            }

            data = {
                sourcePageId: sourcePageId || undefined,
                title,
                priority,
                dueDate,
                category,
                notes,
                attachments
            };
        } else {
            // Fallback for JSON (e.g. from existing external calls?)
            // Though our frontend will switch to FormData.
            const body = await req.json();
            data = body;
        }

        console.log('Creating To Do:', { title: data.title, priority: data.priority, attachmentsCount: data.attachments?.length || 0 });

        const newToDo = await ToDo.create(data);

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
