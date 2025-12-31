import {NextResponse} from 'next/server';

import dbConnect from '@/lib/dbConnect';
import Attachment from '@/models/Attachment';

export async function POST(req: Request) {
  try {
    await dbConnect();

    const formData = await req.formData();
    const pageId = formData.get('pageId') as string | null;
    const storageType = (formData.get('storageType') as string) || 'local';

    if (!pageId) {
      return NextResponse.json({error: 'Page ID is required'}, {status: 400});
    }

    let attachment;

    if (storageType === 'drive') {
      // DRIVE UPLOAD (Metadata Only)
      const fileId = formData.get('fileId') as string;
      const webViewLink = formData.get('webViewLink') as string;
      const filename = formData.get('filename') as string;
      const contentType = formData.get('contentType') as string;
      const size = parseInt((formData.get('size') as string) || '0');

      if (!fileId || !webViewLink || !filename) {
        return NextResponse.json({error: 'Missing Drive metadata'}, {status: 400});
      }

      attachment = await Attachment.create({
        filename,
        contentType,
        size,
        pageId,
        storageType: 'drive',
        fileId,
        webViewLink,
      });
    } else {
      // LOCAL UPLOAD (Binary File)
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({error: 'File is required for local upload'}, {status: 400});
      }

      // Next.js App Router limits body size (default 4MB).
      // Validation for size (skip if > 15MB to be safe for mongo document limit of 16MB)
      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json({error: 'File size exceeds 15MB limit'}, {status: 413});
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      attachment = await Attachment.create({
        filename: file.name,
        contentType: file.type,
        size: file.size,
        data: buffer,
        pageId,
        storageType: 'local',
      });
    }

    // Return metadata only (exclude data)
    return NextResponse.json(
      {
        success: true,
        data: {
          _id: attachment._id,
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size,
          createdAt: attachment.createdAt,
          storageType: attachment.storageType,
          webViewLink: attachment.webViewLink,
        },
      },
      {status: 201},
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({error: 'Failed to upload file'}, {status: 500});
  }
}
