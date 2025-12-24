import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import NoteSection from '@/models/NoteSection';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function GET(request: Request) {
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
    if (!mongoose.connections[0].readyState) {
      await dbConnect();
    }
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');

  try {
    const query = categoryId ? { categoryId } : {};
    const sections = await NoteSection.find(query).sort({ order: 1 });
    return NextResponse.json({ success: true, data: sections });
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
    const count = await NoteSection.countDocuments({ categoryId: body.categoryId });
    const section = await NoteSection.create({ ...body, order: count });
    return NextResponse.json({ success: true, data: section }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
