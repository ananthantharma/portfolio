import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
    const uri = process.env.MONGODB_URI;
    if (!uri) return NextResponse.json({ error: 'No URI' }, { status: 500 });

    const results: { name: string; status: string; error?: string }[] = [];

    // Test 1: Trust URI (Standard)
    try {
        const client1 = new MongoClient(uri, {
            tls: true,
            tlsAllowInvalidCertificates: true
        });
        await client1.connect();
        await client1.db('qt_portfolio').command({ ping: 1 });
        await client1.close();
        results.push({ name: 'Standard URI', status: 'Success' });
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        results.push({ name: 'Standard URI', status: 'Failed', error: message });
    }

    // Test 2: AuthSource = admin
    try {
        const uri2 = uri.replace('authSource=$external', 'authSource=admin');
        const client2 = new MongoClient(uri2, {
            tls: true,
            tlsAllowInvalidCertificates: true
        });
        await client2.connect();
        await client2.db('qt_portfolio').command({ ping: 1 });
        await client2.close();
        results.push({ name: 'AuthSource Admin', status: 'Success' });
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        results.push({ name: 'AuthSource Admin', status: 'Failed', error: message });
    }

    // Test 3: Manual Decode
    try {
        const match = uri.match(/mongodb:\/\/([^:]+):([^@]+)@/);
        if (match) {
            const username = decodeURIComponent(match[1]);
            const password = decodeURIComponent(match[2]);
            const cleanUri = uri.replace(`${match[1]}:${match[2]}@`, ''); // Strip creds

            const client3 = new MongoClient(cleanUri, {
                auth: { username, password },
                authMechanism: 'PLAIN',
                authSource: '$external',
                tls: true,
                tlsAllowInvalidCertificates: true
            });
            await client3.connect();
            await client3.db('qt_portfolio').command({ ping: 1 });
            await client3.close();
            results.push({ name: 'Manual Decode', status: 'Success' });
        } else {
            results.push({ name: 'Manual Decode', status: 'Skipped - No match' });
        }
    } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        results.push({ name: 'Manual Decode', status: 'Failed', error: message });
    }

    return NextResponse.json({
        results,
        envUriLength: uri.length,
        timestamp: new Date().toISOString()
    });
}
