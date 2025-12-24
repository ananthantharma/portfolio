import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import dbConnect from '@/lib/dbConnect';
import NoteCategory from '@/models/NoteCategory';
import {authOptions} from '@/pages/api/auth/[...nextauth]';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  // Ensure mongoose is connected via centralized helper
  await dbConnect();
  try {
    const categories = await NoteCategory.find({}).sort({order: 1});
    return NextResponse.json({success: true, data: categories});
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({success: false, error: errorMessage}, {status: 400});
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
    const count = await NoteCategory.countDocuments({userId: session.user.id});
    const category = await NoteCategory.create({
      ...body,
      userId: session.user.id,
      order: count,
    });
    return NextResponse.json({success: true, data: category}, {status: 201});
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({success: false, error: errorMessage}, {status: 400});
  }
}
