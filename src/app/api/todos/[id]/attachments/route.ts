/* eslint-disable @typescript-eslint/no-explicit-any */
import {Readable} from 'node:stream';

import mongoose from 'mongoose';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import {getDriveClient} from '@/lib/googleDrive';
import ToDo, {VENDOR_POPULATE} from '@/models/ToDo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILES = 40;
const fail = (error: string, status: number) => NextResponse.json({success: false, error}, {status});

/** The task as the lists expect it: no embedded file data, names filled in for its note and vendor. */
const fresh = (id: string, email: string) =>
  ToDo.findOne({_id: id, userEmail: email}).select('-attachments.data').populate({path: 'sourcePageId', select: 'title'}).populate(VENDOR_POPULATE(email));

/** POST: record a file that was just uploaded to Google Drive on this task. */
export async function POST(req: Request, {params}: {params: {id: string}}) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return fail('Unauthorized', 401);
    if (!mongoose.isValidObjectId(params.id)) return fail('Task not found', 404);
    const body = await req.json().catch(() => null);
    const fileId = typeof body?.fileId === 'string' ? body.fileId.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 300) : '';
    if (!/^[\w-]{5,200}$/.test(fileId) || !name) return fail('That file could not be attached.', 400);
    const link = typeof body?.webViewLink === 'string' && /^https:\/\/(drive|docs)\.google\.com\//.test(body.webViewLink) ? body.webViewLink : `https://drive.google.com/file/d/${fileId}/view`;

    await dbConnect();
    const todo = await ToDo.findOne({_id: params.id, userEmail: email}).select('attachments.fileId');
    if (!todo) return fail('Task not found', 404);
    const existing = (todo.attachments || []) as any[];
    if (existing.length >= MAX_FILES) return fail(`A task can hold up to ${MAX_FILES} files.`, 400);
    if (!existing.some(a => a.fileId === fileId)) {
      await ToDo.updateOne(
        {_id: params.id, userEmail: email},
        {$push: {attachments: {name, type: typeof body?.type === 'string' && body.type ? body.type.slice(0, 150) : 'application/octet-stream', size: Math.max(0, Number(body?.size) || 0), fileId, webViewLink: link, storageType: 'drive'}}},
      );
    }
    return NextResponse.json({success: true, data: await fresh(params.id, email)});
  } catch (error) {
    console.error('Attach file error:', error);
    return fail('Could not attach the file.', 500);
  }
}

/** DELETE ?attachmentId=: take a file off the task; a Drive file also goes to the Drive trash (recoverable there). */
export async function DELETE(req: Request, {params}: {params: {id: string}}) {
  try {
    const session: any = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return fail('Unauthorized', 401);
    const attachmentId = new URL(req.url).searchParams.get('attachmentId') || '';
    if (!mongoose.isValidObjectId(params.id) || !mongoose.isValidObjectId(attachmentId)) return fail('File not found', 404);

    await dbConnect();
    const todo = await ToDo.findOne({_id: params.id, userEmail: email}).select('attachments._id attachments.fileId attachments.storageType');
    if (!todo) return fail('Task not found', 404);
    const att = ((todo.attachments || []) as any[]).find(a => String(a._id) === attachmentId);
    if (!att) return fail('File not found', 404);
    await ToDo.updateOne({_id: params.id, userEmail: email}, {$pull: {attachments: {_id: new mongoose.Types.ObjectId(attachmentId)}}});

    let trashed = false;
    if (att.storageType === 'drive' && att.fileId && session.accessToken) {
      try {
        await getDriveClient(session.accessToken, session.refreshToken).files.update({fileId: att.fileId, requestBody: {trashed: true}});
        trashed = true;
      } catch (driveError) {
        // The link is gone from the task either way; the file just stays in Drive
        console.error('Could not move the Drive file to trash:', driveError);
      }
    }
    return NextResponse.json({success: true, data: await fresh(params.id, email), trashed});
  } catch (error) {
    console.error('Remove file error:', error);
    return fail('Could not remove the file.', 500);
  }
}

const disposition = (name: string, inline: boolean) => {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '');
  return `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
};

/** GET ?attachmentId=[&inline=1]: the file itself, fetched from Google Drive (or from the task for older embedded files). */
export async function GET(req: Request, {params}: {params: {id: string}}) {
  try {
    const session: any = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) return fail('Unauthorized', 401);
    const search = new URL(req.url).searchParams;
    const attachmentId = search.get('attachmentId') || '';
    const inline = search.get('inline') === '1';
    if (!mongoose.isValidObjectId(params.id) || !mongoose.isValidObjectId(attachmentId)) return fail('File not found', 404);

    await dbConnect();
    const todo = await ToDo.findOne({_id: params.id, userEmail: email}).select('attachments');
    const att = ((todo?.attachments || []) as any[]).find(a => String(a._id) === attachmentId);
    if (!att) return fail('File not found', 404);

    if (att.storageType === 'drive' && att.fileId) {
      if (!session.accessToken) return att.webViewLink ? NextResponse.redirect(att.webViewLink) : fail('Google Drive is not connected. Sign in with Google to open this file.', 401);
      try {
        const res = await getDriveClient(session.accessToken, session.refreshToken).files.get({fileId: att.fileId, alt: 'media'}, {responseType: 'stream'});
        const headers: Record<string, string> = {'Content-Type': att.type || 'application/octet-stream', 'Content-Disposition': disposition(att.name, inline), 'Cache-Control': 'private, max-age=300'};
        const length = (res.headers as any)?.['content-length'];
        if (length) headers['Content-Length'] = String(length);
        return new Response(Readable.toWeb(res.data as Readable) as unknown as ReadableStream, {headers});
      } catch (driveError) {
        console.error('Drive download failed:', driveError);
        // Still reachable in Drive itself
        return att.webViewLink ? NextResponse.redirect(att.webViewLink) : fail('Could not get this file from Google Drive.', 502);
      }
    }

    const match = typeof att.data === 'string' ? att.data.match(/^data:([^;]+);base64,(.+)$/) : null;
    if (!match) return att.webViewLink ? NextResponse.redirect(att.webViewLink) : fail('This file has no content.', 404);
    const buffer = Buffer.from(match[2], 'base64');
    return new NextResponse(buffer as unknown as BodyInit, {headers: {'Content-Type': match[1], 'Content-Disposition': disposition(att.name, inline), 'Content-Length': String(buffer.length)}});
  } catch (error) {
    console.error('Open file error:', error);
    return fail('Could not open the file.', 500);
  }
}
