/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import {
  Archive,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Columns3,
  Flag,
  FolderKanban,
  Inbox,
  Layers,
  List,
  ListChecks,
  Maximize2,
  Minimize2,
  Plus,
  Repeat,
  Search,
  Send,
  Sparkles,
  Sun,
  Tag,
  Users,
  X,
} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import AssignWorkWindow from '../Notes/AssignWorkWindow';
import {api} from './api';
import CaptureModal, {CaptureSeed} from './CaptureModal';
import {saveTaskChanges} from './taskActions';
import {AssigneePill, CopySubjectButton, glowStyle, GlowToggles, LinkVendorButton, useTaskGroups, useVendorOptions} from './TaskExtras';
import {useTaskCollection} from './TaskProvider';
import {NoteContext, TaskEditor} from './TaskWorkspace';
import styles from './TaskWorkspace.module.css';
import {
  bucketOf,
  completedTime,
  daysUntil,
  DUE_GROUPS,
  DueGroup,
  dueGroupOf,
  formatDue,
  parseQuickAdd,
  PRIORITY_META,
  smartCompare,
  Status,
  statusOf,
  subtaskProgress,
  Task,
  TASK_BUCKETS,
  TaskBucket,
  vendorIdOf,
  vendorOf,
} from './types';

type SmartKey = 'today' | 'upcoming' | 'open' | 'followup' | 'done' | 'archive';
type Scope = {kind: 'smart'; key: SmartKey} | {kind: 'bucket'; key: TaskBucket} | {kind: 'group'; key: string};
type GroupBy = 'none' | 'due' | 'project' | 'category' | 'person' | 'priority';
type Mode = 'list' | 'board';
type Section = {key: string; label: string; tone: string; icon?: React.ReactNode; tasks: Task[]};

const SMART: {key: SmartKey; label: string; Icon: typeof Sun; tint: string}[] = [
  {key: 'today', label: 'Today', Icon: Sun, tint: 'text-amber-500'},
  {key: 'upcoming', label: 'Next 7 days', Icon: CalendarDays, tint: 'text-sky-500'},
  {key: 'open', label: 'All open', Icon: Inbox, tint: 'text-[#46674d]'},
  {key: 'followup', label: 'Follow up', Icon: Users, tint: 'text-teal-600'},
  {key: 'done', label: 'Completed', Icon: CheckCircle2, tint: 'text-emerald-500'},
  {key: 'archive', label: 'Archive', Icon: Archive, tint: 'text-slate-400'},
];
const GROUP_BY: {key: GroupBy; label: string}[] = [
  {key: 'due', label: 'Due date'},
  {key: 'project', label: 'Project / group'},
  {key: 'category', label: 'Category'},
  {key: 'person', label: 'Assignee'},
  {key: 'priority', label: 'Priority'},
  {key: 'none', label: 'No grouping'},
];
const DUE_TONE: Record<DueGroup, string> = {overdue: '#e11d48', today: '#d97706', tomorrow: '#0284c7', week: '#6366f1', later: '#64748b', none: '#94a3b8'};
const COLUMNS: {key: Status; label: string; tone: string}[] = [
  {key: 'todo', label: 'To do', tone: '#64748b'},
  {key: 'in-progress', label: 'In progress', tone: '#d97706'},
  {key: 'done', label: 'Done', tone: '#10b981'},
];

const scopeId = (s: Scope) => `${s.kind}:${s.key}`;
const isOpenTask = (t: Task) => !t.isArchived && statusOf(t) !== 'done';

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable
  }
}

