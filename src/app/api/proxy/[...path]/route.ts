
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const TARGET_BASE = 'https://generativelanguage.googleapis.com';

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
    try {
        const path = params.path.join('/');
        const url = new URL(req.url);
        let key = url.searchParams.get('key');

        // Handle Managed Key
        if (key === 'MANAGED') {
            const session = await getServerSession(authOptions);
            if (!session || !(session.user as any).googleApiEnabled) {
                return NextResponse.json(
                    { error: 'Access Denied: You do not have permission to use the managed Google API key.' },
                    { status: 403 }
                );
            }
            key = process.env.GOOGLE_API_KEY || '';
        }

        // Construct target URL
        const targetUrl = new URL(path, TARGET_BASE);
        url.searchParams.forEach((value, name) => {
            if (name !== 'key') targetUrl.searchParams.append(name, value);
        });
        if (key) targetUrl.searchParams.append('key', key);

        // Prepare headers
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');

        // Prepare body
        let body = undefined;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            const text = await req.text();
            if (text) {
                body = text;
            }
        }

        const response = await fetch(targetUrl.toString(), {
            method: req.method,
            headers,
            body,
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error('Proxy Error:', error);
        return NextResponse.json({ error: 'Proxy Request Failed', details: error.message }, { status: 500 });
    }
}

export { handler as GET, handler as POST };
