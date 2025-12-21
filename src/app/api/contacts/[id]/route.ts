import { NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import Contact from '@/models/Contact';

interface RouteParams {
    params: {
        id: string;
    };
}

export async function PUT(req: Request, { params }: RouteParams) {
    try {
        await dbConnect();
        const { id } = params;
        const body = await req.json();

        console.log('Updating Contact:', id);

        const updatedContact = await Contact.findByIdAndUpdate(
            id,
            { ...body },
            { new: true, runValidators: true }
        );

        if (!updatedContact) {
            return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedContact });
    } catch (error) {
        console.error(`Error updating contact ${params.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
    try {
        await dbConnect();
        const { id } = params;

        console.log('Deleting Contact:', id);

        const deletedContact = await Contact.findByIdAndDelete(id);

        if (!deletedContact) {
            return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: deletedContact });
    } catch (error) {
        console.error(`Error deleting contact ${params.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
