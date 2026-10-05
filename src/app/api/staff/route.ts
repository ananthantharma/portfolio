import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Staff from '@/models/Staff';

export const dynamic = 'force-dynamic';

const clean = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// GET: your staff list, A–Z (sorted in JS; the hosted database doesn't support collation)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    await dbConnect();
    const staff = await Staff.find({userEmail: session.user.email}).select('name email role').lean();
    staff.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    return NextResponse.json({success: true, data: staff});
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({success: false, error: 'Could not load staff'}, {status: 500});
  }
}

// POST: add someone
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    const body = (await req.json()) as {name?: unknown; email?: unknown; role?: unknown};
    const name = clean(body.name, 120);
    const email = clean(body.email, 200);
    if (!name) return NextResponse.json({success: false, error: 'Add a name.'}, {status: 400});
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({success: false, error: 'That email address does not look right.'}, {status: 400});
    }
    await dbConnect();
    const person = await Staff.create({userEmail: session.user.email, name, email, role: clean(body.role, 120)});
    return NextResponse.json({success: true, data: {_id: person._id, name: person.name, email: person.email, role: person.role}}, {status: 201});
  } catch (error) {
    console.error('Error adding staff:', error);
    return NextResponse.json({success: false, error: 'Could not add that person'}, {status: 500});
  }
}
