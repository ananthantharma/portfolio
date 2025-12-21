import { NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import Contact from '@/models/Contact';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();

        console.log('Creating Contact:', body.name);

        const newContact = await Contact.create(body);

        return NextResponse.json({ success: true, data: newContact }, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/contacts:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}

export async function GET(_req: Request) {
    try {
        await dbConnect();
        const contacts = await Contact.find().sort({ name: 1 });
        return NextResponse.json({ success: true, data: contacts });
    } catch (error) {
        console.error('Error fetching Contacts:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
