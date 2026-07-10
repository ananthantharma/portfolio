// Thin fetch wrapper over the existing /api/todos routes (JSON mode).

import {Task} from './types';

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

export const api = {
  list: () => request<Task[]>('/api/todos'),
  create: (payload: Record<string, unknown>) =>
    request<Task>('/api/todos', {method: 'POST', body: JSON.stringify(payload)}),
  update: (id: string, patch: Record<string, unknown>) =>
    request<Task>(`/api/todos/${id}`, {method: 'PUT', body: JSON.stringify(patch)}),
  remove: (id: string) => request<unknown>(`/api/todos/${id}`, {method: 'DELETE'}),
  reorder: (updates: {id: string; order: number}[]) =>
    fetch('/api/todos/reorder', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({updates}),
    }),
};
