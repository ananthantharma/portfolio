import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import PromptLibraryItem from '@/models/PromptLibraryItem';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// PUT {from, to}: rename a category on every prompt in it (renaming onto an existing one merges them)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    const body = await req.json().catch(() => null);
    const from = typeof body?.from === 'string' ? body.from : '';
    const to = typeof body?.to === 'string' ? body.to.trim().slice(0, 60) : '';
    if (!from || !to) return NextResponse.json({success: false, error: 'Give the category a name.'}, {status: 400});

    await dbConnect();
    const result = await PromptLibraryItem.updateMany({userEmail: session.user.email, category: from}, {$set: {category: to}});
    return NextResponse.json({success: true, data: {modified: result.modifiedCount ?? 0}});
  } catch (error) {
    console.error('Error renaming prompt category:', error);
    return NextResponse.json({success: false, error: 'Could not rename the category.'}, {status: 500});
  }
}
