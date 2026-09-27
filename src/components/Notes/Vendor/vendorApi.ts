export const VENDOR_STATUSES = ['Active', 'Onboarding', 'Under review', 'Inactive'] as const;
export const PROJECT_STATUSES = ['Planning', 'Active', 'On hold', 'Complete'] as const;
export const VENDOR_DOC_TYPES = ['MSA', 'DPA', 'SOW', 'NDA', 'Order form', 'Other'] as const;
export const PROJECT_DOC_TYPES = [
  'Agreement',
  'Contract',
  'SOW',
  'Presentation',
  'Report',
  'Analysis',
  'Requirements',
  'Architecture',
  'Commercial',
  'Other',
] as const;
export const PROJECT_HEALTH = ['On Track', 'At Risk', 'Critical', 'Complete'] as const;
export const PROJECT_PHASES = ['Initiation', 'Planning', 'Design', 'Execution', 'Testing', 'Deployment', 'Closure'] as const;
export const DECISION_STATUSES = ['Active', 'Superseded', 'Reversed'] as const;
export const ATTENTION_TYPES = ['Risk', 'Issue', 'Blocker', 'Dependency'] as const;
export const ATTENTION_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const ATTENTION_STATUSES = ['Open', 'Monitoring', 'Resolved'] as const;

export type VendorStatus = (typeof VENDOR_STATUSES)[number] | (typeof PROJECT_STATUSES)[number];
export type ProfileKind = 'vendor' | 'project';
export type VendorDocType = (typeof VENDOR_DOC_TYPES)[number] | (typeof PROJECT_DOC_TYPES)[number];
export type ProjectHealth = (typeof PROJECT_HEALTH)[number];
export type DecisionStatus = (typeof DECISION_STATUSES)[number];
export type AttentionType = (typeof ATTENTION_TYPES)[number];
export type AttentionSeverity = (typeof ATTENTION_SEVERITIES)[number];
export type AttentionStatus = (typeof ATTENTION_STATUSES)[number];

export interface VendorContact {
  _id: string;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  type?: 'Internal' | 'External';
  image?: string;
}

export interface VendorKeyContact {
  contactId: VendorContact;
  role: string;
  note?: string;
}

export interface VendorLink {
  _id?: string;
  title: string;
  url: string;
  pinned?: boolean;
}

export interface VendorDocument {
  _id?: string;
  title: string;
  docType: VendorDocType;
  signedDate?: string | null;
  expiryDate?: string | null;
  fileId?: string | null;
  fileName?: string;
  contentType?: string;
  size?: number;
  url?: string;
  notes?: string;
  pinned?: boolean;
  createdAt?: string;
}

export interface ProjectDecision {
  _id: string;
  title: string;
  details: string;
  decisionDate?: string | null;
  reason: string;
  status: DecisionStatus;
  noteId?: string | null;
  documentId?: string | null;
  pinned?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttentionItem {
  _id: string;
  title: string;
  type: AttentionType;
  description: string;
  severity: AttentionSeverity;
  status: AttentionStatus;
  dueDate?: string | null;
  resolution: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string | null;
}

export interface ProjectBrief {
  text: string;
  source: 'manual' | 'ai';
  updatedAt?: string | null;
}

export interface ActivityItem {
  _id: string;
  type: 'note' | 'task' | 'document' | 'decision' | 'attention' | 'project';
  action: string;
  label: string;
  title: string;
  refId?: string | null;
  createdAt: string;
}

export interface FlowNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  theme: string;
  shape: string;
  badge: string;
  border: string;
  font: string;
}

export interface FlowData {
  nodes: FlowNode[];
  edges: {id: string; from: string; to: string; fromSide: string | null; toSide: string | null; label: string}[];
  dir: string;
  wrap: number;
  canvasBg?: string;
  legend?: unknown;
}

export interface VendorOrgChart {
  view: 'chart' | 'image';
  imageFileId?: string | null;
  flowData?: FlowData | null;
  flowPngFileId?: string | null;
  updatedAt?: string | null;
}

export interface VendorProfile {
  _id: string;
  sectionId: string;
  summary: string;
  status: VendorStatus;
  website: string;
  orgChart: VendorOrgChart;
  keyContacts: VendorKeyContact[];
  internalContacts: VendorKeyContact[];
  links: VendorLink[];
  documents: VendorDocument[];
  // Project fields
  phase?: string;
  health?: ProjectHealth;
  startDate?: string | null;
  targetDate?: string | null;
  owner?: string;
  currentFocus?: string;
  brief?: ProjectBrief;
  decisions?: ProjectDecision[];
  attention?: AttentionItem[];
  updatedAt?: string;
}

