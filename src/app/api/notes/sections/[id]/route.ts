import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import NotePage from '@/models/NotePage';
import NoteSection from '@/models/NoteSection';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    try {
        const body = await request.json();
        const section = await NoteSection.findByIdAndUpdate(params.id, body, {
            new: true,
            runValidators: true,
        });
        if (!section) {
            return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: section });
    } catch (error) {
        return NextResponse.json({ success: false, error: error }, { status: 400 });
    }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    try {
        const deletedSection = await NoteSection.deleteOne({ _id: params.id });
        if (!deletedSection) {
            return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
        }
        // Delete associated pages
        await NotePage.deleteMany({ sectionId: params.id });

        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: error }, { status: 400 });
    }
}
