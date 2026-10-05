import {google} from 'googleapis';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import {Readable} from 'stream';

/**
 * Helper to get Google Drive client
 */
async function getDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({access_token: accessToken});
  return google.drive({version: 'v3', auth});
}

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session || !session.accessToken) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const {searchParams} = new URL(req.url);
    let folderId = searchParams.get('folderId') || 'root';
    // Drive ids are URL-safe base64; anything else would end up inside the query string
    if (folderId !== 'root' && !/^[A-Za-z0-9_-]+$/.test(folderId)) {
      return NextResponse.json({error: 'Invalid folder'}, {status: 400});
    }
    const pageToken = searchParams.get('pageToken') || undefined;

    const drive = await getDriveClient(session.accessToken);

    // ?start=Temp opens a folder of that name at the top of My Drive (falls back to My Drive)
    const start = searchParams.get('start');
    let folder: {id: string; name: string} | null = null;
    if (start) {
      const safeName = start.slice(0, 200).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const found = await drive.files.list({
        q: `'root' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 1,
      });
      const match = found.data.files?.[0];
      if (match?.id) {
        folderId = match.id;
        folder = {id: match.id, name: match.name || start};
      }
    }

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      // webContentLink / exportLinks let the browser download straight from Google (no server size limit)
      fields: 'nextPageToken, files(id, name, mimeType, iconLink, webViewLink, webContentLink, exportLinks, size, modifiedTime, thumbnailLink)',
      orderBy: 'folder, name',
      pageSize: 200,
      pageToken,
    });

    return NextResponse.json({
      files: response.data.files,
      nextPageToken: response.data.nextPageToken || null,
      folder,
      startMissing: !!start && !folder,
    });
  } catch (error: any) {
    console.error('Drive API Error:', error);
    return NextResponse.json({error: error.message}, {status: 500});
  }
}

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session || !session.accessToken) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const formData = await req.formData();
    const file = formData.get('file') as Blob;
    const parentId = (formData.get('parentId') as string) || 'root';

    if (!file) {
      return NextResponse.json({error: 'No file provided'}, {status: 400});
    }

    const drive = await getDriveClient(session.accessToken);

    // Convert Blob to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [parentId],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: 'id, name',
    });

    return NextResponse.json({success: true, file: response.data});
  } catch (error: any) {
    console.error('Drive Upload Error:', error);
    return NextResponse.json({error: error.message}, {status: 500});
  }
}

export async function DELETE(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as any;
    if (!session || !session.accessToken) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const {searchParams} = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({error: 'No fileId provided'}, {status: 400});
    }

    const drive = await getDriveClient(session.accessToken);
    await drive.files.delete({fileId});

    return NextResponse.json({success: true});
  } catch (error: any) {
    console.error('Drive Delete Error:', error);
    return NextResponse.json({error: error.message}, {status: 500});
  }
}
