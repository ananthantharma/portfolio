import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import NoteCategory from '@/models/NoteCategory';
import NoteSection from '@/models/NoteSection';

export const dynamic = 'force-dynamic';

// Every vendor the user has: the sections of their vendor notebooks
export async function GET() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  try {
    await dbConnect();
    const notebooks = await NoteCategory.find({userEmail, kind: 'vendor'}).select('name').lean();
    const names = new Map(notebooks.map(n => [String(n._id), n.name]));
    const sections = await NoteSection.find({userEmail, categoryId: {$in: [...names.keys()]}})
      .select('name categoryId')
      .sort({name: 1})
      .lean();
    return NextResponse.json({
      success: true,
      data: sections.map(s => ({
        _id: String(s._id),
        name: s.name,
        categoryId: String(s.categoryId),
        notebook: names.get(String(s.categoryId)) || '',
      })),
    });
  } catch (error) {
    console.error('Vendor list error:', error);
    return NextResponse.json({error: 'Failed to load vendors'}, {status: 500});
  }
}
