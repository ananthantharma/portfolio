// Thin fetch wrapper over the legacy /api/bookmarks routes (pages-router, raw Mongo driver —
// response shape differs from the /api/notes/* {success,data} convention, hence its own helper).

export interface Bookmark {
  _id: string;
  title: string;
  url: string;
  category: string;
  description?: string;
  tags?: string[];
  added_timestamp?: string;
  icon?: string;
}

export type BookmarkDraft = {
  title: string;
  url: string;
  category: string;
  description?: string;
  tags?: string[];
};

async function parseError(res: Response): Promise<never> {
  const body = await res.json().catch(() => null);
  throw new Error(body?.error ? String(body.error) : `Request failed (${res.status})`);
}

export const bookmarksApi = {
  list: async (): Promise<Bookmark[]> => {
    const res = await fetch('/api/bookmarks');
    if (!res.ok) return parseError(res);
    const body = await res.json().catch(() => null);
    return body?.bookmarks || [];
  },

  create: async (payload: BookmarkDraft): Promise<string> => {
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
    if (!res.ok) return parseError(res);
    const body = await res.json().catch(() => null);
    if (!body?.id) throw new Error('Bookmark was not created');
    return body.id as string;
  },

  update: async (id: string, patch: Partial<BookmarkDraft>): Promise<void> => {
    const res = await fetch(`/api/bookmarks/${id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(patch),
    });
    if (!res.ok) return parseError(res);
  },

  remove: async (id: string): Promise<void> => {
    const res = await fetch(`/api/bookmarks/${id}`, {method: 'DELETE'});
    if (!res.ok) return parseError(res);
  },
};
