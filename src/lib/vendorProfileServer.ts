import '@/models/Contact';

import mongoose from 'mongoose';
import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';

import {authOptions} from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import NoteSection from '@/models/NoteSection';
import VendorProfile, {
  ATTENTION_SEVERITIES,
  ATTENTION_STATUSES,
  ATTENTION_TYPES,
  DECISION_STATUSES,
  IProjectAttention,
  IProjectDecision,
} from '@/models/VendorProfile';

// Shared by the vendor/project profile routes (profile, decisions, attention, activity, visit, snapshot)

const CONTACT_FIELDS = 'name company email phone position department type image';

export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Existing subdocuments keep their ids; new ones get a fresh id from Mongoose
export function keepId(id: unknown) {
  return mongoose.isValidObjectId(id) ? {_id: id} : {};
}

export function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const pick = <T extends readonly string[]>(list: T, value: unknown, fallback: T[number]): T[number] =>
  list.includes(value as T[number]) ? (value as T[number]) : fallback;

/** Signed-in user who owns the section, or an error response. */
export async function authorizeSection(sectionId: string) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) return {error: NextResponse.json({error: 'Unauthorized'}, {status: 401})};
  if (!mongoose.isValidObjectId(sectionId)) {
    return {error: NextResponse.json({error: 'Not found'}, {status: 404})};
  }
  await dbConnect();
  const section = await NoteSection.findOne({_id: sectionId, userEmail}).select('_id name');
  if (!section) return {error: NextResponse.json({error: 'Not found'}, {status: 404})};
  return {userEmail, sectionName: section.name as string};
}

/** The profile with contacts populated; created on first use. */
export async function loadProfile(userEmail: string, sectionId: string) {
  const profile = await VendorProfile.findOneAndUpdate(
    {userEmail, sectionId},
    {$setOnInsert: {status: 'Active'}}, // userEmail/sectionId come from the filter on insert
    {new: true, upsert: true},
  ).populate([
    {path: 'keyContacts.contactId', select: CONTACT_FIELDS, match: {userEmail}},
    {path: 'internalContacts.contactId', select: CONTACT_FIELDS, match: {userEmail}},
  ]);
  const data = profile.toObject();
  // Contacts deleted from the Contacts list drop out of the page
  data.keyContacts = data.keyContacts.filter(kc => kc.contactId);
  data.internalContacts = (data.internalContacts || []).filter(kc => kc.contactId);
  delete (data as {lastVisitedAt?: unknown}).lastVisitedAt;
  return data;
}

export function sanitizeDecision(input: Record<string, unknown>, current?: Partial<IProjectDecision>): IProjectDecision {
  const now = new Date();
  return {
    title: text(input.title ?? current?.title, 200),
    details: text(input.details ?? current?.details, 6000),
    decisionDate: 'decisionDate' in input ? toDateOrNull(input.decisionDate) : current?.decisionDate ?? now,
    reason: text(input.reason ?? current?.reason, 4000),
    status: pick(DECISION_STATUSES, input.status ?? current?.status, 'Active'),
    noteId: 'noteId' in input ? (input.noteId ? String(input.noteId) : null) : current?.noteId ?? null,
    documentId: 'documentId' in input ? (input.documentId ? String(input.documentId) : null) : current?.documentId ?? null,
    pinned: 'pinned' in input ? !!input.pinned : !!current?.pinned,
    createdAt: current?.createdAt || now,
    updatedAt: now,
  };
}

export function sanitizeAttention(input: Record<string, unknown>, current?: Partial<IProjectAttention>): IProjectAttention {
  const now = new Date();
  const status = pick(ATTENTION_STATUSES, input.status ?? current?.status, 'Open');
  const wasResolved = current?.status === 'Resolved';
  return {
    title: text(input.title ?? current?.title, 200),
    type: pick(ATTENTION_TYPES, input.type ?? current?.type, 'Risk'),
    description: text(input.description ?? current?.description, 4000),
    severity: pick(ATTENTION_SEVERITIES, input.severity ?? current?.severity, 'Medium'),
    status,
    dueDate: 'dueDate' in input ? toDateOrNull(input.dueDate) : current?.dueDate ?? null,
    resolution: text(input.resolution ?? current?.resolution, 4000),
    createdAt: current?.createdAt || now,
    updatedAt: now,
    // Resolved date is set when an item becomes resolved and cleared if it's reopened
    resolvedAt: status === 'Resolved' ? (wasResolved ? current?.resolvedAt || now : now) : null,
  };
}
