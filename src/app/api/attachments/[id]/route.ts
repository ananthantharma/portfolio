import {NextResponse} from 'next/server';

import dbConnect from '@/lib/dbConnect';
import Attachment from '@/models/Attachment';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(_req: Request, {params}: RouteParams) {
  try {
    await dbConnect();
    const {id} = params;

    const attachment = await Attachment.findById(id);

    if (!attachment) {
      return NextResponse.json({error: 'Attachment not found'}, {status: 404});
    }

    // We create a new Response (compatible with standard Web API)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Response(attachment.data as any, {
      headers: {
        'Content-Type': attachment.contentType,
        'Content-Disposition': `inline; filename="${attachment.filename}"`,
        'Content-Length': attachment.size.toString(),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({error: 'Failed to download file'}, {status: 500});
  }
}

export async function DELETE(_req: Request, {params}: RouteParams) {
  try {
    await dbConnect();
    const {id} = params;

    const result = await Attachment.findByIdAndDelete(id);

    if (!result) {
      return NextResponse.json({error: 'Attachment not found'}, {status: 404});
    }

    return NextResponse.json({success: true, message: 'Attachment deleted'});
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({error: 'Failed to delete file'}, {status: 500});
  }
}
