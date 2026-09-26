/* eslint-disable simple-import-sort/imports */
import mongoose from 'mongoose';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import '@/models/Contact';
import NoteSection from '@/models/NoteSection';
import VendorFile from '@/models/VendorFile';
import VendorProfile, {IVendorProfile, VENDOR_DOC_TYPES, VENDOR_STATUSES} from '@/models/VendorProfile';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {sectionId: string};
}

const CONTACT_FIELDS = 'name company email phone position department type image';

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Existing subdocuments keep their ids; new ones get a fresh id from Mongoose
function keepId(id: unknown) {
  return mongoose.isValidObjectId(id) ? {_id: id} : {};
}

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

function referencedFileIds(profile: Pick<IVendorProfile, 'orgChart' | 'documents'>): string[] {
  return [
    profile.orgChart?.imageFileId,
    profile.orgChart?.flowPngFileId,
    ...(profile.documents || []).map(doc => doc.fileId),
  ]
    .filter(Boolean)
    .map(id => String(id));
}

async function authorize(sectionId: string) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  if (!mongoose.isValidObjectId(sectionId)) {
    return {error: NextResponse.json({error: 'Vendor not found'}, {status: 404})};
  }
  await dbConnect();
  const section = await NoteSection.findOne({_id: sectionId, userEmail}).select('_id');
  if (!section) return {error: NextResponse.json({error: 'Vendor not found'}, {status: 404})};
  return {userEmail};
}

async function loadProfile(userEmail: string, sectionId: string) {
  const profile = await VendorProfile.findOneAndUpdate(
    {userEmail, sectionId},
    {$setOnInsert: {status: 'Active'}}, // userEmail/sectionId come from the filter on insert
    {new: true, upsert: true},
  ).populate([
    {path: 'keyContacts.contactId', select: CONTACT_FIELDS, match: {userEmail}},
    {path: 'internalContacts.contactId', select: CONTACT_FIELDS, match: {userEmail}},
  ]);
  const data = profile.toObject();
  // Contacts deleted from the Contacts list drop out of key contacts
  data.keyContacts = data.keyContacts.filter(kc => kc.contactId);
  data.internalContacts = (data.internalContacts || []).filter(kc => kc.contactId);
  return data;
}

export async function GET(_req: Request, {params}: RouteParams) {
  const auth = await authorize(params.sectionId);
  if ('error' in auth) return auth.error;
  try {
    return NextResponse.json({success: true, data: await loadProfile(auth.userEmail, params.sectionId)});
  } catch (error) {
    console.error('Vendor profile GET error:', error);
    return NextResponse.json({error: 'Failed to load vendor'}, {status: 500});
  }
}

export async function PUT(req: Request, {params}: RouteParams) {
  const auth = await authorize(params.sectionId);
  if ('error' in auth) return auth.error;
  const {userEmail} = auth;
  try {
    const body = await req.json();
    const existing = await VendorProfile.findOne({userEmail, sectionId: params.sectionId});
    const profile = existing || new VendorProfile({userEmail, sectionId: params.sectionId});
    const before = referencedFileIds(profile);

    if (typeof body.summary === 'string') profile.summary = body.summary.slice(0, 200);
    if (VENDOR_STATUSES.includes(body.status)) profile.status = body.status;
    if (typeof body.website === 'string') profile.website = isHttpUrl(body.website) ? body.website : '';

    if (body.orgChart && typeof body.orgChart === 'object') {
      const oc = body.orgChart;
      const current = profile.orgChart || {view: 'image'};
      profile.orgChart = {
        view: oc.view === 'chart' || oc.view === 'image' ? oc.view : current.view,
        imageFileId: 'imageFileId' in oc ? oc.imageFileId || null : current.imageFileId,
        flowData: 'flowData' in oc ? oc.flowData || null : current.flowData,
        flowPngFileId: 'flowPngFileId' in oc ? oc.flowPngFileId || null : current.flowPngFileId,
        updatedAt: new Date(),
      };
    }

    for (const field of ['keyContacts', 'internalContacts'] as const) {
      if (!Array.isArray(body[field])) continue;
      profile.set(
        field,
        body[field]
          .filter((kc: {contactId?: unknown}) => mongoose.isValidObjectId(kc?.contactId))
          .map((kc: {contactId: string; role?: string}) => ({contactId: kc.contactId, role: String(kc.role || '').slice(0, 60)})),
      );
    }

    if (Array.isArray(body.links)) {
      profile.set(
        'links',
        body.links
          .filter((link: {title?: string; url?: string}) => link?.title?.trim() && isHttpUrl(link.url))
          .map((link: {_id?: string; title: string; url: string}) => ({
            ...keepId(link._id),
            title: link.title.trim(),
            url: link.url,
          })),
      );
    }

    if (Array.isArray(body.documents)) {
      profile.set(
        'documents',
        body.documents
          .filter((doc: {title?: string}) => doc?.title?.trim())
          .map((doc: Record<string, unknown>) => ({
            ...keepId(doc._id),
            title: String(doc.title).trim(),
            docType: VENDOR_DOC_TYPES.includes(doc.docType as never) ? doc.docType : 'Other',
            signedDate: toDateOrNull(doc.signedDate),
            expiryDate: toDateOrNull(doc.expiryDate),
            fileId: mongoose.isValidObjectId(doc.fileId) ? doc.fileId : null,
            fileName: String(doc.fileName || ''),
            contentType: String(doc.contentType || ''),
            size: Number(doc.size) || 0,
            url: isHttpUrl(doc.url) ? doc.url : '',
            createdAt: toDateOrNull(doc.createdAt) || new Date(),
          })),
      );
    }

    await profile.save();

    // Remove files this vendor no longer references (replaced org chart, deleted documents)
    const after = new Set(referencedFileIds(profile));
    const orphaned = before.filter(id => !after.has(id));
    if (orphaned.length) await VendorFile.deleteMany({_id: {$in: orphaned}, userEmail});

    return NextResponse.json({success: true, data: await loadProfile(userEmail, params.sectionId)});
  } catch (error) {
    console.error('Vendor profile PUT error:', error);
    return NextResponse.json({error: 'Failed to save vendor'}, {status: 400});
  }
}
