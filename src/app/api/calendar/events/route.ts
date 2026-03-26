import {getServerSession} from 'next-auth';
import {NextResponse} from 'next/server';

import {authOptions} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const accessToken = (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({success: false, error: 'No access token', events: []}, {status: 200});
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const params = new URLSearchParams({
      timeMin: today.toISOString(),
      timeMax: thirtyDaysLater.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50',
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (response.status === 401) {
      return NextResponse.json({success: false, error: 'auth_error', events: []}, {status: 200});
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google Calendar API error:', errorData);
      return NextResponse.json({success: false, error: 'Calendar fetch failed', events: []}, {status: 200});
    }

    const data = await response.json();

    return NextResponse.json({success: true, events: data.items || []});
  } catch (error) {
    console.error('Calendar GET error:', error);
    return NextResponse.json({success: false, error: 'Internal error', events: []}, {status: 200});
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const accessToken = (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({success: false, error: 'No access token'}, {status: 400});
    }

    const body = await req.json();
    const {summary, description, start, end, colorId} = body;

    const eventBody: Record<string, unknown> = {
      summary,
      description,
      start,
      end,
    };

    if (colorId) {
      eventBody.colorId = colorId;
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google Calendar create event error:', errorData);
      return NextResponse.json({success: false, error: 'Failed to create event'}, {status: response.status});
    }

    const data = await response.json();

    return NextResponse.json({success: true, data}, {status: 201});
  } catch (error) {
    console.error('Calendar POST error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({success: false, error: errorMessage}, {status: 500});
  }
}
