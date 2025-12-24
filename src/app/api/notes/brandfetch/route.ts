import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');

  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  const apiKey = process.env.BRANDFETCH_API_KEY;
  if (!apiKey) {
    console.error('BRANDFETCH_API_KEY is not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    // STAGE 1: Search for the brand to get the correct Asset URL
    // We use the Search API because direct CDN access via Client ID is often blocked by hotlinking protection
    // unless the domain is whitelisted. The Search API (v2) seems to accept the key and returns a valid asset URL.
    const searchUrl = `https://api.brandfetch.io/v2/search/${encodeURIComponent(domain)}`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    let assetUrl = null;

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const match = Array.isArray(searchData) ? searchData.find((item: any) => item.domain === domain) : null;
      if (match && match.icon) {
        assetUrl = match.icon;
      }
    }

    // Fallback to CDN if search fails or no icon found (though CDN likely fails too)
    if (!assetUrl) {
      assetUrl = `https://cdn.brandfetch.io/${domain}?c=${apiKey}`;
    }

    // STAGE 2: Redirect to the Asset
    // Instead of proxying the stream (which looks like server-side hotlinking and gets blocked),
    // we redirect the browser to the signed asset URL. The browser will send the user's Referer,
    // which should be allowed if the domain is whitelisted.
    return NextResponse.redirect(assetUrl);
  } catch (error) {
    console.error('Error fetching from Brandfetch:', error);
    return NextResponse.json({ error: 'Failed to fetch logo' }, { status: 502 });
  }
}
