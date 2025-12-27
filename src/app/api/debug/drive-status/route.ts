/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { getDriveClient } from '@/lib/googleDrive';
import clientPromise from '@/lib/mongodb';

import { authOptions } from '../../../../pages/api/auth/[...nextauth]';

export const runtime = 'nodejs';

export async function GET(_req: Request) {
    try {
        const session: any = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ status: 'No Session' });
        }

        const client = await clientPromise;
        const db = client.db('qt_portfolio');
        const account = await db.collection('accounts').findOne({
            provider: 'google',
            userId: new (await import('mongodb')).ObjectId(session.user.id) // Assuming session has user.id, if not we might need to query by email
        });

        // Fallback if session.user.id is missing or structure is different
        let dbAccount = account;
        if (!account) {
            // Try finding user by email first
            const user = await db.collection('users').findOne({ email: session.user.email });
            if (user) {
                dbAccount = await db.collection('accounts').findOne({ userId: user._id, provider: 'google' });
            }
        }

        const debugInfo: any = {
            sessionEmail: session.user.email,
            dbAccountFound: !!dbAccount,
            hasAccessToken: !!dbAccount?.access_token,
            hasRefreshToken: !!dbAccount?.refresh_token,
            tokenExpiresAt: dbAccount?.expires_at,
            tokenScopeInDB: dbAccount?.scope,
        };

        // Test Drive API
        if (dbAccount?.access_token) {
            try {
                const drive = getDriveClient(dbAccount.access_token, dbAccount.refresh_token);
                const about = await drive.about.get({ fields: 'user' });
                debugInfo.driveApiStatus = 'Success';
                debugInfo.driveUser = about.data.user;
            } catch (error: any) {
                debugInfo.driveApiStatus = 'Failed';
                debugInfo.driveError = error.message;
                debugInfo.driveErrorCode = error.code;
                if (error.response) {
                    debugInfo.driveErrorResponse = error.response.data;
                }
            }
        }

        return NextResponse.json(debugInfo);

    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
