/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import {
  Archive,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Columns3,
  FileText,
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
  Tag,
  UserRound,
  X,
} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import AssignWorkWindow from '../Notes/AssignWorkWindow';
import {api} from './api';
import CaptureModal, {CaptureSeed} from './CaptureModal';
import {saveTaskChanges} from './taskActions';
import {CopySubjectButton, glowStyle, GlowToggles, initialsOf, LinkVendorButton, useTaskGroups, useVendorOptions} from './TaskExtras';
import {TaskPageView} from './TaskPage';
import {useTaskCollection} from './TaskProvider';
import {NoteContext, TaskEditor} from './TaskWorkspace';
import styles from './TaskWorkspace.module.css';
import {
  bucketOf,
  completedTime,
  daysUntil,
  DUE_GROUPS,
  dueGroupOf,
  formatDue,
  parseQuickAdd,
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

type SmartKey = 'open' | 'done' | 'archive';
type Scope = {kind: 'smart'; key: SmartKey} | {kind: 'bucket'; key: TaskBucket} | {kind: 'group'; key: string};
type GroupBy = 'none' | 'project' | 'category' | 'person' | 'priority' | 'due';
type BoardBy = 'category' | 'project' | 'status';
type Mode = 'list' | 'board';
type Tone = {bg: string; line: string; accent: string; ink: string};
type Lane = {key: string; label: string; kind: string; tone: Tone; Icon: typeof Tag; tasks: Task[]};

const SMART: {key: SmartKey; label: string; Icon: typeof Inbox}[] = [
  {key: 'open', label: 'All tasks', Icon: Inbox},
  {key: 'done', label: 'Completed', Icon: CheckCircle2},
  {key: 'archive', label: 'Archive', Icon: Archive},
];
const GROUP_BY: {key: GroupBy; label: string}[] = [
  {key: 'project', label: 'Project / group'},
  {key: 'category', label: 'Category'},
  {key: 'person', label: 'Assignee'},
  {key: 'priority', label: 'Priority'},
  {key: 'due', label: 'Due date'},
  {key: 'none', label: 'No grouping'},
];
const BOARD_BY: {key: BoardBy; label: string}[] = [
  {key: 'category', label: 'Categories'},
  {key: 'project', label: 'Projects & groups'},
  {key: 'status', label: 'Status'},
];

// Same tinted-banner palette as the sidebar's group headers
const TONES: Record<string, Tone> = {
  project: {bg: '#f3eefc', line: '#e2d8f6', accent: '#7655c4', ink: '#3f2a78'},
  vendor: {bg: '#eaf2fb', line: '#d3e3f4', accent: '#2f6db0', ink: '#1f4a78'},
  mine: {bg: '#fdf4e3', line: '#f1e0bd', accent: '#c4882a', ink: '#6b4a12'},
  none: {bg: '#f1f3ec', line: '#e3e7dc', accent: '#9aa58e', ink: '#5f6a57'},
  person: {bg: '#e3f4f1', line: '#bfe3dc', accent: '#1f8a7a', ink: '#145c52'},
  work: {bg: '#e9f0e4', line: '#d3e0c9', accent: '#46674d', ink: '#2f4c33'},
  'personal-short': {bg: '#e7f0f6', line: '#cfe0ec', accent: '#3c7a9e', ink: '#244e66'},
  'personal-long': {bg: '#eeebf6', line: '#dcd6ec', accent: '#6a5ca8', ink: '#40366e'},
  career: {bg: '#f6ece6', line: '#ebd8cc', accent: '#a5603c', ink: '#6b3a20'},
  high: {bg: '#fdecee', line: '#f7d0d5', accent: '#e11d48', ink: '#8a1530'},
  medium: {bg: '#fdf3e2', line: '#f4e0b8', accent: '#d97706', ink: '#7a4407'},
  low: {bg: '#e8f3fb', line: '#cfe3f3', accent: '#0284c7', ink: '#0b4a6e'},
  todo: {bg: '#f1f3f5', line: '#e2e6ea', accent: '#64748b', ink: '#334155'},
  'in-progress': {bg: '#fdf3e2', line: '#f4e0b8', accent: '#d97706', ink: '#7a4407'},
  done: {bg: '#e7f6ee', line: '#c9ebd7', accent: '#10b981', ink: '#0f5c3f'},
};
const STATUS_COLS: {key: Status; label: string}[] = [
  {key: 'todo', label: 'To do'},
  {key: 'in-progress', label: 'In progress'},
  {key: 'done', label: 'Done'},
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

/** Tasks as a pop-out window over /notes: all tasks by default, list or board, and the full editor. */
export default function TasksWindow({note, onClose}: {note?: NoteContext; onClose: () => void}) {
  const {tasks, loading, busy, run, drafts, olderDone, loadOlderDone} = useTaskCollection();
  const vendors = useVendorOptions();
  const myGroups = useTaskGroups();
  const [scope, setScopeState] = useState<Scope>({kind: 'smart', key: 'open'});
  const [mode, setModeState] = useState<Mode>('board');
  const [groupOverride, setGroupOverride] = useState<Partial<Record<string, GroupBy>>>({});
  const [boardBy, setBoardByState] = useState<BoardBy>('project');
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
  const [dragOver, setDragOver] = useState<string | null>(null);
  const quickRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Always opens on All tasks as a board of projects & groups; switches last only while it's open
    setGroupOverride(read('TASKS_WINDOW_GROUPBY_V2', {}));
    setMaximized(read('TASKS_WINDOW_MAX', false));
  }, []);
  const setScope = (s: Scope) => {
    setScopeState(s);
    setSelected(null);
  };
  const setMode = (m: Mode) => {
    setModeState(m);
  };
  const setBoardBy = (b: BoardBy) => {
    setBoardByState(b);
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
  const groupMeta = (key: string): {label: string; kind: string; Icon: typeof Tag} => {
    if (key.startsWith('v:')) {
      const id = key.slice(2);
      const opt = vendors?.find(v => v._id === id);
      const fromTask = live.find(t => vendorIdOf(t) === id);
      const isProject = opt?.kind === 'project';
      return {label: opt?.name || (fromTask && vendorOf(fromTask)?.name) || 'Linked', kind: isProject ? 'project' : 'vendor', Icon: isProject ? FolderKanban : Building2};
    }
    if (key.startsWith('g:')) return {label: groupName.get(key.slice(2)) || 'Group', kind: 'mine', Icon: Tag};
    return {label: 'No group', kind: 'none', Icon: Inbox};
  };

  const inScope = (t: Task, s: Scope) => {
    if (s.kind === 'smart' && s.key === 'done') return !t.isArchived && statusOf(t) === 'done';
    if (s.kind === 'smart' && s.key === 'archive') return !!t.isArchived;
    if (!isOpenTask(t)) return false;
    if (s.kind === 'bucket') return bucketOf(t) === s.key;
    if (s.kind === 'group') return groupKeyOf(t) === s.key;
    return true;
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    const bump = (k: string) => (c[k] = (c[k] || 0) + 1);
    live.forEach(t => {
      if (!isOpenTask(t)) return;
      bump('smart:open');
      bump(`bucket:${bucketOf(t)}`);
      bump(`group:${groupKeyOf(t)}`);
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, groupName]);

  const allGroupKeys = useMemo(() => {
    const keys = new Set<string>();
    live.filter(isOpenTask).forEach(t => keys.add(groupKeyOf(t)));
    (myGroups || []).forEach(g => keys.add(`g:${g._id}`));
    keys.delete('none');
    const rank = (k: string) => ({project: 0, vendor: 1, mine: 2, none: 3}[groupMeta(k).kind] ?? 3);
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

  const isDoneScope = scope.kind === 'smart' && scope.key !== 'open';
  const defaultGroupBy: GroupBy = isDoneScope ? 'none' : scope.kind === 'group' ? 'category' : 'project';
  const groupBy = groupOverride[scopeId(scope)] || defaultGroupBy;
  const setGroupBy = (g: GroupBy) => {
    const next = {...groupOverride, [scopeId(scope)]: g};
    setGroupOverride(next);
    write('TASKS_WINDOW_GROUPBY_V2', next);
  };

  /** Build lanes (list sections or board columns) for a grouping. */
  const lanesFor = (by: GroupBy | BoardBy, list: Task[], keepEmpty: boolean): Lane[] => {
    const lanes = new Map<string, Lane>();
    const ensure = (key: string, make: () => Omit<Lane, 'tasks'>) => {
      if (!lanes.has(key)) lanes.set(key, {...make(), tasks: []});
      return lanes.get(key)!;
    };
    const catLane = (b: TaskBucket) => () => ({key: b, label: TASK_BUCKETS.find(x => x.key === b)!.label, kind: 'category', tone: TONES[b], Icon: Layers});
    const groupLane = (k: string) => () => {
      const m = groupMeta(k);
      return {key: k, label: m.label, kind: m.kind, tone: TONES[m.kind], Icon: m.Icon};
    };
    if (keepEmpty && by === 'category') TASK_BUCKETS.forEach(b => ensure(b.key, catLane(b.key)));
    if (keepEmpty && by === 'project') [...allGroupKeys, 'none'].forEach(k => ensure(k, groupLane(k)));
    if (keepEmpty && by === 'status') STATUS_COLS.forEach(s => ensure(s.key, () => ({key: s.key, label: s.label, kind: 'status', tone: TONES[s.key], Icon: s.key === 'done' ? CheckCircle2 : Inbox})));
    list.forEach(t => {
      if (by === 'category') ensure(bucketOf(t), catLane(bucketOf(t))).tasks.push(t);
      else if (by === 'project') ensure(groupKeyOf(t), groupLane(groupKeyOf(t))).tasks.push(t);
      else if (by === 'status') ensure(statusOf(t), () => ({key: statusOf(t), label: STATUS_COLS.find(s => s.key === statusOf(t))!.label, kind: 'status', tone: TONES[statusOf(t)], Icon: Inbox})).tasks.push(t);
      else if (by === 'person') {
        const name = t.assignedTo?.name || '';
        ensure(name || '~', () => ({key: name || '~', label: name || 'Not assigned', kind: 'person', tone: name ? TONES.person : TONES.none, Icon: UserRound})).tasks.push(t);
      } else if (by === 'priority') {
        const p = t.priority;
        ensure(p, () => ({key: p, label: p === 'None' ? 'No priority' : `${p} priority`, kind: 'priority', tone: TONES[p.toLowerCase()] || TONES.none, Icon: Tag})).tasks.push(t);
      } else if (by === 'due') {
        const g = dueGroupOf(t);
        ensure(g, () => ({key: g, label: DUE_GROUPS.find(x => x.key === g)!.label, kind: 'due', tone: g === 'overdue' ? TONES.high : g === 'today' ? TONES.medium : TONES.none, Icon: Tag})).tasks.push(t);
      } else ensure('all', () => ({key: 'all', label: '', kind: 'none', tone: TONES.none, Icon: Inbox})).tasks.push(t);
    });
    const order = (l: Lane) => {
      if (by === 'category') return TASK_BUCKETS.findIndex(b => b.key === l.key);
      if (by === 'project') return l.key === 'none' ? 99 : ({project: 0, vendor: 1, mine: 2}[l.kind] ?? 3);
      if (by === 'status') return STATUS_COLS.findIndex(s => s.key === l.key);
      if (by === 'priority') return ['High', 'Medium', 'Low', 'None'].indexOf(l.key);
      if (by === 'due') return DUE_GROUPS.findIndex(g => g.key === l.key);
      return l.key === '~' ? 99 : 0;
    };
    return [...lanes.values()].sort((a, b) => order(a) - order(b) || (by === 'category' || by === 'status' ? 0 : a.label.localeCompare(b.label)));
  };

  const sections = useMemo(() => lanesFor(groupBy, visible, false), [groupBy, visible, allGroupKeys]); // eslint-disable-line react-hooks/exhaustive-deps
  const boardLanes = useMemo(() => {
    // Status columns need done tasks too; the other boards show what the current view shows
    const list = boardBy === 'status' && !isDoneScope ? live.filter(t => !t.isArchived && matchesQuery(t) && (scope.kind === 'bucket' ? bucketOf(t) === scope.key : scope.kind === 'group' ? groupKeyOf(t) === scope.key : true)) : visible;
    return lanesFor(boardBy, list, true).filter(l => !(boardBy === 'category' && scope.kind === 'bucket' && l.key !== scope.key) && !(boardBy === 'project' && scope.kind === 'group' && l.key !== scope.key));
  }, [boardBy, visible, live, scope, query, allGroupKeys]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /** Dropping a card on a board column re-files it there. */
  const dropOn = (lane: Lane, task: Task) => {
    if (boardBy === 'status') return setStatus(task, lane.key as Status);
    if (boardBy === 'category') {
      if (bucketOf(task) === lane.key) return;
      return void execute(task._id, async () => {
        await api.update(task._id, {bucket: lane.key});
        setNotice(`Moved to ${lane.label}`);
      });
    }
    if (groupKeyOf(task) === lane.key) return;
    const patch = lane.key === 'none' ? {vendorSectionId: null, taskGroupId: null} : lane.key.startsWith('v:') ? {vendorSectionId: lane.key.slice(2), taskGroupId: null} : {vendorSectionId: null, taskGroupId: lane.key.slice(2)};
    void execute(task._id, async () => {
      await api.update(task._id, patch);
      setNotice(`Moved to ${lane.label}`);
    });
  };

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
    void execute('window-quick', async () => {
      await api.create({
        title: parsed.title || text,
        priority: parsed.priority,
        status: 'todo',
        isCompleted: false,
        ...(parsed.dueDate ? {dueDate: parsed.dueDate} : {}),
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
  const title = scope.kind === 'smart' ? SMART.find(s => s.key === scope.key)!.label : scope.kind === 'bucket' ? TASK_BUCKETS.find(b => b.key === scope.key)!.label : groupMeta(scope.key).label;
  const shownCount = mode === 'board' ? boardLanes.reduce((n, l) => n + l.tasks.length, 0) : visible.length;

  /* ── pieces ── */
  const railItem = (s: Scope, label: string, icon: React.ReactNode, count?: number) => {
    const active = scopeId(s) === scopeId(scope);
    return (
      <button
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] transition ${active ? 'bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'}`}
        key={scopeId(s)}
        onClick={() => setScope(s)}
        type="button">
        <span className="flex w-4 shrink-0 justify-center">{icon}</span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {!!count && <span className="text-[10.5px] font-semibold tabular-nums text-slate-400">{count}</span>}
      </button>
    );
  };

  /** Bold tinted heading, the same look as the sidebar's group banners. */
  const banner = (lane: Lane, opts: {collapsible?: boolean; isCollapsed?: boolean; onToggle?: () => void}) => (
    <div
      className={`flex items-center gap-2.5 rounded-xl border py-2 pl-2.5 pr-3 ${opts.collapsible ? 'cursor-pointer select-none' : ''}`}
      onClick={opts.onToggle}
      style={{background: lane.tone.bg, borderColor: lane.tone.line, boxShadow: `inset 3px 0 0 ${lane.tone.accent}`}}>
      {opts.collapsible && <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition ${opts.isCollapsed ? '-rotate-90' : ''}`} style={{color: lane.tone.accent}} />}
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white" style={{background: lane.tone.accent}}>
        {lane.kind === 'person' && lane.key !== '~' ? <span className="text-[9.5px] font-bold">{initialsOf(lane.label)}</span> : <lane.Icon className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold" style={{color: lane.tone.ink}}>
        {lane.label}
      </span>
      <span className="rounded-full border bg-white/80 px-2 text-[11px] font-bold leading-[18px]" style={{color: lane.tone.ink, borderColor: lane.tone.line}}>
        {lane.tasks.length}
      </span>
    </div>
  );

  const dueText = (t: Task) => {
    if (!t.dueDate || statusOf(t) === 'done') return null;
    const d = daysUntil(t.dueDate)!;
    return <span className={`text-[12px] tabular-nums ${d < 0 ? 'font-semibold text-rose-600' : d === 0 ? 'font-semibold text-amber-600' : 'text-slate-500'}`}>{formatDue(t.dueDate)}</span>;
  };
  const priorityDot = (t: Task) =>
    t.priority === 'None' ? null : <span className="h-2 w-2 shrink-0 rounded-full" style={{background: {High: '#e11d48', Medium: '#f59e0b', Low: '#0ea5e9'}[t.priority]}} title={`${t.priority} priority`} />;
  const avatar = (t: Task) =>
    t.assignedTo?.name ? (
      <span className="flex items-center gap-1.5 text-[12px] text-slate-600" title={`Assigned to ${t.assignedTo.name}`}>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1f8a7a] text-[8.5px] font-bold text-white">{initialsOf(t.assignedTo.name)}</span>
        <span className="truncate">{t.assignedTo.name.split(' ')[0]}</span>
      </span>
    ) : null;

  /** One clean line per task: checkbox · title · aligned columns · tools on hover. */
  const row = (t: Task) => {
    const done = statusOf(t) === 'done';
    const isSel = selected === t._id;
    const {done: sd, total: st} = subtaskProgress(t);
    const link = groupBy !== 'project' && scope.kind !== 'group' && groupKeyOf(t) !== 'none' ? groupMeta(groupKeyOf(t)) : null;
    return (
      <div
        className={`group flex h-11 cursor-pointer items-center gap-3 border-b border-slate-100 px-3 transition last:border-b-0 ${isSel ? 'bg-[#f1f6ec]' : 'hover:bg-slate-50'}`}
        key={t._id}
        onClick={() => setSelected(t._id)}
        style={glowStyle(t)}>
        <button
          aria-label={done ? `Reopen ${t.title}` : `Complete ${t.title}`}
          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition ${done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500'}`}
          disabled={busy.includes(t._id)}
          onClick={e => {
            e.stopPropagation();
            toggle(t);
          }}
          type="button">
          <Check className="h-3 w-3" strokeWidth={3} />
        </button>
        {priorityDot(t)}
        <span className={`min-w-0 flex-1 truncate text-[13.5px] ${done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`} title={t.title}>
          {t.title}
          {t.hasPage && <FileText className="ml-1.5 inline-block h-3.5 w-3.5 align-[-2px] text-slate-400" aria-label="Has a page" />}
          {drafts[t._id] && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" title="Unsaved edits" />}
        </span>
        {statusOf(t) === 'in-progress' && <span className="shrink-0 rounded-full bg-amber-50 px-2 text-[11px] font-semibold leading-5 text-amber-700">In progress</span>}
        {t.recurrence?.freq && t.recurrence.freq !== 'none' && <Repeat className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        {link && (
          <span className="hidden w-36 shrink-0 items-center gap-1 truncate text-[12px] lg:flex" style={{color: TONES[link.kind].accent}}>
            <link.Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{link.label}</span>
          </span>
        )}
        <span className="hidden w-28 shrink-0 md:block">{groupBy !== 'person' && avatar(t)}</span>
        <span className="hidden w-12 shrink-0 text-right md:block">
          {st > 0 && (
            <span className={`inline-flex items-center gap-1 text-[12px] tabular-nums ${sd === st ? 'text-emerald-600' : 'text-slate-400'}`}>
              <ListChecks className="h-3.5 w-3.5" />
              {sd}/{st}
            </span>
          )}
        </span>
        <span className="w-24 shrink-0 text-right">{done && t.completedAt ? <span className="text-[12px] text-slate-400">{new Date(t.completedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span> : dueText(t)}</span>
        <span className="flex w-[104px] shrink-0 items-center justify-end gap-0.5 opacity-0 transition group-hover:opacity-100" onClick={e => e.stopPropagation()}>
          {!vendorIdOf(t) && <LinkVendorButton task={t} />}
          <CopySubjectButton size={13} subject={t.emailSubject} />
          <GlowToggles size={12} task={t} />
        </span>
      </div>
    );
  };

  const card = (t: Task) => {
    const {done: sd, total: st} = subtaskProgress(t);
    const link = boardBy !== 'project' && groupKeyOf(t) !== 'none' ? groupMeta(groupKeyOf(t)) : null;
    return (
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
          {priorityDot(t) && <span className="mt-1.5">{priorityDot(t)}</span>}
          <p className={`min-w-0 flex-1 text-[13px] leading-snug ${statusOf(t) === 'done' ? 'text-slate-400 line-through' : 'font-medium text-slate-800'}`}>
            {t.title}
            {t.hasPage && <FileText className="ml-1 inline-block h-3 w-3 align-[-1px] text-slate-400" aria-label="Has a page" />}
          </p>
        </div>
        {(link || t.assignedTo?.name || st > 0 || t.dueDate || statusOf(t) === 'in-progress') && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {link && (
              <span className="flex items-center gap-1 text-[11.5px]" style={{color: TONES[link.kind].accent}}>
                <link.Icon className="h-3 w-3" />
                {link.label}
              </span>
            )}
            {statusOf(t) === 'in-progress' && boardBy !== 'status' && <span className="text-[11.5px] font-semibold text-amber-600">In progress</span>}
            {avatar(t)}
            {st > 0 && (
              <span className={`flex items-center gap-1 text-[11.5px] ${sd === st ? 'text-emerald-600' : 'text-slate-400'}`}>
                <ListChecks className="h-3 w-3" />
                {sd}/{st}
              </span>
            )}
            <span className="ml-auto">{dueText(t)}</span>
          </div>
        )}
      </div>
    );
  };

  const emptyText = query.trim()
    ? 'Nothing matches that search.'
    : scope.kind === 'smart'
      ? {open: 'No open tasks. Add one above.', done: 'Tasks you complete show up here.', archive: 'Archived tasks show up here.'}[scope.key]
      : 'No open tasks here yet. Add one above.';

  const frame = maximized ? 'h-[96vh] w-[97vw]' : 'h-[92vh] w-[96vw] md:h-[80vh] md:w-[80vw]';
  const select = 'rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-2.5 pr-7 text-[12px] font-semibold text-slate-600 outline-none focus:border-[#9fbf8c]';

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/35 backdrop-blur-[3px]" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div aria-label="Tasks" aria-modal className={`relative flex overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] transition-[width,height] duration-200 ${frame}`} role="dialog" style={{fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}}>
        {/* Rail */}
        <aside className="hidden w-[232px] shrink-0 flex-col border-r border-slate-200 bg-[#f6f7f2] md:flex">
          <div className="px-4 pb-3 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}</p>
            <h2 className="mt-0.5 text-[20px] font-semibold tracking-tight text-slate-900">Tasks</h2>
          </div>
          <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 pb-4">
            <div className="space-y-0.5">
              {SMART.map(s => railItem({kind: 'smart', key: s.key}, s.label, <s.Icon className={`h-4 w-4 ${s.key === 'open' ? 'text-[#46674d]' : s.key === 'done' ? 'text-emerald-500' : 'text-slate-400'}`} />, s.key === 'open' ? counts['smart:open'] : undefined))}
            </div>
            <div>
              <p className="mb-1 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">Categories</p>
              <div className="space-y-0.5">
                {TASK_BUCKETS.map(b => railItem({kind: 'bucket', key: b.key}, b.label, <span className="h-2.5 w-2.5 rounded-full" style={{background: TONES[b.key].accent}} />, counts[`bucket:${b.key}`]))}
              </div>
            </div>
            {allGroupKeys.length > 0 && (
              <div>
                <button className="mb-1 flex w-full items-center gap-1 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400 hover:text-slate-600" onClick={() => setGroupsOpen(v => !v)} type="button">
                  Projects & groups
                  <ChevronDown className={`ml-auto h-3 w-3 transition ${groupsOpen ? '' : '-rotate-90'}`} />
                </button>
                {groupsOpen && (
                  <div className="space-y-0.5">
                    {allGroupKeys.map(k => {
                      const m = groupMeta(k);
                      return railItem({kind: 'group', key: k}, m.label, <m.Icon className="h-4 w-4" style={{color: TONES[m.kind].accent}} />, counts[`group:${k}`]);
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
              <p className="text-[12px] text-slate-400">{loading && !tasks.length ? 'Loading…' : `${shownCount} task${shownCount === 1 ? '' : 's'}`}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 focus-within:border-[#9fbf8c] focus-within:bg-white">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input className="w-36 border-0 bg-transparent p-0 text-[12.5px] outline-none placeholder:text-slate-400" onChange={e => setQuery(e.target.value)} placeholder="Search  /" ref={searchRef} value={query} />
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
            {mode === 'list' ? (
              <select className={select} onChange={e => setGroupBy(e.target.value as GroupBy)} title="Group by" value={groupBy}>
                {GROUP_BY.map(g => (
                  <option key={g.key} value={g.key}>
                    {g.key === 'none' ? g.label : `Group: ${g.label}`}
                  </option>
                ))}
              </select>
            ) : (
              <select className={select} onChange={e => setBoardBy(e.target.value as BoardBy)} title="Board columns" value={boardBy}>
                {BOARD_BY.map(b => (
                  <option key={b.key} value={b.key}>
                    Columns: {b.label}
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
            {[...SMART.map(s => ({s: {kind: 'smart', key: s.key} as Scope, label: s.label})), ...TASK_BUCKETS.map(b => ({s: {kind: 'bucket', key: b.key} as Scope, label: b.short}))].map(({s, label}) => (
              <button className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${scopeId(scope) === scopeId(s) ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`} key={scopeId(s)} onClick={() => setScope(s)} type="button">
                {label}
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
                placeholder={`Add a task to ${title}… or paste an email for AI`}
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

          <div className="min-h-0 flex-1 overflow-auto px-5 pb-6 pt-4">
            {loading && !tasks.length ? (
              <div className="space-y-2">
                {Array.from({length: 6}).map((_, i) => (
                  <div className="h-11 animate-pulse rounded-xl bg-slate-100" key={i} />
                ))}
              </div>
            ) : mode === 'board' ? (
              <div className="flex h-full min-h-[320px] gap-3">
                {boardLanes.map(lane => (
                  <div
                    className={`flex min-w-[250px] flex-1 basis-0 flex-col rounded-2xl border p-2 transition ${dragOver === lane.key ? 'border-[#9fbf8c] bg-[#f1f6ec]' : 'border-slate-200 bg-slate-50/70'}`}
                    key={lane.key}
                    onDragLeave={e => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(d => (d === lane.key ? null : d));
                    }}
                    onDragOver={e => {
                      if (!e.dataTransfer.types.includes('text/task-id')) return;
                      e.preventDefault();
                      setDragOver(lane.key);
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      setDragOver(null);
                      const t = tasks.find(x => x._id === e.dataTransfer.getData('text/task-id'));
                      if (t) dropOn(lane, t);
                    }}>
                    {banner(lane, {})}
                    <div className="mt-2 min-h-[60px] flex-1 space-y-2 overflow-y-auto px-0.5 pb-1">
                      {lane.tasks.map(card)}
                      {!lane.tasks.length && <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-[12px] text-slate-400">Drop tasks here</p>}
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
              <div className="mx-auto max-w-[1180px] space-y-5">
                {sections.map(sec => {
                  const k = `${scopeId(scope)}|${sec.key}`;
                  const isCollapsed = collapsed.includes(k);
                  return (
                    <section key={sec.key}>
                      {sec.label && (
                        <div className="sticky top-0 z-10 bg-white pb-1.5">
                          {banner(sec, {collapsible: true, isCollapsed, onToggle: () => setCollapsed(c => (c.includes(k) ? c.filter(x => x !== k) : [...c, k]))})}
                        </div>
                      )}
                      {!isCollapsed && <div className="overflow-hidden rounded-xl border border-slate-100">{sec.tasks.map(row)}</div>}
                    </section>
                  );
                })}
                {scope.kind === 'smart' && scope.key === 'done' && !olderDone.loaded && olderDone.hidden > 0 && (
                  <div className="flex justify-center">
                    <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50" disabled={busy.includes('older-done')} onClick={() => void execute('older-done', loadOlderDone)} type="button">
                      {busy.includes('older-done') ? 'Loading…' : `Load ${olderDone.hidden} older completed`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* A task's page covers the list (the rail stays so you can jump elsewhere) */}
        {selectedTask && (
          <section className="absolute inset-0 z-30 bg-white md:left-[232px]">
            <TaskPageView backLabel={title} note={note} onClose={() => setSelected(null)} taskId={selectedTask._id} />
          </section>
        )}

        {/* New task */}
        {selected === 'new' && (
          <section className="absolute inset-y-0 right-0 z-20 w-full max-w-[440px] overflow-y-auto border-l border-slate-200 bg-[#fffefa] shadow-[-12px_0_30px_-18px_rgba(15,23,42,0.35)] lg:static lg:shadow-none">
            <div className={`${styles.workspace} ${styles.compact}`} style={{display: 'block', height: 'auto'}}>
              <TaskEditor defaults={scopeDefaults()} draftKey={`window-new-${scopeId(scope)}`} key={`new-${scopeId(scope)}`} note={note} onClose={() => setSelected(null)} />
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
