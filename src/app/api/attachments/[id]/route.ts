import {NextRequest, NextResponse} from 'next/server';

import {getFileStream} from '@/lib/gridfs';

export async function GET(_req: NextRequest, {params}: {params: {id: string}}) {
  try {
    const {id} = params;
    if (!id) {
      return new NextResponse('File ID required', {status: 400});
    }

    const stream = await getFileStream(id);

    // Return a response with the stream
    // Note: In Next 13 App Router, we can return a stream directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(stream as any, {
      headers: {
        // We rely on browser detection for content-type generally, or save it if needed.
        // GridFS stores it, we could fetch file metadata first if we really need exact type header,
        // but usually the stream works fine.
        'Content-Disposition': `inline; filename="attachment-${id}"`,
      },
    });
  } catch (error) {
    console.error('Error serving attachment:', error);
    return new NextResponse('File not found', {status: 404});
  }
}