export type VendorPatch = Partial<{
  summary: string;
  status: VendorStatus;
  website: string;
  orgChart: Partial<VendorOrgChart>;
  keyContacts: {contactId: string; role: string; note?: string}[];
  internalContacts: {contactId: string; role: string; note?: string}[];
  links: VendorLink[];
  documents: VendorDocument[];
  phase: string;
  health: ProjectHealth;
  startDate: string | null;
  targetDate: string | null;
  owner: string;
  currentFocus: string;
  brief: {text: string};
}>;

export interface UploadedFile {
  _id: string;
  filename: string;
  contentType: string;
  size: number;
}

async function readJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Try again.');
  return json.data as T;
}

export async function fetchVendor(sectionId: string): Promise<VendorProfile> {
  return readJson(await fetch(`/api/vendors/${sectionId}`, {cache: 'no-store'}));
}

export async function saveVendor(sectionId: string, patch: VendorPatch): Promise<VendorProfile> {
  return readJson(
    await fetch(`/api/vendors/${sectionId}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(patch),
    }),
  );
}

export type RecordCollection = 'decisions' | 'attention';

/** Add a decision or attention item; returns the updated profile and the new item's id. */
export async function createRecord(
  sectionId: string,
  coll: RecordCollection,
  item: Record<string, unknown>,
): Promise<{profile: VendorProfile; id: string}> {
  const res = await fetch(`/api/vendors/${sectionId}/${coll}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(item),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Could not save. Try again.');
  return {profile: json.data, id: json.id};
}

export async function updateRecord(
  sectionId: string,
  coll: RecordCollection,
  id: string,
  changes: Record<string, unknown>,
): Promise<VendorProfile> {
  return readJson(
    await fetch(`/api/vendors/${sectionId}/${coll}/${id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(changes),
    }),
  );
}

export async function deleteRecord(sectionId: string, coll: RecordCollection, id: string): Promise<VendorProfile> {
  return readJson(await fetch(`/api/vendors/${sectionId}/${coll}/${id}`, {method: 'DELETE'}));
}

export async function fetchActivity(
  sectionId: string,
  {type, since, limit}: {type?: string; since?: string | null; limit?: number} = {},
): Promise<ActivityItem[]> {
  const params = new URLSearchParams();
  if (type && type !== 'all') params.set('type', type);
  if (since) params.set('since', since);
  if (limit) params.set('limit', String(limit));
  return readJson(await fetch(`/api/vendors/${sectionId}/activity?${params}`, {cache: 'no-store'}));
}

/** Records this visit; resolves to when the previous visit was (null on the first visit). */
export async function recordVisit(sectionId: string): Promise<string | null> {
  const data = await readJson<{previousVisitAt: string | null}>(
    await fetch(`/api/vendors/${sectionId}/visit`, {method: 'POST'}),
  );
  return data.previousVisitAt;
}

/** Plain text from note HTML (block tags become spaces, inline tags vanish). */
export function htmlToText(html: string) {
  return (html || '')
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/?(p|div|br|li|ul|ol|h\d|tr|td|th|table|blockquote)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// Large photos/screenshots are scaled down so they fit under the upload limit
export async function shrinkImage(file: Blob, maxBytes = 3.5 * 1024 * 1024): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.size <= maxBytes) return file;
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, 3000 / Math.max(bitmap.width, bitmap.height));
  for (let attempt = 0; attempt < 5; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (blob && blob.size <= maxBytes) return blob;
    scale *= 0.75;
  }
  return file;
}

export async function uploadVendorFile(file: Blob, filename: string): Promise<UploadedFile> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Files must be 4 MB or smaller. Save larger files as a link.');
  const form = new FormData();
  form.append('file', file, filename);
  return readJson(await fetch('/api/vendors/files', {method: 'POST', body: form}));
}

export function deleteVendorFile(id: string) {
  return fetch(`/api/vendors/files/${id}`, {method: 'DELETE'}).catch(() => undefined);
}

export function vendorFileUrl(id: string, download = false) {
  return `/api/vendors/files/${id}${download ? '?download=1' : ''}`;
}

export function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

export function formatDate(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
}

export function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Whole days from today until the given date (negative when in the past)
export function daysUntil(value?: string | null) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

// Dates from <input type="date"> are local calendar days; store them as noon UTC so they never shift a day
export function dateInputToIso(value: string) {
  return value ? new Date(`${value}T12:00:00Z`).toISOString() : null;
}

export function isoToDateInput(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}
