// Client-side types + helpers for the Mission Control task app (/tasks).
// Mirrors the ToDo mongoose model without importing mongoose into the client.

export interface Subtask {
  _id?: string;
  title: string;
  isCompleted: boolean;
}

export interface Attachment {
  name: string;
  type: string;
  webViewLink?: string;
  storageType?: 'local' | 'drive' | 'blob';
  size: number;
}

export interface Task {
  _id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low' | 'None';
  dueDate?: string;
  category?: string;
  notes?: string;
  isCompleted: boolean;
  status?: string; // 'todo' | 'in-progress' | 'done'
  subtasks?: Subtask[];
  estimatedTime?: number; // minutes
  tags?: string[];
  attachments?: Attachment[];
  sourcePageId?: {_id: string; title: string} | string | null;
  tabName?: string;
  order?: number;
  aiGenerated?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'list' | 'board' | 'matrix';
export type Status = 'todo' | 'in-progress' | 'done';

export const STATUSES: {key: Status; label: string}[] = [
  {key: 'todo', label: 'To Do'},
  {key: 'in-progress', label: 'In Progress'},
  {key: 'done', label: 'Done'},
];

export const PRIORITY_META: Record<Task['priority'], {label: string; dot: string; chip: string; weight: number}> = {
  High: {label: 'High', dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 ring-rose-200', weight: 3},
  Medium: {label: 'Medium', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 ring-amber-200', weight: 2},
  Low: {label: 'Low', dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 ring-sky-200', weight: 1},
  None: {label: 'None', dot: 'bg-slate-300', chip: 'bg-slate-100 text-slate-500 ring-slate-200', weight: 0},
};

export function statusOf(task: Task): Status {
  if (task.isCompleted || task.status === 'done') return 'done';
  if (task.status === 'in-progress') return 'in-progress';
  return 'todo';
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function daysUntil(due: string | undefined): number | null {
  if (!due) return null;
  const today = startOfDay(new Date()).getTime();
  const target = startOfDay(new Date(due)).getTime();
  return Math.round((target - today) / 86400000);
}

export type DueGroup = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none';

export const DUE_GROUPS: {key: DueGroup; label: string}[] = [
  {key: 'overdue', label: 'Overdue'},
  {key: 'today', label: 'Today'},
  {key: 'tomorrow', label: 'Tomorrow'},
  {key: 'week', label: 'Next 7 days'},
  {key: 'later', label: 'Later'},
  {key: 'none', label: 'No due date'},
];

export function dueGroupOf(task: Task): DueGroup {
  const d = daysUntil(task.dueDate);
  if (d === null) return 'none';
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d <= 7) return 'week';
  return 'later';
}

export function formatDue(due: string | undefined): string {
  if (!due) return '';
  const d = daysUntil(due);
  if (d === null) return '';
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d < 0) return `${-d}d overdue`;
  if (d <= 7) return new Date(due).toLocaleDateString(undefined, {weekday: 'short'});
  return new Date(due).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

export function formatMinutes(min: number | undefined): string {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function subtaskProgress(task: Task): {done: number; total: number} {
  const total = task.subtasks?.length || 0;
  const done = task.subtasks?.filter(s => s.isCompleted).length || 0;
  return {done, total};
}

/** Default smart sort: overdue/soonest due first, then priority, then newest. */
export function smartCompare(a: Task, b: Task): number {
  const da = daysUntil(a.dueDate);
  const db = daysUntil(b.dueDate);
  if (da !== db) {
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  }
  const pw = PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight;
  if (pw !== 0) return pw;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

// ── Quick-add natural language parser ────────────────────────────────────────
// Supported tokens: !high !med !low · #tag · @category · today/tomorrow/tmr ·
// weekday names (next occurrence) · "in 3d" / "in 2w" · ~30m / ~2h (estimate)

export interface ParsedQuickAdd {
  title: string;
  priority: Task['priority'];
  dueDate: string | null;
  tags: string[];
  category: string | null;
  estimatedTime: number | null;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function parseQuickAdd(input: string): ParsedQuickAdd {
  let text = ` ${input.trim()} `;
  const out: ParsedQuickAdd = {
    title: '',
    priority: 'None',
    dueDate: null,
    tags: [],
    category: null,
    estimatedTime: null,
  };

  // Priority
  text = text.replace(/\s!(high|hi|h)\b/i, () => ((out.priority = 'High'), ' '));
  text = text.replace(/\s!(medium|med|m)\b/i, () => ((out.priority = 'Medium'), ' '));
  text = text.replace(/\s!(low|lo|l)\b/i, () => ((out.priority = 'Low'), ' '));

  // Tags (repeatable)
  text = text.replace(/\s#([\w-]+)/g, (_, tag: string) => {
    out.tags.push(tag);
    return ' ';
  });

  // Category
  text = text.replace(/\s@([\w-]+)/, (_, cat: string) => {
    out.category = cat;
    return ' ';
  });

  // Estimate: ~30m, ~2h, ~1h30m
  text = text.replace(/\s~(?:(\d+)h)?(?:(\d+)m)?\b/i, (m, h: string, min: string) => {
    const total = (h ? parseInt(h) * 60 : 0) + (min ? parseInt(min) : 0);
    if (!total) return m; // not a real estimate token
    out.estimatedTime = total;
    return ' ';
  });

  const setDue = (daysFromToday: number) => {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() + daysFromToday);
    d.setHours(17, 0, 0, 0); // default 5pm
    out.dueDate = d.toISOString();
  };

  // Relative dates
  text = text.replace(/\s(today|tod)\b/i, () => (setDue(0), ' '));
  text = text.replace(/\s(tomorrow|tmr|tom)\b/i, () => (setDue(1), ' '));
  text = text.replace(/\sin (\d+)\s*d(ays?)?\b/i, (_, n: string) => (setDue(parseInt(n)), ' '));
  text = text.replace(/\sin (\d+)\s*w(eeks?)?\b/i, (_, n: string) => (setDue(parseInt(n) * 7), ' '));
  text = text.replace(/\snext week\b/i, () => (setDue(7), ' '));

  // Weekday names → next occurrence (skip if already consumed a date)
  if (!out.dueDate) {
    text = text.replace(
      /\s(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)\b/i,
      (m, day: string) => {
        const target = WEEKDAYS.findIndex(w => w.startsWith(day.toLowerCase().slice(0, 3)));
        if (target === -1) return m;
        const now = new Date();
        let delta = (target - now.getDay() + 7) % 7;
        if (delta === 0) delta = 7; // "fri" on a Friday = next Friday
        setDue(delta);
        return ' ';
      },
    );
  }

  out.title = text.replace(/\s+/g, ' ').trim();
  return out;
}
