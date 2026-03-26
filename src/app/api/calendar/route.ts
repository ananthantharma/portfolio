export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token. Please re-sign in.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const maxResults = searchParams.get('maxResults') || '20';

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      maxResults,
      orderBy: 'startTime',
      singleEvents: 'true',
    });

    const res = await fetch(`${CALENDAR_BASE}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error('Google Calendar API error:', errData);
      return NextResponse.json(
        { error: errData.error?.message || 'Failed to fetch calendar events' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data: data.items || [] });
  } catch (error: any) {
    console.error('Calendar GET error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token. Please re-sign in.' }, { status: 401 });
    }

    const body = await request.json();
    const { summary, description, start, end } = body;

    if (!summary || !start || !end) {
      return NextResponse.json({ error: 'summary, start, and end are required' }, { status: 400 });
    }

    const eventBody = {
      summary,
      description: description || '',
      start: { dateTime: start.dateTime, timeZone: start.timeZone || 'UTC' },
      end: { dateTime: end.dateTime, timeZone: end.timeZone || 'UTC' },
    };

    const res = await fetch(CALENDAR_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error('Google Calendar create error:', errData);
      return NextResponse.json(
        { error: errData.error?.message || 'Failed to create event' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error('Calendar POST error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
