// Shared types and scheduling maths for the Gantt planner.
// Dates are plain 'YYYY-MM-DD' strings; arithmetic uses whole UTC day numbers so time zones never shift a bar.

export type TaskType = 'task' | 'milestone';

export interface GTask {
  id: string;
  name: string;
  start: string;
  end: string; // inclusive
  progress: number;
  category: string;
  parentId?: string;
  type: TaskType;
  dependencies: string[];
  assignee: string;
  notes: string;
  collapsed?: boolean;
}

export interface Plan {
  name: string;
  description: string;
  tasks: GTask[];
  categoryColors: Record<string, string>;
}

export interface Row {
  task: GTask;
  depth: number;
  hasChildren: boolean;
  wbs: string;
}

export type Zoom = 'day' | 'week' | 'month' | 'quarter';
export const PX_PER_DAY: Record<Zoom, number> = {day: 38, week: 15, month: 5, quarter: 2};
export const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

const DAY_MS = 86400000;
export const toDay = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / DAY_MS);
};
export const fromDay = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);
export const todayDay = () => {
  const d = new Date();
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
};
export const dateOf = (n: number) => new Date(n * DAY_MS);
export const weekdayOf = (n: number) => dateOf(n).getUTCDay();
export const duration = (t: Pick<GTask, 'start' | 'end'>) => toDay(t.end) - toDay(t.start) + 1;
export const uid = () => Math.random().toString(36).slice(2, 10);
export const fmt = (s: string, opts: Intl.DateTimeFormatOptions = {month: 'short', day: 'numeric'}) =>
  dateOf(toDay(s)).toLocaleDateString(undefined, {...opts, timeZone: 'UTC'});

const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

/** Accept tasks saved by any version of the planner. */
export function normalizeTask(raw: Record<string, unknown>, fallbackDay = todayDay()): GTask {
  const s = typeof raw.start === 'string' && DATE_RE.test(raw.start) ? raw.start.slice(0, 10) : raw.start instanceof Date ? raw.start.toISOString().slice(0, 10) : fromDay(fallbackDay);
  let e = typeof raw.end === 'string' && DATE_RE.test(raw.end) ? raw.end.slice(0, 10) : raw.end instanceof Date ? raw.end.toISOString().slice(0, 10) : s;
  if (e < s) e = s;
  const type: TaskType = raw.type === 'milestone' ? 'milestone' : 'task';
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
    name: typeof raw.name === 'string' && raw.name ? raw.name : 'Untitled task',
    start: s,
    end: type === 'milestone' ? s : e,
    progress: Math.max(0, Math.min(100, Math.round(Number(raw.progress) || 0))),
    category: typeof raw.category === 'string' && raw.category ? raw.category : 'General',
    parentId: typeof raw.parentId === 'string' && raw.parentId ? raw.parentId : undefined,
    type,
    dependencies: Array.isArray(raw.dependencies) ? raw.dependencies.filter((d): d is string => typeof d === 'string') : [],
    assignee: typeof raw.assignee === 'string' ? raw.assignee : '',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    collapsed: !!raw.collapsed,
  };
}

export function normalizePlan(raw: {name?: unknown; description?: unknown; tasks?: unknown; categoryColors?: unknown}): Plan {
  const tasks = (Array.isArray(raw.tasks) ? raw.tasks : []).map(t => normalizeTask(t as Record<string, unknown>));
  const ids = new Set(tasks.map(t => t.id));
  tasks.forEach(t => {
    if (t.parentId && !ids.has(t.parentId)) t.parentId = undefined;
    t.dependencies = t.dependencies.filter(d => ids.has(d) && d !== t.id);
  });
  const colors: Record<string, string> = {};
  if (raw.categoryColors && typeof raw.categoryColors === 'object') {
    for (const [k, v] of Object.entries(raw.categoryColors as Record<string, unknown>)) if (typeof v === 'string') colors[k] = v;
  }
  let i = Object.keys(colors).length;
  tasks.forEach(t => {
    if (!colors[t.category]) colors[t.category] = PALETTE[i++ % PALETTE.length];
  });
  return {name: typeof raw.name === 'string' && raw.name ? raw.name : 'Untitled project', description: typeof raw.description === 'string' ? raw.description : '', tasks, categoryColors: colors};
}

