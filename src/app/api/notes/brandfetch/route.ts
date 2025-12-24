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
        // Verify if the Brandfetch URL is actually accessible (HEAD check)
        // because sometimes it returns 404 or requires strict hotlinking which fails even on redirect
        try {
          const headCheck = await fetch(match.icon, { method: 'HEAD' });
          if (headCheck.ok) {
            assetUrl = match.icon;
          } else {
            console.warn(`Brandfetch icon found but not accessible (${headCheck.status}): ${match.icon}`);
          }
        } catch (e) {
          console.warn('Brandfetch HEAD check failed', e);
        }
      }
    }

    if (assetUrl) {
      // STAGE 2a: Redirect to valid Brandfetch Asset
      return NextResponse.redirect(assetUrl);
    } else {
      // STAGE 2b: Fallback to Google Favicon
      // Google Favicons are reliable, free, and support redirection
      console.log(`Falling back to Google Favicon for ${domain}`);
      const googleUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
      return NextResponse.redirect(googleUrl);
    }

  } catch (error) {
    console.error('Error fetching from Brandfetch:', error);
    // Ultimate fallback even on crash
    const googleUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
    return NextResponse.redirect(googleUrl);
  }
}
