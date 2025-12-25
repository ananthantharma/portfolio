import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import BudgetItem from '@/models/BudgetItem';

export async function GET() {
    try {
        await dbConnect();
        const items = await BudgetItem.find({}).sort({ createdAt: -1 });
        return NextResponse.json(items);
    } catch (error) {
        console.error('Error fetching budget items:', error);
        return NextResponse.json({ error: 'Failed to fetch budget items' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        const newItem = await BudgetItem.create(body);
        return NextResponse.json(newItem, { status: 201 });
    } catch (error) {
        console.error('Error creating budget item:', error);
        return NextResponse.json({ error: 'Failed to create budget item' }, { status: 500 });
    }
}
