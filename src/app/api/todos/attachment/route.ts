import {getServerSession} from 'next-auth';
import {NextResponse} from 'next/server';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import ToDo from '@/models/ToDo';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const {searchParams} = new URL(request.url);
  const todoId = searchParams.get('todoId');
  const indexStr = searchParams.get('index');

  if (!todoId || !indexStr) {
    return NextResponse.json({error: 'Missing parameters'}, {status: 400});
  }

  const index = parseInt(indexStr, 10);
  if (isNaN(index)) {
    return NextResponse.json({error: 'Invalid index'}, {status: 400});
  }

  await dbConnect();

  try {
    // We need to fetch the specific attachment data.
    // Since we are excluding data in the main list, we must fetch it here.
    // We fetch only the attachment at the specific index if possible,
    // but Mongoose projection for array element is tricky with simple find.
    // Easier to fetch the document (with data) and extract.
    // Note: This effectively transfers the data from DB to Function, then to User.
    // This counts as Function Transfer, but it only happens ON CLICK, not polling.
    const todo = await ToDo.findOne({_id: todoId, userEmail: session.user.email});

    if (!todo) {
      return NextResponse.json({error: 'Not found'}, {status: 404});
    }

    if (!todo.attachments || !todo.attachments[index]) {
      return NextResponse.json({error: 'Attachment not found'}, {status: 404});
    }

    const attachment = todo.attachments[index];
    const base64Data = attachment.data;

    if (!base64Data) {
      // If it's a Drive file or has no data, we can't serve it directly as binary
      if (attachment.webViewLink) {
        return NextResponse.redirect(attachment.webViewLink);
      }
      return NextResponse.json({error: 'No content available'}, {status: 404});
    }

    // base64Data is "data:image/png;base64,....."
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.json({error: 'Invalid data format'}, {status: 500});
    }

    const type = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': type,
        'Content-Disposition': `attachment; filename="${attachment.name}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving attachment:', error);
    return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
  }
}
