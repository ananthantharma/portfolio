// Shared checks for bookmark fields sent by the browser.

export interface BookmarkAttachment {
  id: string; // Google Drive file id
  name: string;
  mimeType?: string;
  size?: number;
  webViewLink?: string;
  addedAt?: number; // ms
}

export const cleanTags = (tags: unknown): string[] =>
  Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string' && !!t.trim()).map(t => t.trim().slice(0, 40)).slice(0, 30) : [];

/** Files kept in Google Drive for a bookmark; anything malformed is dropped. */
export function cleanAttachments(list: unknown): BookmarkAttachment[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter(a => a && typeof a === 'object' && typeof a.id === 'string' && /^[A-Za-z0-9_-]{5,200}$/.test(a.id))
    .slice(0, 50)
    .map(a => ({
      id: a.id,
      name: typeof a.name === 'string' && a.name.trim() ? a.name.slice(0, 300) : 'File',
      mimeType: typeof a.mimeType === 'string' ? a.mimeType.slice(0, 200) : '',
      size: Number.isFinite(Number(a.size)) ? Number(a.size) : 0,
      webViewLink: typeof a.webViewLink === 'string' && /^https:\/\/(drive|docs)\.google\.com\//.test(a.webViewLink) ? a.webViewLink : '',
      addedAt: Number.isFinite(Number(a.addedAt)) ? Number(a.addedAt) : Date.now(),
    }));
}

/** The site's icon, for web links. */
export function faviconFor(url: unknown): string {
  if (typeof url !== 'string' || !/^https?:\/\/.{4,}/.test(url)) return '';
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
  } catch {
    return '';
  }
}
