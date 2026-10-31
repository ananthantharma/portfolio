import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import NoteCategory from '@/models/NoteCategory';
import NoteSection from '@/models/NoteSection';
import Staff from '@/models/Staff';

export const dynamic = 'force-dynamic';

const clean = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/**
 * Everyone in a People notebook can be picked in "Assigned to": each person page gets a staff entry.
 * Pages are matched to an existing entry by name first (someone you'd already assigned work to),
 * renames follow the page, and entries whose page is gone are unlinked (their tasks keep the name).
 */
async function syncPeople(userEmail: string) {
  const notebooks = await NoteCategory.find({userEmail, kind: 'people'}).select('_id').lean();
  const sections = notebooks.length
    ? await NoteSection.find({userEmail, categoryId: {$in: notebooks.map(n => n._id)}}).select('name categoryId').lean()
    : [];
  const staff = await Staff.find({userEmail}).select('name sectionId').lean();
  const pageIds = new Set(sections.map(s => String(s._id)));
  const bySection = new Map(staff.filter(p => p.sectionId).map(p => [String(p.sectionId), p]));
  const unlinked = staff.filter(p => !p.sectionId || !pageIds.has(String(p.sectionId)));
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const writes: Promise<unknown>[] = [];

  for (const section of sections) {
    const id = String(section._id);
    const name = String(section.name || '').trim().slice(0, 120) || 'Unnamed';
    const linked = bySection.get(id);
    if (linked) {
      if (linked.name !== name) writes.push(Staff.updateOne({_id: linked._id, userEmail}, {$set: {name}}));
      continue;
    }
    const match = unlinked.findIndex(p => same(p.name, name));
    if (match >= 0) {
      const [person] = unlinked.splice(match, 1);
      writes.push(Staff.updateOne({_id: person._id, userEmail}, {$set: {sectionId: section._id, name}}));
    } else {
      writes.push(Staff.create({userEmail, name, sectionId: section._id}));
    }
  }
  // Pages that were deleted (or whose notebook is no longer a People notebook)
  const stale = unlinked.filter(p => p.sectionId).map(p => p._id);
  if (stale.length) writes.push(Staff.updateMany({_id: {$in: stale}, userEmail}, {$set: {sectionId: null}}));
  await Promise.all(writes);
  return new Map(sections.map(s => [String(s._id), String(s.categoryId)]));
}

// GET: your staff list, A–Z (sorted in JS; the hosted database doesn't support collation)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({success: false, error: 'Unauthorized'}, {status: 401});
    await dbConnect();
    let notebookOf = new Map<string, string>();
    try {
      notebookOf = await syncPeople(session.user.email);
    } catch (error) {
      console.error('Staff: people sync failed:', error);
    }
    const staff = await Staff.find({userEmail: session.user.email}).select('name email role sectionId').lean();
    staff.sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
    const data = staff.map(p => {
      const sectionId = p.sectionId ? String(p.sectionId) : null;
      return {...p, sectionId: sectionId && notebookOf.has(sectionId) ? sectionId : null, categoryId: sectionId ? notebookOf.get(sectionId) || null : null};
    });
    return NextResponse.json({success: true, data});
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
