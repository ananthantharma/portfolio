import { NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import NotePage from '@/models/NotePage';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    await dbConnect();
    try {
        const body = await request.json();
        const page = await NotePage.findByIdAndUpdate(params.id, body, {
            new: true,
            runValidators: true,
        });
        if (!page) {
            return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: page });
    } catch (error) {
        return NextResponse.json({ success: false, error: error }, { status: 400 });
    }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
    await dbConnect();
    try {
        const page = await NotePage.findByIdAndDelete(params.id);
        if (!page) {
            return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: error }, { status: 400 });
    }
}
