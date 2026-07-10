/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {
  CalendarClock,
  CheckCheck,
  Columns3,
  Eye,
  EyeOff,
  Flame,
  Grid2x2,
  Loader2,
  Plus,
  Rows3,
  Search,
  Send,
  Sparkles,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useSession} from 'next-auth/react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {api} from './api';
import BoardView from './BoardView';
import DetailDrawer from './DetailDrawer';
import ListView from './ListView';
import MatrixView from './MatrixView';
import NewTaskModal from './NewTaskModal';
import {
  daysUntil,
  formatDue,
  formatMinutes,
  parseQuickAdd,
  PRIORITY_META,
  smartCompare,
  startOfDay,
  Status,
  Task,
  ViewMode,
} from './types';

const VIEWS: {key: ViewMode; label: string; icon: React.ReactNode}[] = [
  {key: 'list', label: 'List', icon: <Rows3 className="h-3.5 w-3.5" />},
  {key: 'board', label: 'Board', icon: <Columns3 className="h-3.5 w-3.5" />},
  {key: 'matrix', label: 'Matrix', icon: <Grid2x2 className="h-3.5 w-3.5" />},
];

export default function TasksApp() {
  const {status: authStatus} = useSession();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('board');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<Status>('todo');
  const quickAddRef = useRef<HTMLInputElement>(null);

  // Auth guard
  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/login');
  }, [authStatus, router]);

  // View preference persistence
  useEffect(() => {
    const saved = localStorage.getItem('TASKS_VIEW') as ViewMode | null;
    if (saved && ['list', 'board', 'matrix'].includes(saved)) setView(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem('TASKS_VIEW', view);
  }, [view]);

  // Load tasks
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    api
      .list()
      .then(setTasks)
      .catch(err => console.error('Failed to load tasks', err))
      .finally(() => setLoading(false));
  }, [authStatus]);

  // Keyboard shortcuts: "/" quick add · "n" new task · 1/2/3 switch views
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        quickAddRef.current?.focus();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setNewTaskStatus('todo');
        setNewTaskOpen(true);
      } else if (e.key === '1') setView('list');
      else if (e.key === '2') setView('board');
      else if (e.key === '3') setView('matrix');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Mutations (optimistic) ──────────────────────────────────────────────────
  const patchTask = useCallback((id: string, patch: Record<string, unknown>) => {
    setTasks(prev => prev.map(t => (t._id === id ? ({...t, ...patch} as Task) : t)));
    api.update(id, patch).then(
      updated => setTasks(prev => prev.map(t => (t._id === id ? {...t, ...updated} : t))),
      err => {
        console.error('Update failed', err);
        api.list().then(setTasks).catch(() => undefined); // resync on failure
      },
    );
  }, []);

  const toggleComplete = useCallback(
    (task: Task) => {
      patchTask(task._id, {isCompleted: !task.isCompleted, status: task.isCompleted ? 'todo' : 'done'});
    },
    [patchTask],
  );

  const setStatus = useCallback(
    (task: Task, status: Status) => {
      patchTask(task._id, {status, isCompleted: status === 'done'});
    },
    [patchTask],
  );

  const deleteTask = useCallback(async (task: Task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    setTasks(prev => prev.filter(t => t._id !== task._id));
    setSelectedId(prev => (prev === task._id ? null : prev));
    api.remove(task._id).catch(err => {
      console.error('Delete failed', err);
      api.list().then(setTasks).catch(() => undefined);
    });
  }, []);

  const duplicateTask = useCallback(async (task: Task) => {
    try {
      const copy = await api.create({
        title: `${task.title} (copy)`,
        priority: task.priority,
        dueDate: task.dueDate,
        category: task.category,
        notes: task.notes,
        tags: task.tags,
        subtasks: (task.subtasks || []).map(s => ({title: s.title, isCompleted: false})),
        estimatedTime: task.estimatedTime,
        status: 'todo',
      });
      setTasks(prev => [copy, ...prev]);
      setSelectedId(copy._id);
    } catch (err) {
      alert(`Could not duplicate: ${err instanceof Error ? err.message : err}`);
    }
  }, []);

  /** Inline "+ Add" composer inside a board column. */
  const quickCreateInColumn = useCallback(async (title: string, status: Status) => {
    const created = await api.create({title, status, isCompleted: status === 'done', priority: 'None'});
    setTasks(prev => [created, ...prev]);
  }, []);

  /** Bump an overdue/active task to tomorrow 5pm. */
  const snoozeTask = useCallback(
    (task: Task) => {
      const d = startOfDay(new Date());
      d.setDate(d.getDate() + 1);
      d.setHours(17, 0, 0, 0);
      patchTask(task._id, {dueDate: d.toISOString()});
    },
    [patchTask],
  );

  const clearCompleted = useCallback(async () => {
    const doomed = tasks.filter(t => t.isCompleted);
    if (doomed.length === 0) return;
    if (!window.confirm(`Delete all ${doomed.length} completed task${doomed.length === 1 ? '' : 's'}? This cannot be undone.`))
      return;
    setTasks(prev => prev.filter(t => !t.isCompleted));
    setSelectedId(prev => (prev && doomed.some(t => t._id === prev) ? null : prev));
    await Promise.allSettled(doomed.map(t => api.remove(t._id)));
  }, [tasks]);

  const parsed = useMemo(() => (quickAdd.trim() ? parseQuickAdd(quickAdd) : null), [quickAdd]);

  const submitQuickAdd = async () => {
    if (!parsed || !parsed.title || creating) return;
    setCreating(true);
    try {
      const created = await api.create({
        title: parsed.title,
        priority: parsed.priority,
        ...(parsed.dueDate ? {dueDate: parsed.dueDate} : {}),
        ...(parsed.category ? {category: parsed.category} : {}),
        tags: parsed.tags,
        ...(parsed.estimatedTime ? {estimatedTime: parsed.estimatedTime} : {}),
        status: 'todo',
      });
      setTasks(prev => [created, ...prev]);
      setQuickAdd('');
    } catch (err) {
      alert(`Could not create task: ${err instanceof Error ? err.message : err}`);
    } finally {
      setCreating(false);
    }
  };

  // ── Filtering ───────────────────────────────────────────────────────────────
  const allTags = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach(t => (t.tags || []).forEach(tag => s.add(tag)));
    return [...s].sort();
  }, [tasks]);

  const allCategories = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach(t => t.category && s.add(t.category));
    return [...s].sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter(t => {
      if (q && !`${t.title} ${t.notes || ''} ${t.category || ''} ${(t.tags || []).join(' ')}`.toLowerCase().includes(q))
        return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (tagFilter && !(t.tags || []).includes(tagFilter)) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      return true;
    });
  }, [tasks, search, priorityFilter, tagFilter, categoryFilter]);

  const active = useMemo(() => filtered.filter(t => !t.isCompleted).sort(smartCompare), [filtered]);
  const completed = useMemo(
    () =>
      filtered
        .filter(t => t.isCompleted)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [filtered],
  );

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activeAll = tasks.filter(t => !t.isCompleted);
    const overdue = activeAll.filter(t => (daysUntil(t.dueDate) ?? 1) < 0).length;
    const dueToday = activeAll.filter(t => daysUntil(t.dueDate) === 0);
    const weekAgo = Date.now() - 7 * 86400000;
    const doneThisWeek = tasks.filter(t => t.isCompleted && new Date(t.updatedAt).getTime() > weekAgo).length;
    const focusMin = dueToday.reduce((n, t) => n + (t.estimatedTime || 0), 0);
    // Daily momentum: completed today vs (completed today + still due today)
    const todayStart = startOfDay(new Date()).getTime();
    const doneToday = tasks.filter(t => t.isCompleted && new Date(t.updatedAt).getTime() >= todayStart).length;
    const dayTotal = doneToday + dueToday.length;
    const dayProgress = dayTotal > 0 ? doneToday / dayTotal : 1;
    return {overdue, today: dueToday.length, doneThisWeek, focusMin, doneToday, dayProgress, dayTotal};
  }, [tasks]);

  const selectedTask = selectedId ? tasks.find(t => t._id === selectedId) || null : null;

  if (authStatus === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f0]">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }
  if (authStatus === 'unauthenticated') return null;

  return (
    <div
      className="flex h-screen w-full overflow-hidden bg-[#f4f4f0] font-sans text-slate-800 antialiased"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(15,23,42,0.055) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}>
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Header ── */}
        <header className="shrink-0 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
          <div className="flex items-center gap-4 px-6 pt-4">
            <div>
              <h1 className="flex items-center gap-2 text-[20px] font-black tracking-tight text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md">
                  <Flame className="h-4 w-4" />
                </span>
                Mission Control
              </h1>
              <p className="ml-9 text-[11px] font-medium text-slate-400">
                {new Date().toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}
              </p>
            </div>

            {/* Stats */}
            <div className="ml-auto hidden items-center gap-2 md:flex">
              {/* Daily momentum ring */}
              {stats.dayTotal > 0 && (
                <div
                  className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 ring-1 ring-inset ring-slate-200"
                  title={`${stats.doneToday} of ${stats.dayTotal} tasks for today completed`}>
                  <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" fill="none" r="9" stroke="#e2e8f0" strokeWidth="3.5" />
                    <circle
                      cx="12"
                      cy="12"
                      fill="none"
                      r="9"
                      stroke="url(#ringGrad)"
                      strokeDasharray={`${stats.dayProgress * 56.5} 56.5`}
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                    <defs>
                      <linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#f43f5e" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="leading-none">
                    <p className="text-[12px] font-bold text-slate-700">{Math.round(stats.dayProgress * 100)}%</p>
                    <p className="text-[9.5px] text-slate-400">today</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-1.5 ring-1 ring-inset ring-rose-100">
                <CalendarClock className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-[12px] font-bold text-rose-700">{stats.overdue}</span>
                <span className="text-[11px] text-rose-400">overdue</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-1.5 ring-1 ring-inset ring-orange-100">
                <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-[12px] font-bold text-orange-700">{stats.today}</span>
                <span className="text-[11px] text-orange-400">today</span>
              </div>
              {stats.focusMin > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 ring-1 ring-inset ring-indigo-100">
                  <Timer className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-[12px] font-bold text-indigo-700">{formatMinutes(stats.focusMin)}</span>
                  <span className="text-[11px] text-indigo-400">focus</span>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 ring-1 ring-inset ring-emerald-100">
                <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[12px] font-bold text-emerald-700">{stats.doneThisWeek}</span>
                <span className="text-[11px] text-emerald-400">done this wk</span>
              </div>
              <Link
                className="ml-1 text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-700"
                href="/anomaly">
                Notes ↗
              </Link>
            </div>

            {/* New task */}
            <button
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2.5 text-[12.5px] font-bold text-white shadow-md transition-all hover:-translate-y-px hover:shadow-lg"
              onClick={() => {
                setNewTaskStatus('todo');
                setNewTaskOpen(true);
              }}
              title="New task (N)">
              <Plus className="h-4 w-4" /> New task
            </button>
          </div>

          {/* ── Quick add ── */}
          <div className="px-6 pb-3 pt-3">
            <div className="relative">
              <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus-within:border-orange-400">
                <Send className={`h-4 w-4 ${quickAdd ? 'text-orange-500' : 'text-slate-300'}`} />
                <input
                  className="flex-1 bg-transparent text-[14px] text-slate-800 outline-none placeholder:text-slate-300"
                  onChange={e => setQuickAdd(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitQuickAdd()}
                  placeholder='Add a task…  try: "Send PO review !high #procurement @work tomorrow ~1h"  ( / to focus )'
                  ref={quickAddRef}
                  value={quickAdd}
                />
                {creating && <Loader2 className="h-4 w-4 animate-spin text-orange-400" />}
              </div>
              {/* Live parse preview */}
              {parsed && parsed.title && (
                <div className="absolute left-4 top-full z-10 mt-1 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] shadow-lg">
                  <span className="font-semibold text-slate-700">{parsed.title}</span>
                  {parsed.priority !== 'None' && (
                    <span className={`rounded-md px-1.5 py-0.5 ring-1 ring-inset ${PRIORITY_META[parsed.priority].chip}`}>
                      {parsed.priority}
                    </span>
                  )}
                  {parsed.dueDate && (
                    <span className="rounded-md bg-orange-50 px-1.5 py-0.5 text-orange-600 ring-1 ring-inset ring-orange-100">
                      {formatDue(parsed.dueDate)}
                    </span>
                  )}
                  {parsed.category && (
                    <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-indigo-600">@{parsed.category}</span>
                  )}
                  {parsed.tags.map(t => (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-500" key={t}>
                      #{t}
                    </span>
                  ))}
                  {parsed.estimatedTime && (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-500">
                      ~{formatMinutes(parsed.estimatedTime)}
                    </span>
                  )}
                  <span className="text-slate-300">· Enter to add</span>
                </div>
              )}
            </div>
          </div>

          {/* ── View switcher + filters ── */}
          <div className="flex flex-wrap items-center gap-2 px-6 pb-3">
            <div className="flex rounded-xl bg-slate-100 p-1">
              {VIEWS.map(v => (
                <button
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
                    view === v.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  key={v.key}
                  onClick={() => setView(v.key)}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-300" />
              <input
                className="w-36 bg-transparent text-[12px] outline-none placeholder:text-slate-300"
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks…"
                value={search}
              />
              {search && (
                <button className="text-slate-300 hover:text-slate-500" onClick={() => setSearch('')}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Priority filter pills */}
            <div className="flex gap-1">
              {(['High', 'Medium', 'Low'] as const).map(p => (
                <button
                  className={`rounded-lg px-2 py-1 text-[11px] font-semibold ring-1 ring-inset transition-all ${
                    priorityFilter === p
                      ? PRIORITY_META[p].chip
                      : 'bg-white text-slate-400 ring-slate-200 hover:ring-slate-300'
                  }`}
                  key={p}
                  onClick={() => setPriorityFilter(prev => (prev === p ? null : p))}>
                  {p}
                </button>
              ))}
            </div>

            {allTags.length > 0 && (
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-500 outline-none"
                onChange={e => setTagFilter(e.target.value || null)}
                value={tagFilter || ''}>
                <option value="">All tags</option>
                {allTags.map(t => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            )}

            {allCategories.length > 0 && (
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-500 outline-none"
                onChange={e => setCategoryFilter(e.target.value || null)}
                value={categoryFilter || ''}>
                <option value="">All categories</option>
                {allCategories.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {(priorityFilter || tagFilter || categoryFilter || search) && (
              <button
                className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
                onClick={() => {
                  setPriorityFilter(null);
                  setTagFilter(null);
                  setCategoryFilter(null);
                  setSearch('');
                }}>
                Clear filters
              </button>
            )}

            {view === 'list' && (
              <div className="ml-auto flex items-center gap-1">
                {showCompleted && completed.length > 0 && (
                  <button
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    onClick={clearCompleted}
                    title="Delete all completed tasks">
                    <Trash2 className="h-3.5 w-3.5" /> Clear done
                  </button>
                )}
                <button
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                    showCompleted ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  onClick={() => setShowCompleted(v => !v)}>
                  {showCompleted ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  Completed
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ── Content ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="mx-auto max-w-3xl space-y-2 px-6 pt-6">
              {[...Array(6)].map((_, i) => (
                <div className="h-[72px] animate-pulse rounded-2xl bg-slate-200/50" key={i} />
              ))}
            </div>
          ) : view === 'list' ? (
            <ListView
              completed={completed}
              onOpen={t => setSelectedId(t._id)}
              onSnooze={snoozeTask}
              onToggleComplete={toggleComplete}
              selectedId={selectedId}
              showCompleted={showCompleted}
              tasks={active}
            />
          ) : view === 'board' ? (
            <BoardView
              onAddTask={s => {
                setNewTaskStatus(s);
                setNewTaskOpen(true);
              }}
              onOpen={t => setSelectedId(t._id)}
              onQuickCreate={quickCreateInColumn}
              onSetStatus={setStatus}
              onSnooze={snoozeTask}
              onToggleComplete={toggleComplete}
              selectedId={selectedId}
              tasks={filtered}
            />
          ) : (
            <MatrixView
              onOpen={t => setSelectedId(t._id)}
              onSnooze={snoozeTask}
              onToggleComplete={toggleComplete}
              selectedId={selectedId}
              tasks={active}
            />
          )}
        </div>
      </div>

      {/* ── Detail drawer ── */}
      {selectedTask && (
        <DetailDrawer
          onClose={() => setSelectedId(null)}
          onDelete={deleteTask}
          onDuplicate={duplicateTask}
          onPatch={patchTask}
          task={selectedTask}
        />
      )}

      {/* ── New task modal ── */}
      {newTaskOpen && (
        <NewTaskModal
          defaultStatus={newTaskStatus}
          onClose={() => setNewTaskOpen(false)}
          onCreated={task => {
            setTasks(prev => [task, ...prev]);
            setSelectedId(task._id);
          }}
        />
      )}
    </div>
  );
}
