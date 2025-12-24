
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

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
        const brandfetchUrl = `https://cdn.brandfetch.io/${domain}?c=${apiKey}`;
        const response = await fetch(brandfetchUrl);

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ error: 'Logo not found' }, { status: 404 });
            }
            throw new Error(`Brandfetch responded with ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || 'image/png';
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
            },
        });
    } catch (error) {
        console.error('Error fetching from Brandfetch:', error);
        return NextResponse.json({ error: 'Failed to fetch logo' }, { status: 502 });
    }
}
