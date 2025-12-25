import {NextResponse} from 'next/server';

import dbConnect from '@/lib/dbConnect';
import Attachment from '@/models/Attachment';

export async function POST(req: Request) {
  try {
    await dbConnect();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const pageId = formData.get('pageId') as string | null;

    if (!file || !pageId) {
      return NextResponse.json({error: 'File and Page ID are required'}, {status: 400});
    }

    // Next.js App Router limits body size (default 4MB).
    // Validation for size (skip if > 15MB to be safe for mongo document limit of 16MB)
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({error: 'File size exceeds 15MB limit'}, {status: 413});
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const attachment = await Attachment.create({
      filename: file.name,
      contentType: file.type,
      size: file.size,
      data: buffer,
      pageId,
    });

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
        },
      },
      {status: 201},
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({error: 'Failed to upload file'}, {status: 500});
  }
}
