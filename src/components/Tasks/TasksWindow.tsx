/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import {
  Archive,
  Check,
  CheckCircle2,
  ChevronDown,
  Columns3,
  FileText,
  Inbox,
  Layers,
  List,
  ListChecks,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Plus,
  Repeat,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Tag,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import AssignWorkWindow from '../Notes/AssignWorkWindow';
import {api} from './api';
import CaptureModal, {CaptureSeed} from './CaptureModal';
import {saveTaskChanges} from './taskActions';
import {CopySubjectButton, glowStyle, GlowToggles, initialsOf, LinkVendorButton, linkIcon, useTaskGroups, useVendorOptions} from './TaskExtras';
import TaskChecklist from './TaskChecklist';
import {TaskPageView} from './TaskPage';
import TaskQuickMenu, {CATEGORY_COLORS} from './TaskQuickMenu';
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

type SmartKey = 'open' | 'today' | 'waiting' | 'done' | 'archive';
type Scope = {kind: 'smart'; key: SmartKey} | {kind: 'bucket'; key: TaskBucket} | {kind: 'group'; key: string};
type GroupBy = 'none' | 'project' | 'category' | 'person' | 'priority' | 'due';
type BoardBy = 'category' | 'project' | 'status';
type Mode = 'list' | 'board';
type SortKey = 'smart' | 'due' | 'priority' | 'newest' | 'oldest' | 'updated' | 'title';
type Tone = {bg: string; line: string; accent: string; ink: string};
type Lane = {key: string; label: string; kind: string; tone: Tone; Icon: typeof Tag; tasks: Task[]};

const SMART: {key: SmartKey; label: string; Icon: typeof Inbox}[] = [
  {key: 'open', label: 'All tasks', Icon: Inbox},
  {key: 'today', label: 'Today & overdue', Icon: Sun},
  {key: 'waiting', label: 'Waiting on others', Icon: UserRound},
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
const SORTS: {key: SortKey; label: string}[] = [
  {key: 'smart', label: 'Smart (due, then priority)'},
  {key: 'due', label: 'Due date'},
  {key: 'priority', label: 'Priority'},
  {key: 'newest', label: 'Newest first'},
  {key: 'oldest', label: 'Oldest first'},
  {key: 'updated', label: 'Recently changed'},
  {key: 'title', label: 'Title A–Z'},
];
const time = (v?: string | null) => (v ? new Date(v).getTime() : 0);
const COMPARE: Record<SortKey, (a: Task, b: Task) => number> = {
  smart: smartCompare,
  due: (a, b) => (a.dueDate ? (b.dueDate ? time(a.dueDate) - time(b.dueDate) : -1) : b.dueDate ? 1 : smartCompare(a, b)),
  priority: (a, b) => PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight || smartCompare(a, b),
  newest: (a, b) => time(b.createdAt) - time(a.createdAt),
  oldest: (a, b) => time(a.createdAt) - time(b.createdAt),
  updated: (a, b) => time(b.updatedAt) - time(a.updatedAt),
  title: (a, b) => a.title.localeCompare(b.title, undefined, {sensitivity: 'base', numeric: true}),
};
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
// Remembered between visits
const COLLAPSED_KEY = 'TASKS_COLLAPSED_V1';
const SORT_KEY = 'TASKS_SORT';
const RAIL_GROUPS_KEY = 'TASKS_RAIL_GROUPS_OPEN';
const TAB_VIEW_KEY = 'TASKS_TAB_VIEW';
const EXPANDED_KEY = 'TASKS_EXPANDED';
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

/**
 * Tasks as a pop-out window over /notes (or, `embedded`, as the Tasks tab itself): smart views,
 * categories and projects in a rail, list or board, sorting, quick changes, and the full editor.
 */
export default function TasksWindow({
  note,
  onClose,
  embedded = false,
  isActive = true,
  onAdvanced,
}: {
  note?: NoteContext;
  onClose?: () => void;
  // Fills its container instead of floating over the page, and remembers the last view
  embedded?: boolean;
  // Embedded: keyboard shortcuts only while the Tasks tab is showing
  isActive?: boolean;
  onAdvanced?: () => void;
}) {
  const close = onClose || (() => undefined);
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
  const [sort, setSortState] = useState<SortKey>('smart');
  const [menu, setMenu] = useState<{task: Task; x: number; y: number} | null>(null);
  const [dragTask, setDragTask] = useState<string | null>(null);
  // Tasks whose checklist is showing (remembered)
  const [expanded, setExpanded] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const quickRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGroupOverride(read('TASKS_WINDOW_GROUPBY_V2', {}));
    setMaximized(read('TASKS_WINDOW_MAX', false));
    setCollapsed(read<string[]>(COLLAPSED_KEY, []));
    setSortState(read<SortKey>(SORT_KEY, 'smart'));
    setGroupsOpen(read(RAIL_GROUPS_KEY, true));
    setExpanded(read<string[]>(EXPANDED_KEY, []));
    // The pop-out always opens on All tasks as a board; the Tasks tab comes back to where you left it
    if (embedded) {
      const saved = read<{scope?: Scope; mode?: Mode; boardBy?: BoardBy}>(TAB_VIEW_KEY, {});
      if (saved.scope) setScopeState(saved.scope);
      setModeState(saved.mode || 'list');
      if (saved.boardBy) setBoardByState(saved.boardBy);
    }
  }, [embedded]);
  const rememberView = (changes: {scope?: Scope; mode?: Mode; boardBy?: BoardBy}) => {
    if (embedded) write(TAB_VIEW_KEY, {...read(TAB_VIEW_KEY, {}), ...changes});
  };
  const setScope = (s: Scope) => {
    setScopeState(s);
    setSelected(null);
    rememberView({scope: s});
  };
  const setMode = (m: Mode) => {
    setModeState(m);
    rememberView({mode: m});
  };
  const setBoardBy = (b: BoardBy) => {
    setBoardByState(b);
    rememberView({boardBy: b});
  };
  const setSort = (next: SortKey) => {
    setSortState(next);
    write(SORT_KEY, next);
  };
  const toggleCollapsed = (key: string) =>
    setCollapsed(c => {
      const next = c.includes(key) ? c.filter(x => x !== key) : [...c, key];
      write(COLLAPSED_KEY, next);
      return next;
    });
  const saveExpanded = (next: string[]) => {
    // Keep the most recent few hundred so the remembered list doesn't grow forever
    const trimmed = next.slice(-300);
    write(EXPANDED_KEY, trimmed);
    return trimmed;
  };
  const toggleExpanded = (id: string) => setExpanded(e => saveExpanded(e.includes(id) ? e.filter(x => x !== id) : [...e, id]));
  const setManyExpanded = (ids: string[], open: boolean) =>
    setExpanded(e => saveExpanded(open ? [...e.filter(x => !ids.includes(x)), ...ids] : e.filter(x => !ids.includes(x))));
  const setManyCollapsed = (keys: string[], collapse: boolean) =>
    setCollapsed(c => {
      const next = collapse ? [...new Set([...c, ...keys])] : c.filter(x => !keys.includes(x));
      write(COLLAPSED_KEY, next);
      return next;
    });

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
      const kind = opt?.kind || 'vendor';
      return {label: opt?.name || (fromTask && vendorOf(fromTask)?.name) || 'Linked', kind, Icon: linkIcon(kind)};
    }
    if (key.startsWith('g:')) return {label: groupName.get(key.slice(2)) || 'Group', kind: 'mine', Icon: Tag};
    return {label: 'No group', kind: 'none', Icon: Inbox};
  };

  const inScope = (t: Task, s: Scope) => {
    if (s.kind === 'smart' && s.key === 'done') return !t.isArchived && statusOf(t) === 'done';
    if (s.kind === 'smart' && s.key === 'archive') return !!t.isArchived;
    if (!isOpenTask(t)) return false;
    if (s.kind === 'smart' && s.key === 'today') return t.dueDate ? (daysUntil(t.dueDate) ?? 1) <= 0 : false;
    if (s.kind === 'smart' && s.key === 'waiting') return !!t.assignedTo?.name;
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
      if (t.dueDate && (daysUntil(t.dueDate) ?? 1) <= 0) bump('smart:today');
      if (t.assignedTo?.name) bump('smart:waiting');
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
    // Completed and Archive read best newest-first unless you choose another order
    if (sort === 'smart' && scope.kind === 'smart' && scope.key === 'done') return list.sort((a, b) => completedTime(b) - completedTime(a));
    if (sort === 'smart' && scope.kind === 'smart' && scope.key === 'archive') return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list.sort(COMPARE[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, scope, query, groupName, sort]);

  const isDoneScope = scope.kind === 'smart' && (scope.key === 'done' || scope.key === 'archive');
  const defaultGroupBy: GroupBy = isDoneScope ? 'none' : scope.kind === 'group' ? 'category' : scope.kind === 'smart' && scope.key === 'waiting' ? 'person' : 'project';
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

  // List view: your own tasks on the left, tasks linked to a vendor, project or person on the right
  const split = scope.kind !== 'group';
  const mineSections = useMemo(() => lanesFor(groupBy, split ? visible.filter(t => !vendorIdOf(t)) : visible, false), [groupBy, visible, allGroupKeys, split]); // eslint-disable-line react-hooks/exhaustive-deps
  const linkedSections = useMemo(() => (split ? lanesFor(groupBy, visible.filter(t => !!vendorIdOf(t)), false) : []), [groupBy, visible, allGroupKeys, split]); // eslint-disable-line react-hooks/exhaustive-deps
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

  /** Dropping a task on a column or list section re-files it there. */
  const dropOn = (lane: Lane, task: Task, by: GroupBy | BoardBy = boardBy) => {
    if (by === 'status') return setStatus(task, lane.key as Status);
    if (by === 'priority') {
      if (task.priority === lane.key) return;
      return void execute(task._id, async () => {
        await api.update(task._id, {priority: lane.key});
        setNotice(`Priority: ${lane.label}`);
      });
    }
    if (by !== 'category' && by !== 'project') return;
    if (by === 'category') {
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
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName || '') || (e.target as HTMLElement)?.isContentEditable;
      if (capture || assigning || menu) return;
      if (e.key === 'Escape') {
        if (typing) (e.target as HTMLElement).blur();
        else if (selected) setSelected(null);
        else if (!embedded) close();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, capture, assigning, menu, isActive, embedded, onClose]);

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
  const openMenu = (task: Task, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({task, x: e.clientX, y: e.clientY});
  };
  const menuButton = (t: Task) => (
    <button
      aria-label={`More for ${t.title}`}
      className="rounded-md p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
      onClick={e => {
        const r = e.currentTarget.getBoundingClientRect();
        e.stopPropagation();
        setMenu({task: t, x: r.right - 264, y: r.bottom + 4});
      }}
      title="Category, priority, due date, assign, archive…"
      type="button">
      <MoreHorizontal className="h-4 w-4" />
    </button>
  );
  /** What the task belongs to (project, vendor, person or group); click to change it. */
  const linkChip = (t: Task, compact = false) => {
    const key = groupKeyOf(t);
    const m = key === 'none' ? null : groupMeta(key);
    return (
      <LinkVendorButton
        className={`flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-[2px] text-[11.5px] font-medium transition ${m ? 'hover:brightness-95' : 'border-dashed border-slate-300 text-slate-400 opacity-0 hover:border-slate-400 hover:text-slate-600 group-hover:opacity-100'}`}
        task={t}>
        {m ? (
          <span className="flex min-w-0 items-center gap-1" style={{color: TONES[m.kind].ink}}>
            <m.Icon className="h-3 w-3 shrink-0" style={{color: TONES[m.kind].accent}} />
            <span className="truncate">{m.label}</span>
          </span>
        ) : (
          <>
            <Plus className="h-3 w-3" /> {compact ? 'Link' : 'Link to…'}
          </>
        )}
      </LinkVendorButton>
    );
  };
  const categoryChip = (t: Task) => {
    const b = TASK_BUCKETS.find(x => x.key === bucketOf(t))!;
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] text-slate-500" title={`Category: ${b.label}`}>
        <span className="h-2 w-2 rounded-full" style={{background: CATEGORY_COLORS[b.key]}} />
        {b.short}
      </span>
    );
  };

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

  /**
   * A task in the list: chevron (checklist) · tick · title · due on the first line; category, link,
   * assignee and progress underneath. Only the chevron opens the checklist; the row opens the task.
   */
  const row = (t: Task) => {
    const done = statusOf(t) === 'done';
    const isSel = selected === t._id;
    const isOpen = expanded.includes(t._id);
    const {done: sd, total: st} = subtaskProgress(t);
    const showLink = groupBy !== 'project' && scope.kind !== 'group';
    const showCategory = groupBy !== 'category' && scope.kind !== 'bucket';
    return (
      <React.Fragment key={t._id}>
        <div
          className={`group cursor-pointer border-b border-slate-100 px-2.5 py-2 transition ${isOpen ? '' : 'last:border-b-0'} ${isSel ? 'bg-[#f1f6ec]' : 'hover:bg-slate-50'} ${dragTask === t._id ? 'opacity-40' : ''}`}
          draggable={canDropOnSections}
          onClick={() => setSelected(t._id)}
          onContextMenu={e => openMenu(t, e)}
          onDragEnd={() => setDragTask(null)}
          onDragStart={e => {
            e.dataTransfer.setData('text/task-id', t._id);
            e.dataTransfer.effectAllowed = 'move';
            setDragTask(t._id);
          }}
          style={glowStyle(t)}>
          <div className="flex items-center gap-2">
            <button
              aria-expanded={isOpen}
              aria-label={`${isOpen ? 'Hide' : 'Show'} the checklist for ${t.title}`}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition hover:bg-slate-200/70 ${isOpen ? 'text-slate-700' : st ? 'text-slate-500' : 'text-slate-300'}`}
              onClick={e => {
                e.stopPropagation();
                toggleExpanded(t._id);
              }}
              title={isOpen ? 'Hide checklist' : st ? `Show checklist (${sd}/${st})` : 'Add a checklist'}
              type="button">
              <ChevronDown className={`h-4 w-4 transition ${isOpen ? '' : '-rotate-90'}`} />
            </button>
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
            <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex" onClick={e => e.stopPropagation()}>
              <CopySubjectButton size={13} subject={t.emailSubject} />
              <GlowToggles size={12} task={t} />
            </span>
            <span className="shrink-0 text-right">
              {done && t.completedAt ? <span className="text-[12px] text-slate-400">{new Date(t.completedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span> : dueText(t)}
            </span>
            <span className="shrink-0" onClick={e => e.stopPropagation()}>
              {menuButton(t)}
            </span>
          </div>
          <div className="mt-1 flex min-h-[20px] flex-wrap items-center gap-x-3 gap-y-1 pl-[60px]" onClick={e => e.stopPropagation()}>
            {statusOf(t) === 'in-progress' && <span className="rounded-full bg-amber-50 px-2 text-[11px] font-semibold leading-5 text-amber-700">In progress</span>}
            {showCategory && categoryChip(t)}
            {showLink ? <span className="max-w-[220px]">{linkChip(t, true)}</span> : !vendorIdOf(t) && <span className="opacity-0 transition group-hover:opacity-100"><LinkVendorButton task={t} /></span>}
            {groupBy !== 'person' && avatar(t)}
            {st > 0 && (
              <button
                className={`inline-flex items-center gap-1 rounded px-1 text-[11.5px] tabular-nums hover:bg-slate-200/60 ${sd === st ? 'text-emerald-600' : 'text-slate-400'}`}
                onClick={() => toggleExpanded(t._id)}
                title={isOpen ? 'Hide checklist' : 'Show checklist'}
                type="button">
                <ListChecks className="h-3.5 w-3.5" />
                {sd}/{st}
              </button>
            )}
            {t.recurrence?.freq && t.recurrence.freq !== 'none' && <Repeat className="h-3.5 w-3.5 text-slate-400" />}
          </div>
        </div>
        {isOpen && <TaskChecklist task={t} />}
      </React.Fragment>
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
        onContextMenu={e => openMenu(t, e)}
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
          <span className="-mr-1 -mt-0.5 opacity-0 transition group-hover:opacity-100" onClick={e => e.stopPropagation()}>
            {menuButton(t)}
          </span>
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
      ? {open: 'No open tasks. Add one above.', today: 'Nothing due today or overdue.', waiting: 'Tasks you assign to someone show up here, so you can follow up.', done: 'Tasks you complete show up here.', archive: 'Archived tasks show up here.'}[scope.key]
      : 'No open tasks here yet. Add one above.';

  const frame = embedded ? 'h-full w-full' : maximized ? 'h-[96vh] w-[97vw]' : 'h-[92vh] w-[96vw] md:h-[80vh] md:w-[80vw]';
  // List sections you can drop a task on to re-file it
  const canDropOnSections = groupBy === 'category' || groupBy === 'project' || groupBy === 'priority';
  const sectionKey = (side: string, key: string) => `${scopeId(scope)}|${groupBy}|${side}|${key}`;
  const allSectionKeys = split
    ? [...mineSections.map(sec => sectionKey('mine', sec.key)), ...linkedSections.map(sec => sectionKey('linked', sec.key))]
    : mineSections.map(sec => sectionKey('all', sec.key));
  const laneKey = (key: string) => `board|${boardBy}|${key}`;
  const select = 'rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-2.5 pr-7 text-[12px] font-semibold text-slate-600 outline-none focus:border-[#9fbf8c]';

  const body = (
      <div
        aria-label="Tasks"
        aria-modal={embedded ? undefined : true}
        className={`relative flex overflow-hidden bg-white text-slate-800 ${embedded ? '' : 'rounded-2xl border border-slate-200 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] transition-[width,height] duration-200'} ${frame}`}
        role={embedded ? 'region' : 'dialog'}
        style={{fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}}>
        {/* Rail */}
        <aside className="hidden w-[232px] shrink-0 flex-col border-r border-slate-200 bg-[#f6f7f2] md:flex">
          <div className="px-4 pb-3 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}</p>
            <h2 className="mt-0.5 text-[20px] font-semibold tracking-tight text-slate-900">Tasks</h2>
          </div>
          <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 pb-4">
            <div className="space-y-0.5">
              {SMART.map(s => railItem({kind: 'smart', key: s.key}, s.label, <s.Icon className={`h-4 w-4 ${s.key === 'open' ? 'text-[#46674d]' : s.key === 'today' ? 'text-amber-500' : s.key === 'waiting' ? 'text-[#1f8a7a]' : s.key === 'done' ? 'text-emerald-500' : 'text-slate-400'}`} />, s.key === 'open' || s.key === 'today' || s.key === 'waiting' ? counts[`smart:${s.key}`] : undefined))}
            </div>
            <div>
              <p className="mb-1 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">Categories</p>
              <div className="space-y-0.5">
                {TASK_BUCKETS.map(b => railItem({kind: 'bucket', key: b.key}, b.label, <span className="h-2.5 w-2.5 rounded-full" style={{background: TONES[b.key].accent}} />, counts[`bucket:${b.key}`]))}
              </div>
            </div>
            {allGroupKeys.length > 0 && (
              <div>
                <button
                  className="mb-1 flex w-full items-center gap-1 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400 hover:text-slate-600"
                  onClick={() =>
                    setGroupsOpen(v => {
                      write(RAIL_GROUPS_KEY, !v);
                      return !v;
                    })
                  }
                  type="button">
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
            <kbd className="rounded border border-slate-300 bg-white px-1 font-sans text-[10px]">N</kbd> new task · <kbd className="rounded border border-slate-300 bg-white px-1 font-sans text-[10px]">/</kbd> search · right-click a task for quick changes
            {!embedded && (
              <>
                {' '}
                · <kbd className="rounded border border-slate-300 bg-white px-1 font-sans text-[10px]">Esc</kbd> close
              </>
            )}
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
            <label className="relative flex items-center" title="Sort">
              <SlidersHorizontal className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-slate-400" />
              <select aria-label="Sort tasks" className={`${select} pl-7`} onChange={e => setSort(e.target.value as SortKey)} value={sort}>
                {SORTS.map(o => (
                  <option key={o.key} value={o.key}>
                    Sort: {o.label}
                  </option>
                ))}
              </select>
            </label>
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
            {embedded ? (
              onAdvanced && (
                <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onAdvanced} title="More tools: calendar, insights, templates" type="button">
                  <Wrench className="h-4 w-4" />
                </button>
              )
            ) : (
              <>
                <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setMaximized(v => (write('TASKS_WINDOW_MAX', !v), !v))} title={maximized ? 'Restore size' : 'Fill the screen'} type="button">
                  {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={close} title="Close (Esc)" type="button">
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
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
                {boardLanes.map(lane => {
                  const laneCollapsed = collapsed.includes(laneKey(lane.key));
                  return (
                  <div
                    className={`flex flex-col rounded-2xl border p-2 transition ${laneCollapsed ? 'w-12 shrink-0' : 'min-w-[250px] flex-1 basis-0'} ${dragOver === lane.key ? 'border-[#9fbf8c] bg-[#f1f6ec]' : 'border-slate-200 bg-slate-50/70'}`}
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
                    {laneCollapsed ? (
                      <button
                        aria-label={`Expand ${lane.label}`}
                        className="flex h-full flex-col items-center gap-2 rounded-xl py-2"
                        onClick={() => toggleCollapsed(laneKey(lane.key))}
                        style={{background: lane.tone.bg}}
                        title={`Expand ${lane.label}`}
                        type="button">
                        <span className="rounded-full bg-white/80 px-1.5 text-[11px] font-bold" style={{color: lane.tone.ink}}>
                          {lane.tasks.length}
                        </span>
                        <span className="text-[12.5px] font-bold [writing-mode:vertical-rl]" style={{color: lane.tone.ink}}>
                          {lane.label}
                        </span>
                      </button>
                    ) : (
                      <>
                        {banner(lane, {collapsible: true, isCollapsed: false, onToggle: () => toggleCollapsed(laneKey(lane.key))})}
                        <div className="mt-2 min-h-[60px] flex-1 space-y-2 overflow-y-auto px-0.5 pb-1">
                          {lane.tasks.map(card)}
                          {!lane.tasks.length && <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-[12px] text-slate-400">Drop tasks here</p>}
                        </div>
                      </>
                    )}
                  </div>
                  );
                })}
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
                <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-[11.5px] font-semibold text-slate-400">
                  <span className="mr-auto font-normal">Groups:</span>
                  <button className="hover:text-slate-700" onClick={() => setManyCollapsed(allSectionKeys, true)} type="button">
                    Collapse all
                  </button>
                  <button className="hover:text-slate-700" onClick={() => setManyCollapsed(allSectionKeys, false)} type="button">
                    Expand all
                  </button>
                  <span className="text-slate-200">|</span>
                  <span className="font-normal">Checklists:</span>
                  <button className="hover:text-slate-700" onClick={() => setManyExpanded(visible.map(t => t._id), true)} type="button">
                    Open all
                  </button>
                  <button className="hover:text-slate-700" onClick={() => setManyExpanded(visible.map(t => t._id), false)} type="button">
                    Close all
                  </button>
                </div>
                <div className={split ? 'grid items-start gap-6 xl:grid-cols-2' : 'mx-auto max-w-[1180px]'}>
                  {(split
                    ? [
                        {side: 'mine', title: 'My tasks', Icon: Inbox, sections: mineSections, empty: 'Nothing of your own in this view.'},
                        {side: 'linked', title: 'Vendors, projects & people', Icon: Layers, sections: linkedSections, empty: 'Tasks linked to a vendor, project or person show up here. Use “Link to…” on any task.'},
                      ]
                    : [{side: 'all', title: '', Icon: Inbox, sections: mineSections, empty: emptyText}]
                  ).map(column => (
                    <div className="min-w-0 space-y-4" key={column.side}>
                      {column.title && (
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                          <column.Icon className="h-4 w-4 text-slate-400" />
                          <h4 className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate-500">{column.title}</h4>
                          <span className="text-[11.5px] font-semibold text-slate-400">{column.sections.reduce((n, sec) => n + sec.tasks.length, 0)}</span>
                        </div>
                      )}
                      {!column.sections.length && <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-[12.5px] text-slate-400">{column.empty}</p>}
                      {column.sections.map(sec => {
                        const k = sectionKey(column.side, sec.key);
                        const dropKey = `${column.side}:${sec.key}`;
                        const isCollapsed = collapsed.includes(k);
                        const dropProps = canDropOnSections
                          ? {
                              onDragLeave: (e: React.DragEvent) => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(d => (d === dropKey ? null : d));
                              },
                              onDragOver: (e: React.DragEvent) => {
                                if (!e.dataTransfer.types.includes('text/task-id')) return;
                                e.preventDefault();
                                setDragOver(dropKey);
                              },
                              onDrop: (e: React.DragEvent) => {
                                e.preventDefault();
                                setDragOver(null);
                                setDragTask(null);
                                const t = tasks.find(x => x._id === e.dataTransfer.getData('text/task-id'));
                                if (t) dropOn(sec, t, groupBy);
                              },
                            }
                          : {};
                        return (
                          <section className={`rounded-2xl transition ${dragOver === dropKey ? 'bg-[#f1f6ec] ring-2 ring-[#cfe0c2]' : ''}`} key={sec.key} {...dropProps}>
                            {sec.label && (
                              <div className="sticky top-0 z-10 bg-white pb-1.5">
                                {banner(sec, {collapsible: true, isCollapsed, onToggle: () => toggleCollapsed(k)})}
                              </div>
                            )}
                            {!isCollapsed && <div className="overflow-hidden rounded-xl border border-slate-100">{sec.tasks.map(row)}</div>}
                          </section>
                        );
                      })}
                    </div>
                  ))}
                </div>
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
  );
  const extras = (
    <>
      {menu && <TaskQuickMenu at={{x: menu.x, y: menu.y}} onClose={() => setMenu(null)} onNotice={setNotice} task={tasks.find(t => t._id === menu.task._id) || menu.task} />}

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
    </>
  );

  if (embedded) {
    return (
      <div className="h-full w-full">
        {body}
        {extras}
      </div>
    );
  }
  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/35 backdrop-blur-[3px]" onMouseDown={e => e.target === e.currentTarget && close()}>
      {body}
      {extras}
    </div>,
    document.body,
  );
}
