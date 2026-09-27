import mongoose from 'mongoose';
import {NextResponse} from 'next/server';

import {ActivityEntry, isProjectSection, logActivity} from '@/lib/projectActivity';
import {authorizeSection, isHttpUrl, keepId, loadProfile, toDateOrNull} from '@/lib/vendorProfileServer';
import VendorFile from '@/models/VendorFile';
import VendorProfile, {IVendorProfile, PROJECT_HEALTH, VENDOR_DOC_TYPES, VENDOR_STATUSES} from '@/models/VendorProfile';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {sectionId: string};
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

const shortDate = (d?: Date | null) =>
  d ? new Date(d).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'}) : 'none';

export async function GET(_req: Request, {params}: RouteParams) {
  const auth = await authorizeSection(params.sectionId);
  if ('error' in auth) return auth.error;
  try {
    return NextResponse.json({success: true, data: await loadProfile(auth.userEmail, params.sectionId)});
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({error: 'Failed to load'}, {status: 500});
  }
}

export async function PUT(req: Request, {params}: RouteParams) {
  const auth = await authorizeSection(params.sectionId);
  if ('error' in auth) return auth.error;
  const {userEmail} = auth;
  try {
    const body = await req.json();
    const existing = await VendorProfile.findOne({userEmail, sectionId: params.sectionId});
    const profile = existing || new VendorProfile({userEmail, sectionId: params.sectionId});
    const before = referencedFileIds(profile);
    const prev = {
      status: profile.status,
      health: profile.health,
      phase: profile.phase,
      targetDate: profile.targetDate,
      docs: new Map((profile.documents || []).map(d => [String(d._id), d.title])),
    };

    if (typeof body.summary === 'string') profile.summary = body.summary.slice(0, 400);
    if (VENDOR_STATUSES.includes(body.status)) profile.status = body.status;
    if (typeof body.website === 'string') profile.website = isHttpUrl(body.website) ? body.website : '';

    // Project header fields
    if (typeof body.phase === 'string') profile.phase = body.phase.trim().slice(0, 40);
    if (PROJECT_HEALTH.includes(body.health)) profile.health = body.health;
    if ('startDate' in body) profile.startDate = toDateOrNull(body.startDate);
    if ('targetDate' in body) profile.targetDate = toDateOrNull(body.targetDate);
    if (typeof body.owner === 'string') profile.owner = body.owner.trim().slice(0, 80);
    if (typeof body.currentFocus === 'string') profile.currentFocus = body.currentFocus.trim().slice(0, 240);
    if (body.brief && typeof body.brief.text === 'string') {
      profile.brief = {text: body.brief.text.trim().slice(0, 3000), source: 'manual', updatedAt: new Date()};
    }

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
          .map((kc: {contactId: string; role?: string; note?: string}) => ({
            contactId: kc.contactId,
            role: String(kc.role || '').slice(0, 60),
            note: String(kc.note || '').slice(0, 2000),
          })),
      );
    }

    if (Array.isArray(body.links)) {
      profile.set(
        'links',
        body.links
          .filter((link: {title?: string; url?: string}) => link?.title?.trim() && isHttpUrl(link.url))
          .map((link: {_id?: string; title: string; url: string; pinned?: boolean}) => ({
            ...keepId(link._id),
            title: link.title.trim(),
            url: link.url,
            pinned: !!link.pinned,
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
            notes: String(doc.notes || '').slice(0, 4000),
            pinned: !!doc.pinned,
            createdAt: toDateOrNull(doc.createdAt) || new Date(),
          })),
      );
    }

    await profile.save();

    // Remove files this page no longer references (replaced org chart, deleted documents)
    const after = new Set(referencedFileIds(profile));
    const orphaned = before.filter(id => !after.has(id));
    if (orphaned.length) await VendorFile.deleteMany({_id: {$in: orphaned}, userEmail});

    // Project history: status, health, phase, target date, and documents
    if (await isProjectSection(userEmail, params.sectionId)) {
      const entries: ActivityEntry[] = [];
      if (prev.status !== profile.status)
        entries.push({type: 'project', action: 'status', label: 'Project status changed', title: `${prev.status} → ${profile.status}`});
      if (prev.health !== profile.health)
        entries.push({type: 'project', action: 'health', label: 'Project health changed', title: `${prev.health} → ${profile.health}`});
      if ((prev.phase || '') !== (profile.phase || ''))
        entries.push({type: 'project', action: 'phase', label: 'Project phase changed', title: `${prev.phase || 'none'} → ${profile.phase || 'none'}`});
      if (String(prev.targetDate || '') !== String(profile.targetDate || ''))
        entries.push({type: 'project', action: 'target', label: 'Target date changed', title: `${shortDate(prev.targetDate)} → ${shortDate(profile.targetDate)}`});
      const now = new Set((profile.documents || []).map(d => String(d._id)));
      (profile.documents || []).forEach(d => {
        if (!prev.docs.has(String(d._id)))
          entries.push({type: 'document', action: 'added', label: 'Document added', title: d.title, refId: String(d._id)});
      });
      prev.docs.forEach((title, id) => {
        if (!now.has(id)) entries.push({type: 'document', action: 'removed', label: 'Document removed', title, refId: id});
      });
      await logActivity(userEmail, params.sectionId, entries, {knownProject: true});
    }

    return NextResponse.json({success: true, data: await loadProfile(userEmail, params.sectionId)});
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json({error: 'Failed to save'}, {status: 400});
  }
}
