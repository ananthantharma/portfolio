// Thin wrapper over the existing /api/gemini/todo-features route.

export interface TaskPlan {
  summary: string;
  subtasks: string[];
}

/** Asks Gemini for a Notes summary + a complete subtask checklist in one call. */
export async function planTask(title: string, notes?: string): Promise<TaskPlan> {
  const res = await fetch('/api/gemini/todo-features', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({action: 'plan', text: title, context: notes || undefined}),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success || typeof body.data !== 'object' || body.data === null) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  const {summary, subtasks} = body.data as {summary?: unknown; subtasks?: unknown};
  return {
    summary: typeof summary === 'string' ? summary : '',
    subtasks: Array.isArray(subtasks) ? subtasks.filter((s): s is string => typeof s === 'string' && s.trim().length > 0) : [],
  };
}