export function childrenOf(tasks: GTask[]) {
  const map = new Map<string | undefined, GTask[]>();
  tasks.forEach(t => {
    const key = t.parentId;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  });
  return map;
}

export function descendantIds(tasks: GTask[], id: string) {
  const kids = childrenOf(tasks);
  const out = new Set<string>();
  const walk = (pid: string) =>
    (kids.get(pid) || []).forEach(c => {
      out.add(c.id);
      walk(c.id);
    });
  walk(id);
  return out;
}

/** Phases take their dates and progress from the tasks inside them. */
export function rollup(tasks: GTask[]): GTask[] {
  const kids = childrenOf(tasks);
  const byId = new Map(tasks.map(t => [t.id, {...t}]));
  const done = new Set<string>();
  const calc = (t: GTask): GTask => {
    if (done.has(t.id)) return byId.get(t.id)!;
    done.add(t.id);
    const children = kids.get(t.id) || [];
    if (!children.length) return byId.get(t.id)!;
    const resolved = children.map(c => calc(byId.get(c.id)!));
    const start = Math.min(...resolved.map(c => toDay(c.start)));
    const end = Math.max(...resolved.map(c => toDay(c.end)));
    let weight = 0;
    let sum = 0;
    resolved.forEach(c => {
      const w = c.type === 'milestone' ? 1 : duration(c);
      weight += w;
      sum += w * c.progress;
    });
    const self = byId.get(t.id)!;
    Object.assign(self, {start: fromDay(start), end: fromDay(end), progress: weight ? Math.round(sum / weight) : 0, type: 'task' as TaskType});
    return self;
  };
  tasks.forEach(t => calc(byId.get(t.id)!));
  return tasks.map(t => byId.get(t.id)!);
}

