import { NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import NoteCategory from '@/models/NoteCategory';
import NotePage from '@/models/NotePage';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    await dbConnect();
    try {
        const body = await request.json();
        const category = await NoteCategory.findByIdAndUpdate(params.id, body, {
            new: true,
            runValidators: true,
        });
        if (!category) {
            return NextResponse.json(
                { success: false, error: 'Category not found' },
                { status: 404 }
            );
        }
        return NextResponse.json({ success: true, data: category });
    } catch (error) {
        return NextResponse.json({ success: false, error: error }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    await dbConnect();
    try {
        const category = await NoteCategory.findByIdAndDelete(params.id);
        if (!category) {
            return NextResponse.json(
                { success: false, error: 'Category not found' },
                { status: 404 }
            );
        }
        // Cascade delete pages
        await NotePage.deleteMany({ categoryId: params.id });

        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: error }, { status: 400 });
    }
}
