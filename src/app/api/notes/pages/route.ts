import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import NotePage from '@/models/NotePage';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get('sectionId');

  try {
    const query = sectionId ? { sectionId } : {};
    const pages = await NotePage.find(query).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: pages });
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
    const page = await NotePage.create(body);
    return NextResponse.json({ success: true, data: page }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error }, { status: 400 });
  }
}
