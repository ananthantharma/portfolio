
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const TARGET_BASE = 'https://generativelanguage.googleapis.com';

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
    try {
        const path = params.path.join('/');
        const url = new URL(req.url);
        const url = new URL(req.url);
        let key = url.searchParams.get('key');
        let keyFromHeader = req.headers.get('x-goog-api-key');

        let isManaged = false;
        if (key === 'MANAGED') isManaged = true;
        if (keyFromHeader === 'MANAGED') isManaged = true;

        // Handle Managed Key
        if (isManaged) {
            const session = await getServerSession(authOptions);
            if (!session || !(session.user as any).googleApiEnabled) {
                return NextResponse.json(
                    { error: 'Access Denied: You do not have permission to use the managed Google API key.' },
                    { status: 403 }
                );
            }

            const envKey = process.env.GOOGLE_API_KEY;
            if (!envKey) {
                console.error('Server Error: GOOGLE_API_KEY is not defined in environment variables.');
                return NextResponse.json(
                    { error: 'Server Configuration Error: Managed Google API Key is not configured.' },
                    { status: 500 }
                );
            }
            key = envKey.trim();
            console.log(`[Proxy] Using Managed Google Key. Length: ${key.length}, StartsWith: ${key.substring(0, 4)}***`);
        }

        // Construct target URL
        const targetUrl = new URL(path, TARGET_BASE);
        url.searchParams.forEach((value, name) => {
            if (value && name !== 'key') targetUrl.searchParams.append(name, value);
        });

        // Appending Resolved Key
        // If it was managed (or just passed normally), we prefer putting it in the Query Param for simplicity with Google API
        // UNLESS it was meant to be a header. But Google API accepts 'key' query param even if SDK sent header.
        // We will strip the 'x-goog-api-key' header later to avoid conflict/invalid value.
        if (key) {
            targetUrl.searchParams.set('key', key);
        }

        console.log(`Proxying request to: ${targetUrl.origin}${targetUrl.pathname}`); // Don't log full URL with key

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

        // Headers cleaning
        headers.delete('x-goog-api-key'); // Remove the header to rely on the query param we set
        headers.delete('host');

        const response = await fetch(targetUrl.toString(), {
            method: req.method,
            headers,
            body,
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Google API Proxy Error:', response.status, data);
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data, { status: response.status });
    } catch (error: any) {
        console.error('Proxy Error:', error);
        return NextResponse.json({ error: 'Proxy Request Failed', details: error.message }, { status: 500 });
    }
}

export { handler as GET, handler as POST };
