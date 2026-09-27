import {NextResponse} from 'next/server';

import {authorizeSection} from '@/lib/vendorProfileServer';
import VendorProfile from '@/models/VendorProfile';

export const dynamic = 'force-dynamic';

// Records a visit to the page and returns when the previous visit was, for "Since your last visit"
export async function POST(_req: Request, {params}: {params: {sectionId: string}}) {
  const auth = await authorizeSection(params.sectionId);
  if ('error' in auth) return auth.error;
  try {
    const before = await VendorProfile.findOneAndUpdate(
      {userEmail: auth.userEmail, sectionId: params.sectionId},
      {$set: {lastVisitedAt: new Date()}, $setOnInsert: {status: 'Active'}},
      {upsert: true, new: false},
    )
      .select('lastVisitedAt')
      .lean();
    return NextResponse.json({success: true, data: {previousVisitAt: before?.lastVisitedAt || null}});
  } catch (error) {
    console.error('Visit POST error:', error);
    return NextResponse.json({error: 'Failed to record visit'}, {status: 500});
  }
}
