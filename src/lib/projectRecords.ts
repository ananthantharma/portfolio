import mongoose from 'mongoose';
import {NextResponse} from 'next/server';

import {ActivityEntry, logActivity} from '@/lib/projectActivity';
import {authorizeSection, loadProfile, sanitizeAttention, sanitizeDecision} from '@/lib/vendorProfileServer';
import VendorProfile, {IProjectAttention, IProjectDecision} from '@/models/VendorProfile';

// Create / update / delete for a project's decisions and attention items. Each change is a
// single atomic update of one item (no whole-list rewrites), and meaningful ones are logged.

export type RecordCollection = 'decisions' | 'attention';


const sanitize = (coll: RecordCollection, input: Record<string, unknown>, current?: object) =>
  coll === 'decisions'
    ? sanitizeDecision(input, current as Partial<IProjectDecision>)
    : sanitizeAttention(input, current as Partial<IProjectAttention>);

const kindLabel = (coll: RecordCollection, item: IProjectDecision | IProjectAttention) =>
  coll === 'decisions' ? 'Decision' : (item as IProjectAttention).type;

export async function createRecord(req: Request, sectionId: string, coll: RecordCollection) {
  const auth = await authorizeSection(sectionId);
  if ('error' in auth) return auth.error;
  try {
    const item = sanitize(coll, await req.json());
    if (!item.title) return NextResponse.json({error: 'Give it a title.'}, {status: 400});
    const _id = new mongoose.Types.ObjectId();
    await VendorProfile.updateOne(
      {userEmail: auth.userEmail, sectionId},
      {$push: {[coll]: {...item, _id}}, $setOnInsert: {status: 'Active'}},
      {upsert: true},
    );
    await logActivity(auth.userEmail, sectionId, {
      type: coll === 'decisions' ? 'decision' : 'attention',
      action: 'created',
      label: coll === 'decisions' ? 'Decision created' : `${kindLabel(coll, item)} added`,
      title: item.title,
      refId: String(_id),
    });
    return NextResponse.json({success: true, data: await loadProfile(auth.userEmail, sectionId), id: String(_id)}, {status: 201});
  } catch (error) {
    console.error(`Create ${coll} error:`, error);
    return NextResponse.json({error: 'Could not save.'}, {status: 400});
  }
}

export async function updateRecord(req: Request, sectionId: string, coll: RecordCollection, itemId: string) {
  const auth = await authorizeSection(sectionId);
  if ('error' in auth) return auth.error;
  if (!mongoose.isValidObjectId(itemId)) return NextResponse.json({error: 'Not found'}, {status: 404});
  try {
    const profile = await VendorProfile.findOne({userEmail: auth.userEmail, sectionId}).select(coll).lean();
    const current = (profile?.[coll] as (IProjectDecision | IProjectAttention)[] | undefined)?.find(
      i => String(i._id) === itemId,
    );
    if (!current) return NextResponse.json({error: 'Not found'}, {status: 404});
    const item = sanitize(coll, await req.json(), current);
    if (!item.title) return NextResponse.json({error: 'Give it a title.'}, {status: 400});
    await VendorProfile.updateOne(
      {userEmail: auth.userEmail, sectionId, [`${coll}._id`]: itemId},
      {$set: {[`${coll}.$`]: {...item, _id: current._id}}},
    );

    const entries: ActivityEntry[] = [];
    const type = coll === 'decisions' ? 'decision' : 'attention';
    const label = kindLabel(coll, item);
    if (current.status !== item.status) {
      const verb =
        coll === 'attention'
          ? item.status === 'Resolved'
            ? 'resolved'
            : current.status === 'Resolved'
            ? 'reopened'
            : `moved to ${item.status.toLowerCase()}`
          : item.status === 'Active'
          ? 'reinstated'
          : item.status.toLowerCase();
      entries.push({type, action: item.status.toLowerCase(), label: `${label} ${verb}`, title: item.title, refId: itemId});
    }
    if (coll === 'attention') {
      const before = current as IProjectAttention;
      const now = item as IProjectAttention;
      if (before.severity !== now.severity)
        entries.push({type, action: 'severity', label: `${label} severity changed`, title: `${now.title} (${before.severity} → ${now.severity})`, refId: itemId});
    }
    await logActivity(auth.userEmail, sectionId, entries);
    return NextResponse.json({success: true, data: await loadProfile(auth.userEmail, sectionId)});
  } catch (error) {
    console.error(`Update ${coll} error:`, error);
    return NextResponse.json({error: 'Could not save.'}, {status: 400});
  }
}

export async function deleteRecord(sectionId: string, coll: RecordCollection, itemId: string) {
  const auth = await authorizeSection(sectionId);
  if ('error' in auth) return auth.error;
  if (!mongoose.isValidObjectId(itemId)) return NextResponse.json({error: 'Not found'}, {status: 404});
  try {
    const profile = await VendorProfile.findOne({userEmail: auth.userEmail, sectionId}).select(coll).lean();
    const current = (profile?.[coll] as (IProjectDecision | IProjectAttention)[] | undefined)?.find(
      i => String(i._id) === itemId,
    );
    if (!current) return NextResponse.json({error: 'Not found'}, {status: 404});
    await VendorProfile.updateOne({userEmail: auth.userEmail, sectionId}, {$pull: {[coll]: {_id: current._id}}});
    await logActivity(auth.userEmail, sectionId, {
      type: coll === 'decisions' ? 'decision' : 'attention',
      action: 'deleted',
      label: `${kindLabel(coll, current)} deleted`,
      title: current.title,
      refId: itemId,
    });
    return NextResponse.json({success: true, data: await loadProfile(auth.userEmail, sectionId)});
  } catch (error) {
    console.error(`Delete ${coll} error:`, error);
    return NextResponse.json({error: 'Could not delete.'}, {status: 400});
  }
}
