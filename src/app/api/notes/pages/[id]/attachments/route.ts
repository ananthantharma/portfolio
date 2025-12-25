import {NextResponse} from 'next/server';

import dbConnect from '@/lib/dbConnect';
import Attachment from '@/models/Attachment';

interface RouteParams {
  params: {
    id: string; // pageId
  };
}

export async function GET(_req: Request, {params}: RouteParams) {
  try {
    await dbConnect();
    const {id} = params; // This 'id' is the pageId

    // Find all attachments for this page, but EXCLUDE the binary 'data' field
    const attachments = await Attachment.find({pageId: id}).select('-data').sort({createdAt: -1});

    return NextResponse.json({success: true, data: attachments});
  } catch (error) {
    console.error('Fetch attachments error:', error);
    return NextResponse.json({error: 'Failed to fetch attachments'}, {status: 500});
  }
}
