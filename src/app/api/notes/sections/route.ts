import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import NoteSection from '@/models/NoteSection';
import {authOptions} from '@/pages/api/auth/[...nextauth]';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  // Ensure mongoose is connected via centralized helper
  await dbConnect();

  const {searchParams} = new URL(request.url);
  const categoryId = searchParams.get('categoryId');

  try {
    const query = categoryId ? {categoryId} : {};
    const sections = await NoteSection.find(query).sort({order: 1});
    return NextResponse.json({success: true, data: sections});
  } catch (error) {
    return NextResponse.json({success: false, error: error}, {status: 400});
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }
  await dbConnect();
  try {
    const body = await request.json();
    const count = await NoteSection.countDocuments({categoryId: body.categoryId});
    const section = await NoteSection.create({...body, order: count, image: body.image || null});
    return NextResponse.json({success: true, data: section}, {status: 201});
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({success: false, error: errorMessage}, {status: 400});
  }
}
