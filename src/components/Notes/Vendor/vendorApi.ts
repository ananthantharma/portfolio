export const VENDOR_STATUSES = ['Active', 'Onboarding', 'Under review', 'Inactive'] as const;
export const VENDOR_DOC_TYPES = ['MSA', 'DPA', 'SOW', 'NDA', 'Order form', 'Other'] as const;

export type VendorStatus = (typeof VENDOR_STATUSES)[number];
export type VendorDocType = (typeof VENDOR_DOC_TYPES)[number];

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
}

export interface VendorLink {
  _id?: string;
  title: string;
  url: string;
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
  createdAt?: string;
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
}

export type VendorPatch = Partial<{
  summary: string;
  status: VendorStatus;
  website: string;
  orgChart: Partial<VendorOrgChart>;
  keyContacts: {contactId: string; role: string}[];
  internalContacts: {contactId: string; role: string}[];
  links: VendorLink[];
  documents: VendorDocument[];
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
