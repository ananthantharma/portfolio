// Thin fetch wrapper over the /api/notes/* routes, used by the Tasks app to
// link/create/quick-edit notes without leaving /tasks.

export interface NotePageTab {
  _id?: string;
  title: string;
  content: string;
  color?: string;
  isImportant?: boolean;
  isFlagged?: boolean;
  order: number;
}

export interface NotePage {
  _id: string;
  title: string;
  content?: string; // deprecated, kept for pages created before the tabs migration
  tabs?: NotePageTab[];
  sectionId?: {_id: string; name: string; categoryId?: string} | string | null;
  categoryId?: {_id: string; name: string} | string | null;
}

export interface NoteCategory {
  _id: string;
  name: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {'Content-Type': 'application/json', ...(init?.headers || {})},
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.success === false) {
    throw new Error(body?.error ? String(body.error) : `Request failed (${res.status})`);
  }
  return (body?.data ?? body) as T;
}

const TASKS_NOTEBOOK_NAME = 'Tasks';

export const notesApi = {
  searchByTitle: (query: string) =>
    request<NotePage[]>(`/api/notes/pages?search=${encodeURIComponent(query)}&searchPageTitlesOnly=true`),

  getPage: (id: string) => request<NotePage>(`/api/notes/pages/${id}`),

  updatePage: (id: string, patch: Record<string, unknown>) =>
    request<NotePage>(`/api/notes/pages/${id}`, {method: 'PUT', body: JSON.stringify(patch)}),

  /** Finds (or creates, once) the shared "Tasks" notebook that task-linked notes are filed under. */
  async ensureTasksCategory(): Promise<NoteCategory> {
    const categories = await request<NoteCategory[]>('/api/notes/categories');
    const existing = categories.find(c => c.name.toLowerCase() === TASKS_NOTEBOOK_NAME.toLowerCase());
    if (existing) return existing;
    return request<NoteCategory>('/api/notes/categories', {
      method: 'POST',
      body: JSON.stringify({name: TASKS_NOTEBOOK_NAME, icon: 'CheckSquare'}),
    });
  },

  /** Creates a new page directly under the Tasks notebook (no section). */
  async createPage(title: string): Promise<NotePage> {
    const category = await notesApi.ensureTasksCategory();
    return request<NotePage>('/api/notes/pages', {
      method: 'POST',
      body: JSON.stringify({title: title || 'Untitled', categoryId: category._id}),
    });
  },
};
