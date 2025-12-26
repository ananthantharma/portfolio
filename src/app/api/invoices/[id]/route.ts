/* eslint-disable simple-import-sort/imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../../../pages/api/auth/[...nextauth]';
import Invoice from '@/models/Invoice';
import dbConnect from '@/lib/dbConnect';

export const runtime = 'nodejs';

export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // Ensure the invoice belongs to the user
        const result = await Invoice.findOneAndDelete({
            _id: params.id,
            userEmail: session.user.email
        });

        if (!result) {
            return NextResponse.json({ error: 'Invoice not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Invoice deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting invoice:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete invoice' }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        await dbConnect();

        // Prevent userEmail injection
        delete body.userEmail;

        const result = await Invoice.findOneAndUpdate(
            { _id: params.id, userEmail: session.user.email },
            { $set: body },
            { new: true } // Return updated document
        );

        if (!result) {
            return NextResponse.json({ error: 'Invoice not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ data: result });
    } catch (error: any) {
        console.error('Error updating invoice:', error);
        return NextResponse.json({ error: error.message || 'Failed to update invoice' }, { status: 500 });
    }
}
