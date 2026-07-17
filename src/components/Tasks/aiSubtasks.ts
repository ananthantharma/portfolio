// Thin wrapper over the existing /api/gemini/todo-features "breakdown" action.

export async function suggestSubtasks(title: string, notes?: string): Promise<string[]> {
  const res = await fetch('/api/gemini/todo-features', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action: 'breakdown', text: title, context: notes || undefined}),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success || !Array.isArray(body.data)) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body.data.filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0);
}
