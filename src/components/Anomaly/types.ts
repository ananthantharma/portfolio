// Plain client-side types for the Anomaly notes app.
// These mirror the mongoose models (NoteCategory / NoteSection / NotePage)
// without dragging mongoose Document types into client bundles.

export interface Tab {
  _id?: string;
  title: string;
  content: string;
  color?: string;
  isImportant?: boolean;
  isFlagged?: boolean;
  order: number;
}

export interface Page {
  _id: string;
  title: string;
  content?: string; // legacy single-body field, migrated into tabs on first save
  tabs: Tab[];
  color?: string;
  icon?: string; // lucide icon key, see icons.ts
  // populated ({_id, name, categoryId}) or plain id depending on the endpoint
  sectionId?: unknown;
  categoryId?: unknown;
  isFlagged?: boolean;
  isImportant?: boolean;
  isStarred?: boolean;
  isPinned?: boolean;
  todoCount?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  _id: string;
  name: string;
  color?: string;
  icon?: string;
  categoryId: string;
  importantCount?: number;
  flaggedCount?: number;
  todoCount?: number;
  updatedAt?: string;
}

export interface Notebook {
  _id: string;
  name: string;
  color?: string;
  icon?: string;
  importantCount?: number;
  flaggedCount?: number;
  todoCount?: number;
  updatedAt?: string;
}

export type View =
  | {kind: 'home'}
  | {kind: 'important'}
  | {kind: 'flagged'}
  | {kind: 'notebook'; notebookId: string}
  | {kind: 'section'; notebookId: string; sectionId: string};

/** Extract an id from a value that may be a plain id string or a populated document. */
export function idOf(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '_id' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)._id);
  }
  return null;
}

/** Extract a display name from a populated ref, if present. */
export function nameOf(value: unknown): string | null {
  if (value && typeof value === 'object' && 'name' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>).name);
  }
  return null;
}

export function stripHtml(html: string): string {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Legacy data stores "#000000"/"#ffffff" as the "no color" default — swap those for the brand accent. */
export function accentOf(color?: string | null): string {
  if (!color) return '#8b5cf6';
  const c = color.toLowerCase();
  if (c === '#000000' || c === '#000' || c === '#ffffff' || c === '#fff' || c === 'transparent') return '#8b5cf6';
  return color;
}

export function timeAgo(date: string | Date | undefined): string {
  if (!date) return '';
  const then = new Date(date).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(date).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
}

/** Ensure a page has at least one tab, migrating the legacy `content` field if needed. */
export function normalizeTabs(page: Page): Tab[] {
  if (page.tabs && page.tabs.length > 0) {
    return [...page.tabs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  return [{title: 'Main', content: page.content || '', order: 0}];
}
