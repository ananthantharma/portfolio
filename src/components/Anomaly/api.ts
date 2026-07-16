// Thin fetch wrapper over the existing /api/notes/* routes.
// All endpoints respond with {success, data} and are session-scoped server-side.

import {Notebook, Page, Section} from './types';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {'Content-Type': 'application/json', ...(init?.headers || {})},
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new Error(body?.error ? String(body.error) : `Request failed (${res.status})`);
  }
  return body.data as T;
}

/** The reorder endpoints only use array position — `{id}` per item is all they need. */
const orderedItems = (ids: string[]) => ids.map(id => ({id}));

export const api = {
  notebooks: {
    list: () => request<Notebook[]>('/api/notes/categories'),
    create: (name: string) =>
      request<Notebook>('/api/notes/categories', {method: 'POST', body: JSON.stringify({name})}),
    update: (id: string, patch: Partial<Notebook>) =>
      request<Notebook>(`/api/notes/categories/${id}`, {method: 'PUT', body: JSON.stringify(patch)}),
    remove: (id: string) => request<unknown>(`/api/notes/categories/${id}`, {method: 'DELETE'}),
    reorder: (ids: string[]) =>
      request<unknown>('/api/notes/categories/reorder', {method: 'PUT', body: JSON.stringify({items: orderedItems(ids)})}),
  },

  sections: {
    list: (notebookId: string) => request<Section[]>(`/api/notes/sections?categoryId=${notebookId}`),
    create: (notebookId: string, name: string) =>
      request<Section>('/api/notes/sections', {method: 'POST', body: JSON.stringify({name, categoryId: notebookId})}),
    update: (id: string, patch: Partial<Section>) =>
      request<Section>(`/api/notes/sections/${id}`, {method: 'PUT', body: JSON.stringify(patch)}),
    remove: (id: string) => request<unknown>(`/api/notes/sections/${id}`, {method: 'DELETE'}),
    reorder: (ids: string[]) =>
      request<unknown>('/api/notes/sections/reorder', {method: 'PUT', body: JSON.stringify({items: orderedItems(ids)})}),
  },

  pages: {
    all: () => request<Page[]>('/api/notes/pages'),
    bySection: (sectionId: string) => request<Page[]>(`/api/notes/pages?sectionId=${sectionId}`),
    byNotebookRoot: (notebookId: string) => request<Page[]>(`/api/notes/pages?categoryId=${notebookId}`),
    important: () => request<Page[]>('/api/notes/pages?isImportant=true'),
    flagged: () => request<Page[]>('/api/notes/pages?isFlagged=true'),
    search: (q: string) => request<Page[]>(`/api/notes/pages?search=${encodeURIComponent(q)}`),
    /** Titles only — matches page titles, section names, and notebook names (no body content). */
    searchTitles: (q: string) =>
      request<Page[]>(
        `/api/notes/pages?search=${encodeURIComponent(q)}&searchPageTitlesOnly=true&searchSectionNamesOnly=true`,
      ),
    get: (id: string) => request<Page>(`/api/notes/pages/${id}`),
    create: (payload: Record<string, unknown>) =>
      request<Page>('/api/notes/pages', {method: 'POST', body: JSON.stringify(payload)}),
    update: (id: string, patch: Record<string, unknown>) =>
      request<Page>(`/api/notes/pages/${id}`, {method: 'PUT', body: JSON.stringify(patch)}),
    remove: (id: string) => request<unknown>(`/api/notes/pages/${id}`, {method: 'DELETE'}),
    reorder: (ids: string[]) =>
      request<unknown>('/api/notes/pages/reorder', {method: 'PUT', body: JSON.stringify({items: orderedItems(ids)})}),
  },
};