/** Tasks as a pop-out window over /notes: smart views, list or board, grouping, and the full editor. */
export default function TasksWindow({note, onClose}: {note?: NoteContext; onClose: () => void}) {
  const {tasks, loading, busy, run, drafts, olderDone, loadOlderDone} = useTaskCollection();
  const vendors = useVendorOptions();
  const myGroups = useTaskGroups();
  const [scope, setScopeState] = useState<Scope>({kind: 'smart', key: 'today'});
  const [mode, setModeState] = useState<Mode>('list');
  const [groupOverride, setGroupOverride] = useState<Partial<Record<string, GroupBy>>>({});
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [quick, setQuick] = useState('');
  const [capture, setCapture] = useState<CaptureSeed | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [groupsOpen, setGroupsOpen] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Status | null>(null);
  const quickRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setScopeState(read<Scope>('TASKS_WINDOW_SCOPE', {kind: 'smart', key: 'today'}));
    setModeState(read<Mode>('TASKS_WINDOW_MODE', 'list'));
    setGroupOverride(read('TASKS_WINDOW_GROUPBY', {}));
    setMaximized(read('TASKS_WINDOW_MAX', false));
  }, []);
  const setScope = (s: Scope) => {
    setScopeState(s);
    setSelected(null);
    write('TASKS_WINDOW_SCOPE', s);
  };
  const setMode = (m: Mode) => {
    setModeState(m);
    write('TASKS_WINDOW_MODE', m);
  };

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  const live = useMemo(() => tasks.filter(t => !t.isTemplate), [tasks]);
  const groupName = useMemo(() => new Map((myGroups || []).map(g => [g._id, g.name])), [myGroups]);
  const groupKeyOf = (t: Task) => {
    const v = vendorIdOf(t);
    if (v) return `v:${v}`;
    if (t.taskGroupId && groupName.has(t.taskGroupId)) return `g:${t.taskGroupId}`;
    return 'none';
  };
  const groupMeta = (key: string) => {
    if (key.startsWith('v:')) {
      const id = key.slice(2);
      const opt = vendors?.find(v => v._id === id);
      const isProject = opt?.kind === 'project';
      const fromTask = live.find(t => vendorIdOf(t) === id);
      return {label: opt?.name || (fromTask && vendorOf(fromTask)?.name) || 'Linked', tone: isProject ? '#7655c4' : '#2f6db0', Icon: isProject ? FolderKanban : Building2};
    }
    if (key.startsWith('g:')) return {label: groupName.get(key.slice(2)) || 'Group', tone: '#c4882a', Icon: Tag};
    return {label: 'No group', tone: '#94a3b8', Icon: Inbox};
  };

  /** Which tasks belong to a scope, ignoring whether they're open or done (the board needs both). */
  const inScopeBase = (t: Task, s: Scope) => {
    if (s.kind === 'bucket') return bucketOf(t) === s.key;
    if (s.kind === 'group') return groupKeyOf(t) === s.key;
    const d = daysUntil(t.dueDate);
    switch (s.key) {
      case 'today':
        return d !== null && d <= 0;
      case 'upcoming':
        return d !== null && d >= 1 && d <= 7;
      case 'followup':
        return !!t.assignedTo?.name;
      default:
        return true;
    }
  };
  const inScope = (t: Task, s: Scope) => {
    if (!inScopeBase(t, s)) return false;
    if (s.kind === 'smart' && s.key === 'done') return !t.isArchived && statusOf(t) === 'done';
    if (s.kind === 'smart' && s.key === 'archive') return !!t.isArchived;
    return isOpenTask(t);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    const bump = (k: string) => (c[k] = (c[k] || 0) + 1);
    live.forEach(t => {
      SMART.forEach(s => inScope(t, {kind: 'smart', key: s.key}) && bump(`smart:${s.key}`));
      if (isOpenTask(t)) {
        bump(`bucket:${bucketOf(t)}`);
        bump(`group:${groupKeyOf(t)}`);
        if (daysUntil(t.dueDate) !== null && daysUntil(t.dueDate)! < 0) bump('overdue');
      }
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, groupName]);

  const railGroups = useMemo(() => {
    const keys = new Set<string>();
    live.filter(isOpenTask).forEach(t => keys.add(groupKeyOf(t)));
    (myGroups || []).forEach(g => keys.add(`g:${g._id}`));
    keys.delete('none');
    const rank = (k: string) => (k.startsWith('v:') ? (vendors?.find(v => v._id === k.slice(2))?.kind === 'project' ? 0 : 1) : 2);
    return [...keys].sort((a, b) => rank(a) - rank(b) || groupMeta(a).label.localeCompare(groupMeta(b).label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, myGroups, vendors]);

  const matchesQuery = (t: Task) => {
    const q = query.trim().toLowerCase();
    return !q || `${t.title} ${t.notes || ''} ${t.category || ''} ${t.assignedTo?.name || ''} ${t.emailSubject || ''} ${(t.tags || []).join(' ')}`.toLowerCase().includes(q);
  };

  const visible = useMemo(() => {
    const list = live.filter(t => inScope(t, scope) && matchesQuery(t));
    if (scope.kind === 'smart' && scope.key === 'done') return list.sort((a, b) => completedTime(b) - completedTime(a));
    if (scope.kind === 'smart' && scope.key === 'archive') return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list.sort(smartCompare);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, scope, query, groupName]);

  const defaultGroupBy: GroupBy =
    scope.kind === 'smart'
      ? ({today: 'due', upcoming: 'due', open: 'project', followup: 'person', done: 'none', archive: 'none'} as Record<SmartKey, GroupBy>)[scope.key]
      : scope.kind === 'bucket'
        ? 'project'
        : 'due';
  const groupBy = groupOverride[scopeId(scope)] || defaultGroupBy;
  const setGroupBy = (g: GroupBy) => {
    const next = {...groupOverride, [scopeId(scope)]: g};
    setGroupOverride(next);
    write('TASKS_WINDOW_GROUPBY', next);
  };

  const sections: Section[] = useMemo(() => {
    if (groupBy === 'none') return [{key: 'all', label: '', tone: '', tasks: visible}];
    const map = new Map<string, Section>();
    const add = (key: string, make: () => Omit<Section, 'tasks'>, t: Task) => {
      if (!map.has(key)) map.set(key, {...make(), tasks: []});
      map.get(key)!.tasks.push(t);
    };
    visible.forEach(t => {
      if (groupBy === 'due') {
        const g = dueGroupOf(t);
        add(g, () => ({key: g, label: DUE_GROUPS.find(x => x.key === g)!.label, tone: DUE_TONE[g]}), t);
      } else if (groupBy === 'project') {
        const k = groupKeyOf(t);
        add(k, () => {
          const m = groupMeta(k);
          return {key: k, label: m.label, tone: m.tone, icon: <m.Icon className="h-3.5 w-3.5" />};
        }, t);
      } else if (groupBy === 'category') {
        const b = bucketOf(t);
        add(b, () => ({key: b, label: TASK_BUCKETS.find(x => x.key === b)!.label, tone: '#46674d'}), t);
      } else if (groupBy === 'person') {
        const name = t.assignedTo?.name || '';
        add(name || '~', () => ({key: name || '~', label: name || 'Not assigned', tone: name ? '#1f8a7a' : '#94a3b8'}), t);
      } else {
        add(t.priority, () => ({key: t.priority, label: t.priority === 'None' ? 'No priority' : `${t.priority} priority`, tone: {High: '#e11d48', Medium: '#d97706', Low: '#0284c7', None: '#94a3b8'}[t.priority]}), t);
      }
    });
    const order = (s: Section) => {
      if (groupBy === 'due') return DUE_GROUPS.findIndex(g => g.key === s.key);
      if (groupBy === 'priority') return ['High', 'Medium', 'Low', 'None'].indexOf(s.key);
      if (groupBy === 'category') return TASK_BUCKETS.findIndex(b => b.key === s.key);
      if (groupBy === 'project') return s.key === 'none' ? 99 : s.key.startsWith('g:') ? 2 : groupMeta(s.key).tone === '#7655c4' ? 0 : 1;
      return s.key === '~' ? 99 : 0;
    };
    return [...map.values()].sort((a, b) => order(a) - order(b) || a.label.localeCompare(b.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, groupBy, groupName, vendors]);

  const boardTasks = useMemo(() => {
    const base = live.filter(t => inScopeBase(t, scope) && matchesQuery(t) && (scope.kind === 'smart' && scope.key === 'archive' ? t.isArchived : !t.isArchived));
    const cols: Record<Status, Task[]> = {todo: [], 'in-progress': [], done: []};
    base.forEach(t => cols[statusOf(t)].push(t));
    cols.todo.sort(smartCompare);
    cols['in-progress'].sort(smartCompare);
    cols.done.sort((a, b) => completedTime(b) - completedTime(a));
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, scope, query, groupName]);

  /* ── actions ── */
  const execute = async (key: string, action: () => Promise<unknown>) => {
    setError(null);
    try {
      await run(key, action);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
    }
  };
  const setStatus = (task: Task, status: Status) =>
    void execute(task._id, async () => {
      if (statusOf(task) === status) return;
      const result = await saveTaskChanges(task, {status, isCompleted: status === 'done'});
      if (result.warning) setError(result.warning);
      setNotice(status === 'done' ? 'Task completed' : status === 'in-progress' ? 'Moved to in progress' : 'Task reopened');
    });
  const toggle = (task: Task) => setStatus(task, statusOf(task) === 'done' ? 'todo' : 'done');

  /** What a new task starts with in the current view. */
  const scopeDefaults = (): Partial<Task> => {
    if (scope.kind === 'bucket') return {bucket: scope.key};
    if (scope.kind === 'group') return scope.key.startsWith('v:') ? {vendorSectionId: scope.key.slice(2)} : {taskGroupId: scope.key.slice(2)};
    return {bucket: 'work'};
  };
  const addQuick = () => {
    const text = quick.trim();
    if (!text || busy.includes('window-quick')) return;
    const parsed = parseQuickAdd(text);
    let dueDate = parsed.dueDate;
    if (!dueDate && scope.kind === 'smart' && (scope.key === 'today' || scope.key === 'upcoming')) {
      const d = new Date();
      d.setDate(d.getDate() + (scope.key === 'today' ? 0 : 1));
      d.setHours(17, 0, 0, 0);
      dueDate = d.toISOString();
    }
    void execute('window-quick', async () => {
      await api.create({
        title: parsed.title || text,
        priority: parsed.priority,
        status: 'todo',
        isCompleted: false,
        ...(dueDate ? {dueDate} : {}),
        ...(parsed.tags.length ? {tags: parsed.tags} : {}),
        ...(parsed.category ? {category: parsed.category} : {}),
        ...(parsed.estimatedTime ? {estimatedTime: parsed.estimatedTime} : {}),
        ...scopeDefaults(),
      });
      setQuick('');
      setNotice('Task added');
    });
  };

  // Keyboard: Esc closes the panel, then the window; / searches; N adds
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName || '') || (e.target as HTMLElement)?.isContentEditable;
      if (capture || assigning) return;
      if (e.key === 'Escape') {
        if (typing) (e.target as HTMLElement).blur();
        else if (selected) setSelected(null);
        else onClose();
      } else if (!typing && e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (!typing && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        quickRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, capture, assigning, onClose]);

  const selectedTask = selected && selected !== 'new' ? tasks.find(t => t._id === selected) : undefined;
  const title =
    scope.kind === 'smart'
      ? SMART.find(s => s.key === scope.key)!.label
      : scope.kind === 'bucket'
        ? TASK_BUCKETS.find(b => b.key === scope.key)!.label
        : groupMeta(scope.key).label;
  const todayLabel = new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'});
  const isDoneScope = scope.kind === 'smart' && (scope.key === 'done' || scope.key === 'archive');

  /* ── pieces ── */
  const railItem = (s: Scope, label: string, icon: React.ReactNode, count?: number, alert?: boolean) => {
    const active = scopeId(s) === scopeId(scope);
    return (
      <button
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] transition ${active ? 'bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'}`}
        key={scopeId(s)}
        onClick={() => setScope(s)}
        type="button">
        <span className="flex w-4 shrink-0 justify-center">{icon}</span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {!!count && <span className={`rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums ${alert ? 'bg-rose-100 text-rose-700' : 'text-slate-400'}`}>{count}</span>}
      </button>
    );
  };

  const meta = (t: Task, compact = false) => {
    const d = daysUntil(t.dueDate);
    const done = statusOf(t) === 'done';
    const {done: sd, total: st} = subtaskProgress(t);
    const linkKey = groupKeyOf(t);
    const showLink = linkKey !== 'none' && !(groupBy === 'project' && !compact) && !(scope.kind === 'group');
    const link = showLink ? groupMeta(linkKey) : null;
    const chip = 'inline-flex items-center gap-1 rounded-md px-1.5 py-[2px] text-[11px] font-medium';
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {t.dueDate && !done && (
          <span className={`${chip} ${d! < 0 ? 'bg-rose-50 text-rose-700' : d === 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
            <CalendarClock className="h-3 w-3" />
            {formatDue(t.dueDate)}
          </span>
        )}
        {done && t.completedAt && <span className={`${chip} bg-emerald-50 text-emerald-700`}>Done {new Date(t.completedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>}
        {t.priority !== 'None' && (
          <span className={`${chip} ring-1 ${PRIORITY_META[t.priority].chip}`}>
            <Flag className="h-3 w-3" />
            {t.priority}
          </span>
        )}
        {st > 0 && (
          <span className={`${chip} ${sd === st ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            <ListChecks className="h-3 w-3" />
            {sd}/{st}
          </span>
        )}
        {statusOf(t) === 'in-progress' && mode === 'list' && <span className={`${chip} bg-amber-50 text-amber-700`}>In progress</span>}
        {t.recurrence?.freq && t.recurrence.freq !== 'none' && (
          <span className={`${chip} bg-slate-100 text-slate-500`} title="Repeats">
            <Repeat className="h-3 w-3" />
          </span>
        )}
        {link && (
          <span className={`${chip} bg-white ring-1 ring-slate-200`} style={{color: link.tone}}>
            <link.Icon className="h-3 w-3" />
            {link.label}
          </span>
        )}
        {groupBy !== 'person' && <AssigneePill assignee={t.assignedTo} />}
      </div>
    );
  };

  const row = (t: Task) => {
    const done = statusOf(t) === 'done';
    const isSel = selected === t._id;
    return (
      <div
        className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${isSel ? 'border-[#cbd9bf] bg-[#f1f6ec]' : 'border-transparent hover:border-slate-200 hover:bg-slate-50/80'}`}
        key={t._id}
        onClick={() => setSelected(t._id)}
        style={glowStyle(t)}>
        <button
          aria-label={done ? `Reopen ${t.title}` : `Complete ${t.title}`}
          className={`mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2 transition ${done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500'}`}
          disabled={busy.includes(t._id)}
          onClick={e => {
            e.stopPropagation();
            toggle(t);
          }}
          type="button">
          <Check className="h-3 w-3" strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-[13.5px] leading-snug ${done ? 'text-slate-400 line-through decoration-slate-300' : 'font-medium text-slate-800'}`}>
            {t.title}
            {drafts[t._id] && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" title="Unsaved edits" />}
          </p>
          {t.notes && <p className="mt-0.5 line-clamp-1 text-[12px] text-slate-400">{t.notes}</p>}
          {meta(t)}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition group-hover:opacity-100" onClick={e => e.stopPropagation()}>
          {!vendorIdOf(t) && <span className="hidden group-hover:inline-flex"><LinkVendorButton task={t} /></span>}
          <CopySubjectButton size={13} subject={t.emailSubject} />
          <GlowToggles size={12} task={t} />
        </div>
      </div>
    );
  };

  const card = (t: Task) => (
    <div
      className={`group cursor-grab rounded-xl border bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-px hover:shadow-md active:cursor-grabbing ${selected === t._id ? 'border-[#9fbf8c] ring-2 ring-[#cfe0c2]' : 'border-slate-200'}`}
      draggable
      key={t._id}
      onClick={() => setSelected(t._id)}
      onDragStart={e => {
        e.dataTransfer.setData('text/task-id', t._id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      style={glowStyle(t)}>
      <div className="flex items-start gap-2">
        <p className={`min-w-0 flex-1 text-[13px] leading-snug ${statusOf(t) === 'done' ? 'text-slate-400 line-through' : 'font-medium text-slate-800'}`}>{t.title}</p>
        <span onClick={e => e.stopPropagation()}>
          <CopySubjectButton size={12} subject={t.emailSubject} />
        </span>
      </div>
      {meta(t, true)}
    </div>
  );

  const emptyText =
    query.trim()
      ? 'Nothing matches that search.'
      : scope.kind === 'smart'
        ? {today: 'Nothing due today. Enjoy the clear runway.', upcoming: 'Nothing due in the next 7 days.', open: 'No open tasks. Add one above.', followup: 'Nothing you have assigned is open. Use Assign work to hand something off.', done: 'Tasks you complete show up here.', archive: 'Archived tasks show up here.'}[scope.key]
        : 'No open tasks here yet. Add one above.';

  const frame = maximized ? 'h-[96vh] w-[97vw]' : 'h-[92vh] w-[96vw] md:h-[80vh] md:w-[80vw]';

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/35 backdrop-blur-[3px]" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div aria-label="Tasks" aria-modal className={`relative flex overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] transition-[width,height] duration-200 ${frame}`} role="dialog" style={{fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}}>
        {/* Rail */}
        <aside className="hidden w-[232px] shrink-0 flex-col border-r border-slate-200 bg-[#f6f7f2] md:flex">
          <div className="px-4 pb-3 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{todayLabel}</p>
            <h2 className="mt-0.5 text-[20px] font-semibold tracking-tight text-slate-900">Tasks</h2>
          </div>
          <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 pb-4">
            <div className="space-y-0.5">
              {SMART.map(s => railItem({kind: 'smart', key: s.key}, s.label, <s.Icon className={`h-4 w-4 ${s.tint}`} />, s.key === 'done' || s.key === 'archive' ? undefined : counts[`smart:${s.key}`], s.key === 'today' && !!counts.overdue))}
            </div>
            <div>
              <p className="mb-1 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">Categories</p>
              <div className="space-y-0.5">
                {TASK_BUCKETS.map(b => railItem({kind: 'bucket', key: b.key}, b.label, <Layers className="h-4 w-4 text-[#6b885c]" />, counts[`bucket:${b.key}`]))}
              </div>
            </div>
            {railGroups.length > 0 && (
              <div>
                <button className="mb-1 flex w-full items-center gap-1 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400 hover:text-slate-600" onClick={() => setGroupsOpen(v => !v)} type="button">
                  Projects & groups
                  <ChevronDown className={`ml-auto h-3 w-3 transition ${groupsOpen ? '' : '-rotate-90'}`} />
                </button>
                {groupsOpen && (
                  <div className="space-y-0.5">
                    {railGroups.map(k => {
                      const m = groupMeta(k);
                      return railItem({kind: 'group', key: k}, m.label, <m.Icon className="h-4 w-4" style={{color: m.tone}} />, counts[`group:${k}`]);
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>
          <div className="border-t border-slate-200 px-4 py-3 text-[11px] leading-relaxed text-slate-400">
            <kbd className="rounded border border-slate-300 bg-white px-1 font-sans text-[10px]">N</kbd> new task · <kbd className="rounded border border-slate-300 bg-white px-1 font-sans text-[10px]">/</kbd> search · <kbd className="rounded border border-slate-300 bg-white px-1 font-sans text-[10px]">Esc</kbd> close
          </div>
        </aside>

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
            <div className="mr-auto min-w-0">
              <h3 className="truncate text-[18px] font-semibold tracking-tight text-slate-900">{title}</h3>
              <p className="text-[12px] text-slate-400">
                {loading && !tasks.length ? 'Loading…' : `${mode === 'board' ? Object.values(boardTasks).flat().length : visible.length} task${visible.length === 1 ? '' : 's'}`}
                {scope.kind === 'smart' && scope.key === 'today' && counts.overdue ? <span className="ml-1.5 font-medium text-rose-600">· {counts.overdue} overdue</span> : null}
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 focus-within:border-[#9fbf8c] focus-within:bg-white">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input className="w-40 border-0 bg-transparent p-0 text-[12.5px] outline-none placeholder:text-slate-400" onChange={e => setQuery(e.target.value)} placeholder="Search  /" ref={searchRef} value={query} />
              {query && (
                <button onClick={() => setQuery('')} type="button">
                  <X className="h-3.5 w-3.5 text-slate-400" />
                </button>
              )}
            </div>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(['list', 'board'] as Mode[]).map(m => (
                <button className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`} key={m} onClick={() => setMode(m)} type="button">
                  {m === 'list' ? <List className="h-3.5 w-3.5" /> : <Columns3 className="h-3.5 w-3.5" />}
                  {m === 'list' ? 'List' : 'Board'}
                </button>
              ))}
            </div>
            {mode === 'list' && (
              <select className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-2.5 pr-7 text-[12px] font-semibold text-slate-600 outline-none focus:border-[#9fbf8c]" onChange={e => setGroupBy(e.target.value as GroupBy)} title="Group by" value={groupBy}>
                {GROUP_BY.map(g => (
                  <option key={g.key} value={g.key}>
                    {g.key === 'none' ? g.label : `Group: ${g.label}`}
                  </option>
                ))}
              </select>
            )}
            <span className="mx-0.5 h-6 w-px bg-slate-200" />
            <button className="rounded-lg bg-[#efeafb] p-2 text-[#6d5bb5] hover:bg-[#e4dcf8]" onClick={() => setCapture({})} title="Paste an email or notes, Gemini writes the task" type="button">
              <Sparkles className="h-4 w-4" />
            </button>
            <button className="rounded-lg bg-[#e3f4f1] p-2 text-[#1f8a7a] hover:bg-[#cdebe5]" onClick={() => setAssigning(true)} title="Assign work to someone" type="button">
              <Send className="h-4 w-4" />
            </button>
            <button className="flex items-center gap-1.5 rounded-lg bg-[#46674d] px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-[#385840]" onClick={() => setSelected('new')} type="button">
              <Plus className="h-4 w-4" /> New task
            </button>
            <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setMaximized(v => (write('TASKS_WINDOW_MAX', !v), !v))} title={maximized ? 'Restore size' : 'Fill the screen'} type="button">
              {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose} title="Close (Esc)" type="button">
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* Phones/tablets: views as chips since the rail is hidden */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-2 md:hidden">
            {SMART.map(s => (
              <button className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${scopeId(scope) === `smart:${s.key}` ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`} key={s.key} onClick={() => setScope({kind: 'smart', key: s.key})} type="button">
                {s.label}
              </button>
            ))}
          </div>

          {!isDoneScope && (
            <form
              className="mx-5 mt-3 flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-3 py-2 focus-within:border-solid focus-within:border-[#9fbf8c] focus-within:bg-white focus-within:shadow-sm"
              onSubmit={e => {
                e.preventDefault();
                addQuick();
              }}>
              <Plus className="h-4 w-4 text-slate-400" />
              <input
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] outline-none placeholder:text-slate-400"
                onChange={e => setQuick(e.target.value)}
                onPaste={e => {
                  const image = Array.from(e.clipboardData.files).find(f => f.type.startsWith('image/'));
                  const pasted = e.clipboardData.getData('text');
                  if (image || /\n/.test(pasted.trim()) || pasted.trim().length > 120) {
                    e.preventDefault();
                    setCapture(image ? {file: image} : {text: pasted});
                  }
                }}
                placeholder={`Add a task to ${title}… try “Call vendor tomorrow !high”, or paste an email for AI`}
                ref={quickRef}
                value={quick}
              />
              {quick.trim() && (
                <button className="rounded-lg bg-[#46674d] px-2.5 py-1 text-[12px] font-semibold text-white" disabled={busy.includes('window-quick')} type="submit">
                  Add
                </button>
              )}
            </form>
          )}

          {error && (
            <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
              {error}
              <button className="ml-auto" onClick={() => setError(null)} type="button">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-3">
            {loading && !tasks.length ? (
              <div className="space-y-2 pt-2">
                {Array.from({length: 6}).map((_, i) => (
                  <div className="h-14 animate-pulse rounded-xl bg-slate-100" key={i} />
                ))}
              </div>
            ) : mode === 'board' ? (
              <div className="grid h-full min-h-[300px] grid-cols-1 gap-3 md:grid-cols-3">
                {COLUMNS.map(col => (
                  <div
                    className={`flex min-h-0 flex-col rounded-2xl border p-2.5 transition ${dragOver === col.key ? 'border-[#9fbf8c] bg-[#f1f6ec]' : 'border-slate-200 bg-slate-50/70'}`}
                    key={col.key}
                    onDragLeave={() => setDragOver(d => (d === col.key ? null : d))}
                    onDragOver={e => {
                      if (!e.dataTransfer.types.includes('text/task-id')) return;
                      e.preventDefault();
                      setDragOver(col.key);
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      setDragOver(null);
                      const t = tasks.find(x => x._id === e.dataTransfer.getData('text/task-id'));
                      if (t) setStatus(t, col.key);
                    }}>
                    <div className="mb-2 flex items-center gap-2 px-1">
                      <span className="h-2 w-2 rounded-full" style={{background: col.tone}} />
                      <span className="text-[12.5px] font-semibold text-slate-700">{col.label}</span>
                      <span className="text-[11.5px] font-medium text-slate-400">{boardTasks[col.key].length}</span>
                    </div>
                    <div className="min-h-[60px] flex-1 space-y-2 overflow-y-auto pr-0.5">
                      {boardTasks[col.key].map(card)}
                      {!boardTasks[col.key].length && <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-[12px] text-slate-400">Drop tasks here</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : !visible.length ? (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef3e8] text-[#6b885c]">
                  <CheckCircle2 className="h-7 w-7" />
                </span>
                <p className="mt-3 text-[14px] font-semibold text-slate-700">All clear</p>
                <p className="mt-1 max-w-xs text-[12.5px] text-slate-500">{emptyText}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map(sec => {
                  const isCollapsed = collapsed.includes(`${scopeId(scope)}|${sec.key}`);
                  return (
                    <section key={sec.key}>
                      {sec.label && (
                        <button
                          className="sticky top-0 z-10 -mx-1 mb-1 flex w-[calc(100%+0.5rem)] items-center gap-2 bg-white/95 px-1 py-1.5 text-left backdrop-blur"
                          onClick={() => {
                            const k = `${scopeId(scope)}|${sec.key}`;
                            setCollapsed(c => (c.includes(k) ? c.filter(x => x !== k) : [...c, k]));
                          }}
                          type="button">
                          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${isCollapsed ? '-rotate-90' : ''}`} />
                          <span className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{color: sec.tone}}>
                            {sec.icon || <span className="h-2 w-2 rounded-full" style={{background: sec.tone}} />}
                            {sec.label}
                          </span>
                          <span className="text-[11.5px] font-medium text-slate-400">{sec.tasks.length}</span>
                          <span className="ml-2 h-px flex-1 bg-slate-100" />
                        </button>
                      )}
                      {!isCollapsed && <div className="space-y-1">{sec.tasks.map(row)}</div>}
                    </section>
                  );
                })}
                {scope.kind === 'smart' && scope.key === 'done' && !olderDone.loaded && olderDone.hidden > 0 && (
                  <div className="flex justify-center pt-2">
                    <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50" disabled={busy.includes('older-done')} onClick={() => void execute('older-done', loadOlderDone)} type="button">
                      {busy.includes('older-done') ? 'Loading…' : `Load ${olderDone.hidden} older completed`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Detail */}
        {(selected === 'new' || selectedTask) && (
          <section className="absolute inset-y-0 right-0 z-20 w-full max-w-[440px] overflow-y-auto border-l border-slate-200 bg-[#fffefa] shadow-[-12px_0_30px_-18px_rgba(15,23,42,0.35)] lg:static lg:shadow-none">
            <div className={`${styles.workspace} ${styles.compact}`} style={{display: 'block', height: 'auto'}}>
              <TaskEditor
                defaults={scopeDefaults()}
                draftKey={`window-new-${scopeId(scope)}`}
                key={selected === 'new' ? `new-${scopeId(scope)}` : selected!}
                note={note}
                onClose={() => setSelected(null)}
                task={selectedTask}
              />
            </div>
          </section>
        )}

        {notice && <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full bg-slate-900 px-3.5 py-1.5 text-[12.5px] font-medium text-white shadow-lg">{notice}</div>}
      </div>

      {assigning && <AssignWorkWindow onClose={() => setAssigning(false)} />}
      {capture && (
        <CaptureModal
          defaults={scopeDefaults()}
          onClose={() => setCapture(null)}
          onCreated={task => {
            setCapture(null);
            setSelected(task._id);
            setNotice('AI task added');
          }}
          seed={capture}
        />
      )}
    </div>,
    document.body,
  );
}
