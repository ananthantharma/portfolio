/* eslint-disable simple-import-sort/imports */
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import dbConnect from '@/lib/dbConnect';
import BudgetItem from '@/models/BudgetItem';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function GET() {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await BudgetItem.find({ userEmail: session.user.email }).sort({ createdAt: -1 });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching budget items:', error);
    return NextResponse.json({ error: 'Failed to fetch budget items' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const newItem = await BudgetItem.create({ ...body, userEmail: session.user.email });
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating budget item:', error);
    return NextResponse.json({ error: 'Failed to create budget item' }, { status: 500 });
  }
}
