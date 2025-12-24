import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const apiKey = process.env.BRANDFETCH_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    try {
        const brandfetchUrl = `https://api.brandfetch.io/v2/search/${encodeURIComponent(query)}`;
        const response = await fetch(brandfetchUrl, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            // Handle rate limits or other errors gracefully
            return NextResponse.json({ error: `Brandfetch Error: ${response.status}`, results: [] }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error searching Brandfetch:', error);
        return NextResponse.json({ error: 'Failed to search brands' }, { status: 502 });
    }
}
