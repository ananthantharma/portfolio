import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import NoteCategory from '@/models/NoteCategory';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure mongoose is connected
  if (mongoose.connection.readyState === 0) {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
    } else {
      await dbConnect();
    }
  } else {
    // If connected state is weird, ensure dbConnect is called or just proceed
    if (!mongoose.connections[0].readyState) {
      await dbConnect();
    }
  }
  try {
    const categories = await NoteCategory.find({}).sort({ order: 1 });
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  try {
    const body = await request.json();
    const count = await NoteCategory.countDocuments();
    const category = await NoteCategory.create({ ...body, order: count });
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
