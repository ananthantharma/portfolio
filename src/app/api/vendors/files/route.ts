import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import VendorFile from '@/models/VendorFile';

export const dynamic = 'force-dynamic';

// Vercel rejects function request bodies over 4.5 MB, so cap below that.
// Larger agreements can be saved as a link instead.
const MAX_VENDOR_FILE_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({error: 'Choose a file to upload'}, {status: 400});
    if (file.size > MAX_VENDOR_FILE_BYTES) {
      return NextResponse.json({error: 'Files must be 4 MB or smaller. Save larger files as a link.'}, {status: 413});
    }

    await dbConnect();
    const saved = await VendorFile.create({
      userEmail,
      filename: file.name || 'file',
      contentType: file.type || 'application/octet-stream',
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()),
    });

    return NextResponse.json(
      {
        success: true,
        data: {_id: saved._id, filename: saved.filename, contentType: saved.contentType, size: saved.size},
      },
      {status: 201},
    );
  } catch (error) {
    console.error('Vendor file upload error:', error);
    return NextResponse.json({error: 'Upload failed'}, {status: 500});
  }
}
