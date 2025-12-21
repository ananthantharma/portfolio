import { NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import ToDo from '@/models/ToDo';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();

        const todo = await ToDo.create(body);

        return NextResponse.json({ success: true, data: todo }, { status: 201 });
    } catch (error) {
        console.error('Error creating ToDo:', error);
        return NextResponse.json({ success: false, error: 'Failed to create ToDo' }, { status: 500 });
    }
}
