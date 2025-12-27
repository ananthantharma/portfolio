/* eslint-disable @typescript-eslint/no-explicit-any */
import { Readable } from 'node:stream';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { ensureFolder, getDriveClient } from '@/lib/googleDrive';

import { authOptions } from '../../../../pages/api/auth/[...nextauth]';

export const runtime = 'nodejs';

export async function GET(_req: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.accessToken) {
      console.error('Drive API: No access token in session');
      return NextResponse.json(
        { error: 'Unauthorized or missing Drive access. Please sign out and sign in again.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(_req.url);
    const folderId = searchParams.get('folderId') || 'root';

    const drive = getDriveClient(session.accessToken, session.refreshToken);
    console.log(`Drive API Client (GET): Listing folder ${folderId}`);

    // List files: folders first, then files
    const response = await drive.files.list({
      pageSize: 50,
      fields:
        'nextPageToken, files(id, name, mimeType, webContentLink, webViewLink, iconLink, thumbnailLink, createdTime, size)',
      orderBy: 'folder,modifiedTime desc',
      q: `'${folderId}' in parents and trashed = false`,
    });

    return NextResponse.json({
      success: true,
      files: response.data.files,
      nextPageToken: response.data.nextPageToken,
    });
  } catch (error: any) {
    console.error('Drive List Error:', error);
    if (error.response) {
      console.error('Drive API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    return NextResponse.json({
      error: error.message || 'Failed to list files',
      debug: error.response?.data
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const drive = getDriveClient(session.accessToken, session.refreshToken);
    console.log('Drive API Client (POST): Initialized');

    // DEBUG: Check Token Scopes
    try {
      const tokenInfo = await drive.about.get({ fields: 'user' });
      console.log('Drive API Test (About): Success', tokenInfo.data.user?.emailAddress);
    } catch (e: any) {
      console.error('Drive API Test (About): Failed', e.message);
      // Determine if it's a scope issue
      if (e.code === 403) {
        console.error('Drive API: 403 Forbidden - Likely missing scopes. Current scopes unknown (client-side), but API rejected request.');
      }
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const parentId = formData.get('parentId') as string;
    const folderName = formData.get('folderName') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    const fileMetadata: any = {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
    };

    if (folderName) {
      // Use ensureFolder logic if folderName is provided
      const folderId = await ensureFolder(drive, folderName);
      fileMetadata.parents = [folderId];
    } else if (parentId) {
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
    if (error.response) {
      console.error('Drive Upload Error Response:', JSON.stringify(error.response.data, null, 2));
    }

    // Check for 403 Forbidden (insufficient permissions)
    if (error.code === 403 || error.status === 403 || error.response?.status === 403) {
      return NextResponse.json({
        error: 'Google Drive permission denied. Please re-authenticate.',
        code: 'DRIVE_ACCESS_DENIED',
        details: error.message
      }, { status: 403 });
    }

    return NextResponse.json({ error: error.message || 'Failed to upload file' }, { status: 500 });
  }
}
