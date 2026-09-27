import {NextResponse} from 'next/server';

import {authorizeSection} from '@/lib/vendorProfileServer';
import ProjectActivity, {ACTIVITY_TYPES} from '@/models/ProjectActivity';

export const dynamic = 'force-dynamic';

// Newest first. ?type=note|task|document|decision|attention|project, ?since=ISO date, ?limit=1..200
export async function GET(req: Request, {params}: {params: {sectionId: string}}) {
  const auth = await authorizeSection(params.sectionId);
  if ('error' in auth) return auth.error;
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const since = url.searchParams.get('since');
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 50));
  const query: Record<string, unknown> = {userEmail: auth.userEmail, sectionId: params.sectionId};
  if (type && ACTIVITY_TYPES.includes(type as never)) query.type = type;
  if (since && !Number.isNaN(new Date(since).getTime())) query.createdAt = {$gt: new Date(since)};
  try {
    const items = await ProjectActivity.find(query).sort({createdAt: -1}).limit(limit).select('-userEmail -sectionId -__v').lean();
    return NextResponse.json({success: true, data: items});
  } catch (error) {
    console.error('Activity GET error:', error);
    return NextResponse.json({error: 'Failed to load activity'}, {status: 500});
  }
}
