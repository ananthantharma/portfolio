// Thin fetch wrapper over the existing /api/todos routes (JSON mode).

import {Task} from './types';

export type TaskChange = {type: 'upsert'; task: Task} | {type: 'remove'; id: string} | {type: 'reload'};
const listeners = new Set<(change: TaskChange) => void>();
const queues = new Map<string, Promise<unknown>>();
export function subscribeTasks(listener: (change: TaskChange) => void) {
  listeners.add(listener);
  return () => {listeners.delete(listener);};
}
function publish(change: TaskChange) { listeners.forEach(listener => listener(change)); }
export function notifyTasksChanged() {publish({type: 'reload'});}

// Serialize writes to the same task so a slow response cannot overwrite a newer edit.
function enqueue<T>(id: string, operation: () => Promise<T>): Promise<T> {
  const result = (queues.get(id) || Promise.resolve()).catch(() => undefined).then(operation);
  queues.set(id, result);
  void result.finally(() => {if (queues.get(id) === result) queues.delete(id);}).catch(() => undefined);
  return result;
}

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
  create: async (payload: Record<string, unknown>) => {
    const task = await request<Task>('/api/todos', {method: 'POST', body: JSON.stringify({dueDate: null, ...payload})});
    publish({type: 'upsert', task});
    return task;
  },
  update: (id: string, patch: Record<string, unknown>) => enqueue(id, async () => {
    const task = await request<Task>(`/api/todos/${id}`, {method: 'PUT', body: JSON.stringify(patch)});
    publish({type: 'upsert', task});
    return task;
  }),
  remove: (id: string) => enqueue(id, async () => {
    const result = await request<unknown>(`/api/todos/${id}`, {method: 'DELETE'});
    publish({type: 'remove', id});
    return result;
  }),
  reorder: async (updates: {id: string; order: number}[]) => {
    await request<unknown>('/api/todos/reorder', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({updates}),
    });
    publish({type: 'reload'});
  },
};