/** Depth-first rows in plan order with WBS numbers; collapsed phases hide their children unless a filter is on. */
export function buildRows(tasks: GTask[], filter?: (t: GTask) => boolean): Row[] {
  const kids = childrenOf(tasks);
  const rows: Row[] = [];
  const matches = new Set<string>();
  if (filter) {
    const byId = new Map(tasks.map(t => [t.id, t]));
    tasks.filter(filter).forEach(t => {
      let cur: GTask | undefined = t;
      while (cur) {
        matches.add(cur.id);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
    });
  }
  const walk = (pid: string | undefined, depth: number, prefix: string) => {
    (kids.get(pid) || []).forEach((t, i) => {
      const wbs = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
      const hasChildren = (kids.get(t.id) || []).length > 0;
      if (!filter || matches.has(t.id)) rows.push({task: t, depth, hasChildren, wbs});
      if (hasChildren && (filter ? true : !t.collapsed)) walk(t.id, depth + 1, wbs);
    });
  };
  walk(undefined, 0, '');
  return rows;
}

/** Push tasks later (never earlier) so each starts after everything it depends on has finished. */
export function scheduleDependents(tasks: GTask[]): GTask[] {
  const out = tasks.map(t => ({...t}));
  const byId = new Map(out.map(t => [t.id, t]));
  const kids = childrenOf(out);
  for (let pass = 0; pass < out.length + 1; pass++) {
    let changed = false;
    for (const t of out) {
      if (!t.dependencies.length || (kids.get(t.id) || []).length) continue;
      const earliest = Math.max(...t.dependencies.map(d => byId.get(d)).filter(Boolean).map(d => toDay(rollEnd(d!, byId, kids)) + 1));
      if (Number.isFinite(earliest) && toDay(t.start) < earliest) {
        const shift = earliest - toDay(t.start);
        t.start = fromDay(toDay(t.start) + shift);
        t.end = fromDay(toDay(t.end) + shift);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return out;
}

function rollEnd(t: GTask, byId: Map<string, GTask>, kids: Map<string | undefined, GTask[]>): string {
  const children = kids.get(t.id) || [];
  if (!children.length) return t.end;
  return children.map(c => rollEnd(byId.get(c.id)!, byId, kids)).reduce((a, b) => (a > b ? a : b));
}

/** Tasks with no slack: delaying any of them delays the finish date. */
export function criticalPath(tasks: GTask[]): Set<string> {
  const kids = childrenOf(tasks);
  const leaves = tasks.filter(t => !(kids.get(t.id) || []).length);
  if (!leaves.length) return new Set();
  const byId = new Map(tasks.map(t => [t.id, t]));
  // A dependency on a phase means a dependency on everything inside it
  const leafIdsOf = (id: string): string[] => {
    const c = kids.get(id) || [];
    return c.length ? c.flatMap(x => leafIdsOf(x.id)) : [id];
  };
  const succ = new Map<string, Set<string>>();
  leaves.forEach(t =>
    t.dependencies.forEach(d => {
      if (!byId.has(d)) return;
      leafIdsOf(d).forEach(p => {
        if (!succ.has(p)) succ.set(p, new Set());
        succ.get(p)!.add(t.id);
      });
    }),
  );
  const finish = Math.max(...leaves.map(t => toDay(t.end)));
  const latestFinish = new Map<string, number>();
  const lf = (id: string, guard = new Set<string>()): number => {
    if (latestFinish.has(id)) return latestFinish.get(id)!;
    if (guard.has(id)) return finish;
    guard.add(id);
    const s = succ.get(id);
    let v = finish;
    if (s && s.size) {
      v = Math.min(
        ...[...s].map(sid => {
          const st = byId.get(sid)!;
          return lf(sid, guard) - (toDay(st.end) - toDay(st.start)) - 1;
        }),
      );
    }
    latestFinish.set(id, v);
    return v;
  };
  const out = new Set<string>();
  leaves.forEach(t => {
    if (lf(t.id) - toDay(t.end) <= 0) out.add(t.id);
  });
  return out;
}

export const isLate = (t: GTask, today = todayDay()) => t.progress < 100 && toDay(t.end) < today;

export function planStats(rolled: GTask[]) {
  const kids = childrenOf(rolled);
  const leaves = rolled.filter(t => !(kids.get(t.id) || []).length);
  const work = leaves.filter(t => t.type !== 'milestone');
  const today = todayDay();
  let weight = 0;
  let sum = 0;
  work.forEach(t => {
    weight += duration(t);
    sum += duration(t) * t.progress;
  });
  const starts = rolled.map(t => toDay(t.start));
  const ends = rolled.map(t => toDay(t.end));
  const upcoming = rolled
    .filter(t => t.type === 'milestone' && t.progress < 100 && toDay(t.start) >= today)
    .sort((a, b) => toDay(a.start) - toDay(b.start))[0];
  return {
    progress: weight ? Math.round(sum / weight) : 0,
    total: work.length,
    done: work.filter(t => t.progress >= 100).length,
    late: leaves.filter(t => isLate(t, today)).length,
    start: starts.length ? fromDay(Math.min(...starts)) : null,
    end: ends.length ? fromDay(Math.max(...ends)) : null,
    nextMilestone: upcoming || null,
  };
}

export function toCsv(plan: Plan): string {
  const rows = buildRows(rollup(plan.tasks).map(t => ({...t, collapsed: false})));
  const byId = new Map(plan.tasks.map(t => [t.id, t]));
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['WBS', 'Name', 'Type', 'Start', 'End', 'Days', 'Progress %', 'Category', 'Assignee', 'Depends on', 'Notes'];
  const lines = rows.map(({task: t, wbs, hasChildren}) =>
    [wbs, t.name, hasChildren ? 'Phase' : t.type === 'milestone' ? 'Milestone' : 'Task', t.start, t.end, duration(t), t.progress, t.category, t.assignee, t.dependencies.map(d => byId.get(d)?.name || d).join('; '), t.notes]
      .map(esc)
      .join(','),
  );
  return [head.join(','), ...lines].join('\n');
}
