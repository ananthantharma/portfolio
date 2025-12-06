import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import NoteCategory from '@/models/NoteCategory';

export async function GET() {
    await dbConnect();
    try {
        const categories = await NoteCategory.find({}).sort({ createdAt: 1 });
        return NextResponse.json({ success: true, data: categories });
    } catch (error) {
        return NextResponse.json({ success: false, error: error }, { status: 400 });
    }
}

export async function POST(request: Request) {
    await dbConnect();
    try {
        const body = await request.json();
        const category = await NoteCategory.create(body);
        return NextResponse.json({ success: true, data: category }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error }, { status: 400 });
    }
}
