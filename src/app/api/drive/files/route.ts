/* eslint-disable @typescript-eslint/no-explicit-any */
import {Readable} from 'node:stream';

import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {ensureFolder, getDriveClient} from '@/lib/googleDrive';

import {authOptions} from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(_req: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.accessToken) {
      console.error('Drive API: No access token in session');
      return NextResponse.json(
        {error: 'Unauthorized or missing Drive access. Please sign out and sign in again.'},
        {status: 401},
      );
    }

    const {searchParams} = new URL(_req.url);
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
    return NextResponse.json(
      {
        error: error.message || 'Failed to list files',
        debug: error.response?.data,
      },
      {status: 500},
    );
  }
}

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const drive = getDriveClient(session.accessToken, session.refreshToken);
    console.log('Drive API Client (POST): Initialized');

    // DEBUG: Check Token Scopes
    try {
      const tokenInfo = await drive.about.get({fields: 'user'});
      console.log('Drive API Test (About): Success', tokenInfo.data.user?.emailAddress);
    } catch (e: any) {
      console.error('Drive API Test (About): Failed', e.message);
      // Determine if it's a scope issue
      if (e.code === 403) {
        console.error(
          'Drive API: 403 Forbidden - Likely missing scopes. Current scopes unknown (client-side), but API rejected request.',
        );
      }
    }

    // Determine content type to distinguish between JSON (initiate) and FormData (upload/chunk)
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // HANDLE INITIATE UPLOAD (Resumable)
      const body = await req.json();
      const {name, type, folderName, parentId, action} = body;

      if (action !== 'initiate') {
        return NextResponse.json({error: 'Invalid JSON action. Use action="initiate".'}, {status: 400});
      }

      console.log('Drive API: Initiating Resumable Upload for:', name);

      const fileMetadata: any = {
        name: name,
        mimeType: type || 'application/octet-stream',
      };

      if (folderName) {
        try {
          console.log('Drive API: Ensuring folder exists:', folderName);
          const folderId = await ensureFolder(drive, folderName);
          console.log('Drive API: Folder ensured, ID:', folderId);
          fileMetadata.parents = [folderId];
        } catch (folderError: any) {
          console.error('Drive API: Failed to ensure folder:', folderError);
          throw folderError;
        }
      } else if (parentId) {
        fileMetadata.parents = [parentId];
      }

      // Generate Resumable Session URI
      const initiateUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,webViewLink,webContentLink`;

      const initiateRes = await fetch(initiateUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': type || 'application/octet-stream',
        },
        body: JSON.stringify(fileMetadata),
      });

      if (!initiateRes.ok) {
        const errText = await initiateRes.text();
        console.error('Drive API: Failed to initiate resumable upload', initiateRes.status, errText);
        throw new Error(`Failed to initiate upload session: ${initiateRes.status} ${errText}`);
      }

      const uploadUrl = initiateRes.headers.get('Location');
      if (!uploadUrl) {
        throw new Error('Drive API: No Location header received for resumable upload');
      }

      console.log('Drive API: Session URI generated successfully');
      return NextResponse.json({success: true, uploadUrl});
    } else {
      // HANDLE FORMDATA: Direct Upload OR Chunk Proxy
      const formData = await req.formData();
      const action = formData.get('action') as string;

      if (action === 'upload_chunk') {
        // PROXY CHUNK TO GOOGLE
        const chunk = formData.get('chunk') as File;
        const uploadUrl = formData.get('uploadUrl') as string;
        const contentRange = formData.get('contentRange') as string;

        if (!chunk || !uploadUrl || !contentRange) {
          return NextResponse.json({error: 'Missing chunk, uploadUrl, or contentRange'}, {status: 400});
        }

        const buffer = Buffer.from(await chunk.arrayBuffer());

        const proxyRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': buffer.length.toString(),
            'Content-Range': contentRange,
          },
          body: buffer as any,
        });

        // Google returns 308 for Resume Incomplete (Success for chunk)
        // Google returns 200/201 for Completed
        if (proxyRes.status === 308) {
          return NextResponse.json({success: true, status: 308});
        } else if (proxyRes.ok) {
          // 200 or 201
          const fileData = await proxyRes.json();
          return NextResponse.json({success: true, status: 200, file: fileData});
        } else {
          const errText = await proxyRes.text();
          console.error('Drive API: Proxy Chunk Failed', proxyRes.status, errText);
          return NextResponse.json(
            {error: `Chunk upload failed: ${proxyRes.status}`, details: errText},
            {status: proxyRes.status},
          );
        }
      }

      // HANDLE LEGACY/SMALL FILE DIRECT UPLOAD (FormData)
      const file = formData.get('file') as File;
      const parentId = formData.get('parentId') as string;
      const folderName = formData.get('folderName') as string;

      if (!file) {
        return NextResponse.json({error: 'No file uploaded'}, {status: 400});
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);

      const fileMetadata: any = {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
      };

      if (folderName) {
        // Use ensureFolder logic if folderName is provided
        try {
          console.log('Drive API: Ensuring folder exists:', folderName);
          const folderId = await ensureFolder(drive, folderName);
          console.log('Drive API: Folder ensured, ID:', folderId);
          fileMetadata.parents = [folderId];
        } catch (folderError: any) {
          console.error('Drive API: Failed to ensure folder:', folderError);
          throw folderError;
        }
      } else if (parentId) {
        fileMetadata.parents = [parentId];
      }

      const media = {
        mimeType: file.type || 'application/octet-stream',
        body: stream,
      };

      console.log('Drive API: Starting file create/upload (Standard Mode)');
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, mimeType, webViewLink',
      });
      console.log('Drive API: File upload success:', response.data.id);

      return NextResponse.json({success: true, file: response.data});
    }
  } catch (error: any) {
    console.error('Drive Upload Error (Top Level):', error.message);
    if (error.response) {
      console.error('Drive Upload Error Response Data:', JSON.stringify(error.response.data, null, 2));
    }

    // Check for 403 Forbidden (insufficient permissions)
    if (error.code === 403 || error.status === 403 || error.response?.status === 403) {
      const reasons = error.errors?.map((e: any) => e.reason).join(', ') || 'Unknown';
      const message = error.message || 'Access Denied';

      return NextResponse.json(
        {
          error: `Google Drive permission denied (${reasons}). Please re-authenticate. Msg: ${message}`,
          code: 'DRIVE_ACCESS_DENIED',
          details: error.response?.data || error.message,
        },
        {status: 403},
      );
    }

    return NextResponse.json({error: error.message || 'Failed to upload file'}, {status: 500});
  }
}

export async function DELETE(req: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const {searchParams} = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({error: 'File ID is required'}, {status: 400});
    }

    const drive = getDriveClient(session.accessToken, session.refreshToken);
    console.log(`Drive API: Deleting file ${fileId}`);

    await drive.files.delete({
      fileId: fileId,
    });

    console.log(`Drive API: Successfully deleted file ${fileId}`);
    return NextResponse.json({success: true});
  } catch (error: any) {
    console.error('Drive Delete Error:', error);

    if (error.code === 403 || error.status === 403) {
      return NextResponse.json(
        {
          error: 'Permission denied. You may not have access to delete this file.',
          code: 'DRIVE_ACCESS_DENIED',
        },
        {status: 403},
      );
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to delete file',
        debug: error.response?.data,
      },
      {status: 500},
    );
  }
}
