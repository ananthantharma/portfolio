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
    const folderId = searchParams.get('folderId') || 'root';

    const drive = await getDriveClient(session.accessToken);
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, iconLink, webViewLink, size, modifiedTime, thumbnailLink)',
      orderBy: 'folder, name',
    });

    return NextResponse.json({files: response.data.files});
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
