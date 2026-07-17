// Client-side types + helpers for Ananthan's Tasks app (/tasks).
// Mirrors the ToDo mongoose model without importing mongoose into the client.

export interface Subtask {
  _id?: string;
  title: string;
  isCompleted: boolean;
}

export interface Attachment {
  name: string;
  type: string;
  data?: string; // base64 data URL — set for pasted images and local file uploads
  webViewLink?: string;
  storageType?: 'local' | 'drive' | 'blob';
  size: number;
}

export type RecurrenceFreq = 'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays';

export interface Recurrence {
  freq: RecurrenceFreq;
  interval?: number;
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
  isArchived?: boolean;
  isTemplate?: boolean;
  recurrence?: Recurrence | null;
  blockedBy?: string[];
  actualMinutes?: number;
  hasNeonBorder?: boolean;
  neonColor?: 'red' | 'blue' | 'green' | null;
  isMinimized?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'list' | 'board' | 'matrix' | 'calendar' | 'insights';
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

// ── Recurrence ────────────────────────────────────────────────────────────────

export const RECURRENCE_META: Record<RecurrenceFreq, string> = {
  none: 'Does not repeat',
  daily: 'Repeats daily',
  weekly: 'Repeats weekly',
  monthly: 'Repeats monthly',
  weekdays: 'Repeats on weekdays',
};

/** The next due date after completing a recurring task, or null if it doesn't repeat. */
export function nextOccurrence(task: Task): string | null {
  const freq = task.recurrence?.freq;
  if (!freq || freq === 'none' || !task.dueDate) return null;
  const interval = Math.max(1, task.recurrence?.interval || 1);
  const d = new Date(task.dueDate);
  if (freq === 'daily') d.setDate(d.getDate() + interval);
  else if (freq === 'weekly') d.setDate(d.getDate() + 7 * interval);
  else if (freq === 'monthly') d.setMonth(d.getMonth() + interval);
  else if (freq === 'weekdays') {
    let added = 0;
    while (added < interval) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) added++;
    }
  }
  return d.toISOString();
}

// ── Sorting ───────────────────────────────────────────────────────────────────

export type SortMode = 'smart' | 'due' | 'priority' | 'created' | 'alpha' | 'manual';

export const SORT_MODES: {key: SortMode; label: string}[] = [
  {key: 'smart', label: 'Smart'},
  {key: 'due', label: 'Due date'},
  {key: 'priority', label: 'Priority'},
  {key: 'created', label: 'Date created'},
  {key: 'alpha', label: 'Alphabetical'},
  {key: 'manual', label: 'Manual order'},
];

export function compareBy(mode: SortMode): (a: Task, b: Task) => number {
  switch (mode) {
    case 'due': {
      return (a, b) => {
        const da = daysUntil(a.dueDate);
        const db = daysUntil(b.dueDate);
        if (da === db) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      };
    }
    case 'priority':
      return (a, b) => PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight;
    case 'created':
      return (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    case 'alpha':
      return (a, b) => a.title.localeCompare(b.title);
    case 'manual':
      return (a, b) => (a.order ?? 0) - (b.order ?? 0);
    case 'smart':
    default:
      return smartCompare;
  }
}

// ── Tag colors ────────────────────────────────────────────────────────────────

const TAG_COLORS = ['#8b5cf6', '#0ea5e9', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1', '#14b8a6'];

/** Deterministic color per tag/category name so recurring labels stay visually consistent. */
export function colorForLabel(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return TAG_COLORS[hash % TAG_COLORS.length];
}

// ── Staleness ─────────────────────────────────────────────────────────────────

/** Days since a task was last touched — surfaces tasks quietly rotting in the backlog. */
export function staleDays(task: Task): number {
  return Math.floor((Date.now() - new Date(task.updatedAt).getTime()) / 86400000);
}

// ── Dependencies / blocking ───────────────────────────────────────────────────

export function isBlocked(task: Task, allTasks: Task[]): boolean {
  if (!task.blockedBy?.length) return false;
  const byId = new Map(allTasks.map(t => [t._id, t]));
  return task.blockedBy.some(id => {
    const blocker = byId.get(id);
    return blocker ? !blocker.isCompleted : false;
  });
}

// ── Pin / highlight (repurposes the existing hasNeonBorder + neonColor fields) ─

export const NEON_COLORS: {key: NonNullable<Task['neonColor']>; label: string; ring: string; dot: string}[] = [
  {key: 'red', label: 'Red', ring: 'ring-rose-400', dot: 'bg-rose-500'},
  {key: 'blue', label: 'Blue', ring: 'ring-sky-400', dot: 'bg-sky-500'},
  {key: 'green', label: 'Green', ring: 'ring-emerald-400', dot: 'bg-emerald-500'},
];

export function isPinned(task: Task): boolean {
  return !!task.hasNeonBorder;
}

// ── Streak ────────────────────────────────────────────────────────────────────

/** Consecutive days (ending yesterday or today) with zero overdue/backlog left over. */
export function completionStreak(tasks: Task[]): number {
  const doneDates = new Set(
    tasks.filter(t => t.isCompleted).map(t => startOfDay(new Date(t.updatedAt)).getTime()),
  );
  let streak = 0;
  const cursor = startOfDay(new Date());
  while (doneDates.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ── Saved smart views ─────────────────────────────────────────────────────────

export interface SavedView {
  id: string;
  name: string;
  search: string;
  priority: Task['priority'] | null;
  tag: string | null;
  category: string | null;
}

// ── Export / import ───────────────────────────────────────────────────────────

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function tasksToCsv(tasks: Task[]): string {
  const header = ['title', 'status', 'priority', 'dueDate', 'category', 'tags', 'notes', 'estimatedTime'];
  const rows = tasks.map(t =>
    [
      t.title,
      statusOf(t),
      t.priority,
      t.dueDate || '',
      t.category || '',
      (t.tags || []).join('|'),
      t.notes || '',
      String(t.estimatedTime || ''),
    ]
      .map(csvEscape)
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

export interface ImportedTask {
  title: string;
  status?: string;
  priority?: Task['priority'];
  dueDate?: string;
  category?: string;
  tags?: string[];
  notes?: string;
  estimatedTime?: number;
}

export function parseTasksCsv(text: string): ImportedTask[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cells = splitCsvLine(line);
    const get = (key: string) => cells[header.indexOf(key)] || '';
    const priority = get('priority');
    return {
      title: get('title'),
      status: get('status') || 'todo',
      priority: (['High', 'Medium', 'Low', 'None'] as const).includes(priority as Task['priority'])
        ? (priority as Task['priority'])
        : 'None',
      dueDate: get('duedate') || undefined,
      category: get('category') || undefined,
      tags: get('tags') ? get('tags').split('|').filter(Boolean) : [],
      notes: get('notes') || undefined,
      estimatedTime: get('estimatedtime') ? Number(get('estimatedtime')) : undefined,
    };
  });
}
