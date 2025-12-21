import { NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import ToDo from '@/models/ToDo';

// PUT: Update a To Do item (e.g., mark as completed)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        await dbConnect();
        const body = await req.json();
        const { id } = params;

        const updatedToDo = await ToDo.findByIdAndUpdate(id, body, { new: true });

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
