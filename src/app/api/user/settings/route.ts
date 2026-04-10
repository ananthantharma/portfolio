export const dynamic = 'force-dynamic';
import {getServerSession} from 'next-auth';
import {NextResponse} from 'next/server';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export const runtime = 'nodejs';

export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    await dbConnect();
    const user = await User.findOne({email: session.user.email}).select('badgeSettings');

    if (!user) {
      return NextResponse.json({error: 'User not found'}, {status: 404});
    }

    return NextResponse.json({
      success: true,
      data: user.badgeSettings || {
        thresholds: {critical: 3, urgent: 7, upcoming: 14, planned: 21},
        colors: {
          critical: 'bg-red-500',
          urgent: 'bg-red-500',
          upcoming: 'bg-orange-500',
          planned: 'bg-purple-500',
          longTerm: 'bg-green-500',
        },
        animations: {critical: '1s', urgent: '3s'},
      },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({success: false, error: 'Failed to fetch settings'}, {status: 500});
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const {badgeSettings} = await req.json();

    if (!badgeSettings) {
      return NextResponse.json({error: 'Missing settings data'}, {status: 400});
    }

    await dbConnect();
    const user = await User.findOneAndUpdate(
      {email: session.user.email},
      {$set: {badgeSettings}},
      {new: true, upsert: true},
    ).select('badgeSettings');

    return NextResponse.json({success: true, data: user.badgeSettings});
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({success: false, error: 'Failed to update settings'}, {status: 500});
  }
}
