export interface PromptLibraryItem {
  _id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  favorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PromptLibraryItemDraft = {
  title: string;
  description?: string;
  content: string;
  category: string;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {'Content-Type': 'application/json', ...init?.headers},
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new Error(body?.error ? String(body.error) : `Request failed (${res.status})`);
  }
  return body.data as T;
}

export const promptLibraryApi = {
  list: () => request<PromptLibraryItem[]>('/api/prompts/library'),
  create: (payload: PromptLibraryItemDraft) =>
    request<PromptLibraryItem>('/api/prompts/library', {method: 'POST', body: JSON.stringify(payload)}),
  update: (id: string, patch: Partial<PromptLibraryItemDraft> & {favorite?: boolean}) =>
    request<PromptLibraryItem>(`/api/prompts/library/${id}`, {method: 'PUT', body: JSON.stringify(patch)}),
  remove: (id: string) => request<unknown>(`/api/prompts/library/${id}`, {method: 'DELETE'}),
};
