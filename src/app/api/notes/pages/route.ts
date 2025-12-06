import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import NotePage from '@/models/NotePage';

export async function GET(request: Request) {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    try {
        const query = categoryId ? { categoryId } : {};
        const pages = await NotePage.find(query).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: pages });
    } catch (error) {
        return NextResponse.json({ success: false, error: error }, { status: 400 });
    }
}

export async function POST(request: Request) {
    await dbConnect();
    try {
        const body = await request.json();
        const page = await NotePage.create(body);
        return NextResponse.json({ success: true, data: page }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error }, { status: 400 });
    }
}
