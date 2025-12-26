/* eslint-disable @typescript-eslint/no-explicit-any */
import { Readable } from 'stream';

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { getDriveClient } from '@/lib/googleDrive';

import { authOptions } from '../../../../pages/api/auth/[...nextauth]';

export const runtime = 'nodejs';

export async function GET(_req: Request) {
    try {
        const session: any = await getServerSession(authOptions);
        if (!session?.accessToken) {
            return NextResponse.json(
                { error: 'Unauthorized or missing Drive access. Please sign out and sign in again.' },
                { status: 401 },
            );
        }

        const drive = getDriveClient(session.accessToken);

        // List files: folders first, then files
        const response = await drive.files.list({
            pageSize: 50,
            fields:
                'nextPageToken, files(id, name, mimeType, webContentLink, webViewLink, iconLink, thumbnailLink, createdTime, size)',
            orderBy: 'folder,modifiedTime desc',
            q: 'trashed = false',
        });

        return NextResponse.json({
            success: true,
            files: response.data.files,
            nextPageToken: response.data.nextPageToken,
        });
    } catch (error: any) {
        console.error('Drive List Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to list files' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session: any = await getServerSession(authOptions);
        if (!session?.accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const drive = getDriveClient(session.accessToken);
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const parentId = formData.get('parentId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const stream = Readable.from(buffer);

        const fileMetadata: any = {
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
        };

        if (parentId) {
            fileMetadata.parents = [parentId];
        }

        const media = {
            mimeType: file.type || 'application/octet-stream',
            body: stream,
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, mimeType, webViewLink',
        });

        return NextResponse.json({ success: true, file: response.data });
    } catch (error: any) {
        console.error('Drive Upload Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to upload file' }, { status: 500 });
    }
}
