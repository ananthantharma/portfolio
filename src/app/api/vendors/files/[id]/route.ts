import mongoose from 'mongoose';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import VendorFile from '@/models/VendorFile';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {id: string};
}

// Only types the browser can show without running scripts are served inline
const INLINE_TYPES = /^(image\/(png|jpe?g|gif|webp)|application\/pdf)$/i;

async function owner() {
  const session = await getServerSession(authOptions);
  return session?.user?.email || null;
}

export async function GET(req: Request, {params}: RouteParams) {
  const userEmail = await owner();
  if (!userEmail) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({error: 'File not found'}, {status: 404});

  await dbConnect();
  const file = await VendorFile.findOne({_id: params.id, userEmail});
  if (!file) return NextResponse.json({error: 'File not found'}, {status: 404});

  const download = new URL(req.url).searchParams.get('download') === '1';
  const disposition = !download && INLINE_TYPES.test(file.contentType) ? 'inline' : 'attachment';
  const safeName = file.filename.replace(/["\\\r\n]/g, '_');

  return new Response(new Uint8Array(file.data), {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
      'Content-Length': String(file.size),
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function DELETE(_req: Request, {params}: RouteParams) {
  const userEmail = await owner();
  if (!userEmail) return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({error: 'File not found'}, {status: 404});

  await dbConnect();
  await VendorFile.deleteOne({_id: params.id, userEmail});
  return NextResponse.json({success: true});
}
