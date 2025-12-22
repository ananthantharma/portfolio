import { NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import { deleteFileFromGridFS, uploadFileToGridFS } from '@/lib/gridfs';
import ToDo from '@/models/ToDo';

// PUT: Update a To Do item (e.g., mark as completed)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        await dbConnect();
        const { id } = params;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any = {};
        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();

            // Extract standard fields
            const title = formData.get('title') as string;
            if (title) data.title = title;

            const priority = formData.get('priority') as string;
            if (priority) data.priority = priority;

            const dueDate = formData.get('dueDate') as string;
            if (dueDate) data.dueDate = dueDate;

            const category = formData.get('category') as string;
            if (category) data.category = category;

            const notes = formData.get('notes') as string;
            if (notes) data.notes = notes;

            // Handle attachments
            // 1. New files
            const files = formData.getAll('files') as File[];
            const newAttachments = [];
            for (const file of files) {
                if (file.size > 0) {
                    const fileId = await uploadFileToGridFS(file, file.name, file.type);
                    newAttachments.push({
                        name: file.name,
                        type: file.type,
                        fileId: fileId,
                        size: file.size
                    });
                }
            }

            // 2. Existing attachments (kept)
            // The frontend should send back the existing attachments that are NOT deleted.
            // If the frontend sends 'existingAttachments' as a JSON string
            const existingAttachmentsJson = formData.get('existingAttachments') as string;
            let keptAttachments = [];
            if (existingAttachmentsJson) {
                keptAttachments = JSON.parse(existingAttachmentsJson);
            }

            // We need to identify which files were removed to delete them from GridFS
            // But first, let's just construct the new array
            // Optimization: Find the Current ToDo, check diff, delete removed files.
            const currentToDo = await ToDo.findById(id);
            if (currentToDo && currentToDo.attachments) {
                const keptIds = new Set(keptAttachments.map((a: { fileId: string }) => a.fileId));
                for (const att of currentToDo.attachments) {
                    if (!keptIds.has(att.fileId)) {
                        // This attachment is not in the kept list, delete it
                        await deleteFileFromGridFS(att.fileId).catch(console.error);
                    }
                }
            }

            data.attachments = [...keptAttachments, ...newAttachments];

        } else {
            // JSON fallback (e.g. for simple status updates like isCompleted)
            const body = await req.json();
            data = body;
        }

        const updatedToDo = await ToDo.findByIdAndUpdate(id, data, { new: true });

        if (!updatedToDo) {
            return NextResponse.json({ success: false, error: 'To Do not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedToDo });
    } catch (error) {
        console.error('Error updating To Do:', error);
        return NextResponse.json({ success: false, error: 'Failed to update To Do' }, { status: 500 });
    }
}

// DELETE: Remove a To Do item
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    try {
        await dbConnect();
        const { id } = params;

        // Find first to delete files
        const todo = await ToDo.findById(id);
        if (todo && todo.attachments) {
            for (const att of todo.attachments) {
                await deleteFileFromGridFS(att.fileId).catch(console.error);
            }
        }

        const deletedToDo = await ToDo.findByIdAndDelete(id);

        if (!deletedToDo) {
            return NextResponse.json({ success: false, error: 'To Do not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        console.error('Error deleting To Do:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete To Do' }, { status: 500 });
    }
}
