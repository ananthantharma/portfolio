import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import BudgetItem from '@/models/BudgetItem';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();
        const { id } = params;
        const body = await req.json();
        const updated = await BudgetItem.findByIdAndUpdate(id, body, { new: true, runValidators: true });

        if (!updated) {
            return NextResponse.json({ error: 'Budget item not found' }, { status: 404 });
        }
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating budget item:', error);
        return NextResponse.json({ error: 'Failed to update budget item' }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await dbConnect();
        const { id } = params;
        const deleted = await BudgetItem.findByIdAndDelete(id);

        if (!deleted) {
            return NextResponse.json({ error: 'Budget item not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: deleted });
    } catch (error) {
        console.error('Error deleting budget item:', error);
        return NextResponse.json({ error: 'Failed to delete budget item' }, { status: 500 });
    }
}
