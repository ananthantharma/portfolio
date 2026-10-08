/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import {
  AlertTriangle,
  ArrowLeft,
  CalendarRange,
  Check,
  CheckCircle2,
  Copy,
  Diamond,
  Download,
  Eye,
  EyeOff,
  FolderKanban,
  GitBranch,
  Home,
  Layers,
  ListTree,
  Loader2,
  Palette,
  Plus,
  Redo2,
  Route,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {
  buildRows,
  childrenOf,
  criticalPath,
  descendantIds,
  duration,
  fmt,
  fromDay,
  GTask,
  normalizePlan,
  PALETTE,
  Plan,
  planStats,
  rollup,
  scheduleDependents,
  toCsv,
  toDay,
  todayDay,
  uid,
  Zoom,
} from './gantt';
import GanttTimeline from './GanttTimeline';

type Summary = {_id: string; name: string; description: string; lastUpdated: string; taskCount: number; start: string | null; end: string | null; progress: number};
type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';
type Review = {summary: string; risks: {title: string; detail: string; severity: 'high' | 'medium' | 'low'; taskIds: string[]}[]; suggestions: string[]};

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {...init, headers: {'Content-Type': 'application/json', ...(init?.headers || {})}});
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
}

const blankPlan = (): Plan => {
  const phase = uid();
  const t = todayDay();
  return {
    name: 'Untitled project',
    description: '',
    categoryColors: {Planning: PALETTE[0], Delivery: PALETTE[1]},
    tasks: [
      {id: phase, name: 'Phase 1', start: fromDay(t), end: fromDay(t + 4), progress: 0, category: 'Planning', type: 'task', dependencies: [], assignee: '', notes: ''},
      {id: uid(), name: 'First task', start: fromDay(t), end: fromDay(t + 4), progress: 0, category: 'Planning', parentId: phase, type: 'task', dependencies: [], assignee: '', notes: ''},
    ],
  };
};

/* ════════════════════════ Project home ════════════════════════ */

function ProjectHome({onOpen}: {onOpen: (id: string) => void}) {
  const [charts, setCharts] = useState<Summary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [startDate, setStartDate] = useState(fromDay(todayDay()));
  const [deadline, setDeadline] = useState('');

  const load = useCallback(async () => {
    try {
      setCharts((await call<{charts: Summary[]}>('/api/gantt')).charts);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load projects');
      setCharts([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const createFrom = async (plan: Plan, key: string) => {
    setBusy(key);
    setError(null);
    try {
      const res = await call<{chart: {_id: string}}>('/api/gantt', {method: 'POST', body: JSON.stringify(plan)});
      onOpen(res.chart._id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the project');
      setBusy(null);
    }
  };

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy('ai');
    setError(null);
    try {
      const res = await call<Plan>('/api/gantt/ai', {method: 'POST', body: JSON.stringify({mode: 'create', prompt, startDate, deadline})});
      await createFrom(normalizePlan(res), 'ai');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The AI could not build that plan');
      setBusy(null);
    }
  };

  const duplicate = async (c: Summary) => {
    setBusy(c._id);
    try {
      const {chart} = await call<{chart: Record<string, unknown>}>(`/api/gantt?id=${c._id}`);
      const plan = normalizePlan(chart);
      await createFrom({...plan, name: `${plan.name} (copy)`}, c._id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not duplicate');
      setBusy(null);
    }
  };

  const remove = async (c: Summary) => {
    if (!window.confirm(`Delete "${c.name}"? This can't be undone.`)) return;
    try {
      await call(`/api/gantt?id=${c._id}`, {method: 'DELETE'});
      setCharts(list => (list || []).filter(x => x._id !== c._id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete');
    }
  };

  const ideas = ['Office move for 40 people by end of March', 'Launch a vendor management program in 3 months', 'ERP upgrade: discovery, build, testing, cutover', 'Kitchen renovation with permits and contractors'];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8">
      {/* AI create */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-600/20">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-indigo-100">
          <Sparkles className="h-4 w-4" /> Create a plan with AI
        </div>
        <h2 className="relative mt-1.5 text-[22px] font-bold">Describe the project. Gemini builds the schedule.</h2>
        <p className="relative mt-1 text-[13px] text-indigo-100">Phases, tasks, milestones, dependencies and realistic dates. You can edit everything afterwards.</p>
        <textarea
          className="relative mt-4 h-24 w-full resize-none rounded-xl border border-white/20 bg-white/10 p-3 text-[14px] text-white outline-none placeholder:text-indigo-200 focus:border-white/50 focus:bg-white/15"
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void generate();
          }}
          placeholder="e.g. Replace our procurement system: requirements, vendor selection, configuration, data migration, training and go-live. Team of 6."
          value={prompt}
        />
        <div className="relative mt-3 flex flex-wrap items-end gap-3">
          <label className="text-[11px] font-semibold text-indigo-100">
            Start
            <input className="mt-1 block rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[13px] text-white outline-none [color-scheme:dark]" onChange={e => setStartDate(e.target.value)} type="date" value={startDate} />
          </label>
          <label className="text-[11px] font-semibold text-indigo-100">
            Deadline <span className="font-normal text-indigo-200">(optional)</span>
            <input className="mt-1 block rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-[13px] text-white outline-none [color-scheme:dark]" onChange={e => setDeadline(e.target.value)} type="date" value={deadline} />
          </label>
          <button
            className="ml-auto flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-60"
            disabled={!prompt.trim() || !!busy}
            onClick={() => void generate()}
            type="button">
            {busy === 'ai' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {busy === 'ai' ? 'Building your plan…' : 'Generate plan'}
          </button>
        </div>
        <div className="relative mt-3 flex flex-wrap gap-1.5">
          {ideas.map(i => (
            <button className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11.5px] text-indigo-50 hover:bg-white/20" key={i} onClick={() => setPrompt(i)} type="button">
              {i}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] text-rose-700">{error}</p>}

      <div className="mt-8 flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-slate-800">Your projects</h3>
        <button
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-slate-700 shadow-sm hover:border-slate-300 disabled:opacity-60"
          disabled={!!busy}
          onClick={() => void createFrom(blankPlan(), 'blank')}
          type="button">
          {busy === 'blank' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Blank project
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {charts === null &&
          Array.from({length: 3}).map((_, i) => <div className="h-[132px] animate-pulse rounded-2xl border border-slate-200 bg-white" key={i} />)}
        {charts?.map(c => (
          <div className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md" key={c._id}>
            <button className="absolute inset-0 rounded-2xl" onClick={() => onOpen(c._id)} type="button" aria-label={`Open ${c.name}`} />
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FolderKanban className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-slate-800">{c.name}</p>
                <p className="mt-0.5 truncate text-[12px] text-slate-500">{c.description || `${c.taskCount} rows`}</p>
              </div>
              <div className="relative z-10 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => void duplicate(c)} title="Duplicate" type="button">
                  {busy === c._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" onClick={() => void remove(c)} title="Delete" type="button">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-500" style={{width: `${c.progress}%`}} />
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-slate-500">{c.progress}%</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <CalendarRange className="h-3 w-3" />
                {c.start && c.end ? `${fmt(c.start.slice(0, 10))} – ${fmt(c.end.slice(0, 10), {month: 'short', day: 'numeric', year: 'numeric'})}` : 'No dates yet'}
              </span>
              <span>Updated {new Date(c.lastUpdated).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
            </div>
          </div>
        ))}
        {charts?.length === 0 && <p className="col-span-full rounded-2xl border border-dashed border-slate-300 p-8 text-center text-[13px] text-slate-500">No projects yet. Describe one above, or start with a blank project.</p>}
      </div>
    </div>
  );
}

/* ════════════════════════ Task editor ════════════════════════ */

function TaskEditor({
  task,
  isParent,
  plan,
  onPatch,
  onDelete,
  onDuplicate,
  onClose,
  onAddCategory,
}: {
  task: GTask;
  isParent: boolean;
  plan: Plan;
  onPatch: (patch: Partial<GTask>, key: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
  onAddCategory: (name: string) => void;
}) {
  const [newCat, setNewCat] = useState('');
  const banned = useMemo(() => new Set([task.id, ...descendantIds(plan.tasks, task.id)]), [plan.tasks, task.id]);
  const phases = plan.tasks.filter(t => !banned.has(t.id) && t.type !== 'milestone');
  const assignees = [...new Set(plan.tasks.map(t => t.assignee).filter(Boolean))];
  const byId = new Map(plan.tasks.map(t => [t.id, t]));
  const addable = plan.tasks.filter(t => t.id !== task.id && !task.dependencies.includes(t.id) && !descendantIds(plan.tasks, task.id).has(t.id));
  const dur = duration(task);
  const field = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500';
  const label = 'block text-[11px] font-semibold uppercase tracking-wider text-slate-400';

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full" style={{background: plan.categoryColors[task.category] || '#64748b'}} />
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{isParent ? 'Phase' : task.type === 'milestone' ? 'Milestone' : 'Task'}</span>
        <button className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose} title="Close (Esc)" type="button">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <textarea className="w-full resize-none rounded-lg border border-transparent px-1 py-0.5 text-[17px] font-semibold text-slate-800 outline-none hover:border-slate-200 focus:border-indigo-300" onChange={e => onPatch({name: e.target.value}, 'name')} rows={2} value={task.name} />

        {!isParent && (
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-[12px] font-semibold">
            {(['task', 'milestone'] as const).map(type => (
              <button
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 ${task.type === type ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                key={type}
                onClick={() => onPatch(type === 'milestone' ? {type, end: task.start} : {type}, 'type')}
                type="button">
                {type === 'milestone' ? <Diamond className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
                {type === 'milestone' ? 'Milestone' : 'Task'}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            {task.type === 'milestone' && !isParent ? 'Date' : 'Start'}
            <input className={field} disabled={isParent} onChange={e => e.target.value && onPatch({start: e.target.value}, 'start')} type="date" value={task.start} />
          </label>
          {(task.type !== 'milestone' || isParent) && (
            <label className={label}>
              Finish
              <input className={field} disabled={isParent} min={task.start} onChange={e => e.target.value && onPatch({end: e.target.value}, 'end')} type="date" value={task.end} />
            </label>
          )}
          {task.type !== 'milestone' && !isParent && (
            <label className={label}>
              Days
              <input className={field} min={1} onChange={e => onPatch({end: fromDay(toDay(task.start) + Math.max(1, Number(e.target.value) || 1) - 1)}, 'duration')} type="number" value={dur} />
            </label>
          )}
          <label className={label}>
            Category
            <select className={field} onChange={e => onPatch({category: e.target.value}, 'category')} value={task.category}>
              {Object.keys(plan.categoryColors).map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <form
          className="-mt-2 flex gap-1.5"
          onSubmit={e => {
            e.preventDefault();
            if (!newCat.trim()) return;
            onAddCategory(newCat.trim());
            onPatch({category: newCat.trim()}, 'category');
            setNewCat('');
          }}>
          <input className="min-w-0 flex-1 rounded-lg border border-dashed border-slate-200 px-2.5 py-1 text-[12px] outline-none focus:border-indigo-300" onChange={e => setNewCat(e.target.value)} placeholder="New category…" value={newCat} />
          {newCat.trim() && (
            <button className="rounded-lg bg-slate-800 px-2.5 text-[11.5px] font-semibold text-white" type="submit">
              Add
            </button>
          )}
        </form>

        <div>
          <div className="flex items-center justify-between">
            <span className={label}>Progress</span>
            <span className="text-[12px] font-semibold tabular-nums text-slate-700">{task.progress}%</span>
          </div>
          <input className="mt-2 w-full accent-indigo-600" disabled={isParent} max={100} min={0} onChange={e => onPatch({progress: Number(e.target.value)}, 'progress')} step={5} type="range" value={task.progress} />
          {!isParent && (
            <div className="mt-1.5 flex gap-1">
              {[0, 25, 50, 75, 100].map(v => (
                <button className={`flex-1 rounded-md py-1 text-[11px] font-semibold ${task.progress === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`} key={v} onClick={() => onPatch({progress: v}, `progress-${v}`)} type="button">
                  {v === 100 ? 'Done' : `${v}%`}
                </button>
              ))}
            </div>
          )}
          {isParent && <p className="mt-1 text-[11px] text-slate-400">A phase takes its dates and progress from the tasks inside it.</p>}
        </div>

        <label className={label}>
          Assignee
          <input className={field} list="gantt-assignees" onChange={e => onPatch({assignee: e.target.value}, 'assignee')} placeholder="Name or role" value={task.assignee} />
          <datalist id="gantt-assignees">
            {assignees.map(a => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </label>

        <label className={label}>
          Inside phase
          <select className={field} onChange={e => onPatch({parentId: e.target.value || undefined}, 'parent')} value={task.parentId || ''}>
            <option value="">— Top level —</option>
            {phases.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className={label}>Starts after</span>
          <div className="mt-1.5 space-y-1">
            {task.dependencies.map(d => (
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12.5px] text-slate-700" key={d}>
                <GitBranch className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate">{byId.get(d)?.name || d}</span>
                <button className="rounded p-0.5 text-slate-400 hover:text-rose-600" onClick={() => onPatch({dependencies: task.dependencies.filter(x => x !== d)}, 'deps')} title="Remove dependency" type="button">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <select className={field} onChange={e => e.target.value && onPatch({dependencies: [...task.dependencies, e.target.value]}, 'deps')} value="">
              <option value="">+ Add a task this waits for…</option>
              {addable.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">Tip: drag from the dot at the end of a bar onto another bar.</p>
          </div>
        </div>

        <label className={label}>
          Notes
          <textarea className={`${field} h-24 resize-none`} onChange={e => onPatch({notes: e.target.value}, 'notes')} placeholder="Context, links, decisions…" value={task.notes} />
        </label>
      </div>
      <div className="flex gap-2 border-t border-slate-100 px-4 py-3">
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50" onClick={onDuplicate} type="button">
          <Copy className="h-3.5 w-3.5" /> Duplicate
        </button>
        <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 py-2 text-[12.5px] font-semibold text-rose-600 hover:bg-rose-50" onClick={onDelete} type="button">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </aside>
  );
}

/* ════════════════════════ AI panel ════════════════════════ */

function AIPanel({plan, onApply, onFocus, onClose}: {plan: Plan; onApply: (p: Pick<Plan, 'tasks' | 'categoryColors'>, summary: string) => void; onFocus: (ids: string[]) => void; onClose: () => void}) {
  const [tab, setTab] = useState<'change' | 'review'>('change');
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);

  const change = async (text = instruction) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await call<{tasks: unknown; categoryColors: unknown; summary: string}>('/api/gantt/ai', {method: 'POST', body: JSON.stringify({mode: 'edit', instruction: text, ...plan})});
      const next = normalizePlan({name: plan.name, tasks: res.tasks, categoryColors: res.categoryColors});
      // Keep collapsed phases collapsed
      const collapsed = new Set(plan.tasks.filter(t => t.collapsed).map(t => t.id));
      next.tasks.forEach(t => (t.collapsed = collapsed.has(t.id)));
      onApply({tasks: next.tasks, categoryColors: next.categoryColors}, res.summary || 'Plan updated');
      setDone(res.summary || 'Plan updated');
      setInstruction('');
      setTab('change');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI request failed');
    } finally {
      setBusy(false);
    }
  };

  const runReview = async () => {
    setBusy(true);
    setError(null);
    try {
      setReview(await call<Review>('/api/gantt/ai', {method: 'POST', body: JSON.stringify({mode: 'review', ...plan})}));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI request failed');
    } finally {
      setBusy(false);
    }
  };

  const quick = ['Add a testing phase before go-live', 'Push everything back one week', 'Assign a sensible owner role to every task', 'Add approval milestones at the end of each phase', 'Tighten the plan to finish two weeks sooner', 'Mark everything before today as complete'];
  const sev = {high: 'bg-rose-50 text-rose-700 ring-rose-200', medium: 'bg-amber-50 text-amber-700 ring-amber-200', low: 'bg-sky-50 text-sky-700 ring-sky-200'};

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="text-[13.5px] font-bold text-slate-800">AI assistant</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Gemini Flash</span>
        <button className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose} title="Close" type="button">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-1 border-b border-slate-100 px-4 pt-2">
        {(['change', 'review'] as const).map(t => (
          <button className={`border-b-2 px-2 pb-2 text-[12.5px] font-semibold ${tab === t ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`} key={t} onClick={() => setTab(t)} type="button">
            {t === 'change' ? 'Change the plan' : 'Review & risks'}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">{error}</p>}
        {tab === 'change' ? (
          <>
            <textarea
              className="h-28 w-full resize-none rounded-xl border border-slate-200 p-3 text-[13px] text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              onChange={e => setInstruction(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void change();
              }}
              placeholder="Tell the AI what to change, e.g. “Add a data migration track that runs in parallel with configuration”"
              value={instruction}
            />
            <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50" disabled={!instruction.trim() || busy} onClick={() => void change()} type="button">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} {busy ? 'Updating the plan…' : 'Apply change'}
            </button>
            {done && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> <span>{done} <span className="text-emerald-600">Undo with Ctrl+Z if you don&apos;t like it.</span></span>
              </p>
            )}
            <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Try</p>
            <div className="flex flex-col gap-1.5">
              {quick.map(q => (
                <button className="rounded-lg border border-slate-200 px-3 py-2 text-left text-[12.5px] text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700 disabled:opacity-50" disabled={busy} key={q} onClick={() => void change(q)} type="button">
                  {q}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50" disabled={busy} onClick={() => void runReview()} type="button">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />} {busy ? 'Reviewing…' : review ? 'Review again' : 'Review this plan'}
            </button>
            {review && (
              <div className="mt-4 space-y-4">
                <p className="text-[13px] leading-relaxed text-slate-700">{review.summary}</p>
                {review.risks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Risks</p>
                    {review.risks.map((r, i) => (
                      <button className="block w-full rounded-xl border border-slate-200 p-3 text-left hover:border-slate-300" key={i} onClick={() => r.taskIds.length && onFocus(r.taskIds)} type="button">
                        <span className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${sev[r.severity]}`}>{r.severity}</span>
                          <span className="text-[12.5px] font-semibold text-slate-800">{r.title}</span>
                        </span>
                        <span className="mt-1 block text-[12px] leading-relaxed text-slate-600">{r.detail}</span>
                        {r.taskIds.length > 0 && <span className="mt-1 block text-[11px] font-medium text-indigo-600">Show {r.taskIds.length} task{r.taskIds.length === 1 ? '' : 's'} →</span>}
                      </button>
                    ))}
                  </div>
                )}
                {review.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Suggestions</p>
                    {review.suggestions.map((s, i) => (
                      <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3" key={i}>
                        <span className="flex-1 text-[12.5px] leading-relaxed text-slate-700">{s}</span>
                        <button className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-indigo-600 shadow-sm ring-1 ring-slate-200 hover:bg-indigo-50 disabled:opacity-50" disabled={busy} onClick={() => void change(s)} title="Ask the AI to apply this" type="button">
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

/* ════════════════════════ Chart workspace ════════════════════════ */

function Workspace({chartId, onBack}: {chartId: string; onBack: () => void}) {
  const [plan, setPlanState] = useState<Plan | null>(null);
  const planRef = useRef<Plan | null>(null);
  const past = useRef<Plan[]>([]);
  const future = useRef<Plan[]>([]);
  const lastKey = useRef<{key: string; at: number} | null>(null);
  const [, setHistoryTick] = useState(0);
  const [dirty, setDirty] = useState(0);
  const [save, setSave] = useState<SaveState>('saved');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<'task' | 'ai' | null>(null);
  const [zoom, setZoom] = useState<Zoom>('week');
  const [scrollKey, setScrollKey] = useState(0);
  const [showDetails, setShowDetails] = useState(true);
  const [showDeps, setShowDeps] = useState(true);
  const [showCritical, setShowCritical] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [query, setQuery] = useState('');
  const [hiddenCats, setHiddenCats] = useState<string[]>([]);
  const [highlight, setHighlight] = useState<Set<string> | undefined>();
  const [catsOpen, setCatsOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    call<{chart: Record<string, unknown>}>(`/api/gantt?id=${chartId}`)
      .then(({chart}) => {
        if (!alive) return;
        const p = normalizePlan(chart);
        planRef.current = p;
        setPlanState(p);
      })
      .catch(e => alive && setLoadError(e instanceof Error ? e.message : 'Could not open this project'));
    try {
      const saved = localStorage.getItem('GANTT_ZOOM') as Zoom | null;
      if (saved && ['day', 'week', 'month', 'quarter'].includes(saved)) setZoom(saved);
      setShowDetails(localStorage.getItem('GANTT_DETAILS') !== 'false');
    } catch {
      // storage unavailable
    }
    return () => {
      alive = false;
    };
  }, [chartId]);

  /** Every edit goes through here: history (typing in one field is grouped), auto-scheduling and autosave. */
  const commit = useCallback(
    (fn: (p: Plan) => Plan, key?: string, opts: {history?: boolean} = {}) => {
      const prev = planRef.current;
      if (!prev) return;
      let next = fn(prev);
      if (next === prev) return;
      if (autoSchedule) next = {...next, tasks: scheduleDependents(next.tasks)};
      const now = Date.now();
      if (opts.history !== false && !(key && lastKey.current?.key === key && now - lastKey.current.at < 1500)) {
        past.current.push(prev);
        if (past.current.length > 100) past.current.shift();
        future.current = [];
      }
      lastKey.current = key ? {key, at: now} : null;
      planRef.current = next;
      setPlanState(next);
      setHistoryTick(t => t + 1);
      setDirty(d => d + 1);
    },
    [autoSchedule],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev || !planRef.current) return;
    future.current.push(planRef.current);
    planRef.current = prev;
    lastKey.current = null;
    setPlanState(prev);
    setHistoryTick(t => t + 1);
    setDirty(d => d + 1);
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !planRef.current) return;
    past.current.push(planRef.current);
    planRef.current = next;
    lastKey.current = null;
    setPlanState(next);
    setHistoryTick(t => t + 1);
    setDirty(d => d + 1);
  }, []);

  // Autosave shortly after the last change
  const saveNow = useCallback(async () => {
    const p = planRef.current;
    if (!p) return;
    setSave('saving');
    try {
      await call('/api/gantt', {method: 'POST', body: JSON.stringify({id: chartId, ...p})});
      setSave(planRef.current === p ? 'saved' : 'unsaved');
    } catch {
      setSave('error');
    }
  }, [chartId]);
  useEffect(() => {
    if (!dirty) return;
    setSave('unsaved');
    const t = setTimeout(() => void saveNow(), 1200);
    return () => clearTimeout(t);
  }, [dirty, saveNow]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (save !== 'saved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [save]);

  const rolled = useMemo(() => (plan ? rollup(plan.tasks) : []), [plan]);
  const byId = useMemo(() => new Map(rolled.map(t => [t.id, t])), [rolled]);
  const kids = useMemo(() => childrenOf(rolled), [rolled]);
  const filterOn = !!query.trim() || hiddenCats.length > 0;
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return buildRows(
      rolled,
      filterOn ? t => (!q || `${t.name} ${t.assignee} ${t.notes}`.toLowerCase().includes(q)) && !hiddenCats.includes(t.category) : undefined,
    );
  }, [rolled, query, hiddenCats, filterOn]);
  const critical = useMemo(() => (showCritical ? criticalPath(rolled) : new Set<string>()), [rolled, showCritical]);
  const stats = useMemo(() => planStats(rolled), [rolled]);

  /* ── task operations ── */
  const patchTask = (id: string, patch: Partial<GTask>, key: string) =>
    commit(
      p => ({
        ...p,
        tasks: p.tasks.map(t => {
          if (t.id !== id) return t;
          const n = {...t, ...patch};
          if (n.end < n.start) n.end = patch.start ? fromDay(toDay(n.start) + duration(t) - 1) : n.start;
          if (n.type === 'milestone') n.end = n.start;
          return n;
        }),
      }),
      `${id}:${key}`,
    );

  const insertAfter = (tasks: GTask[], afterId: string | null, items: GTask[]) => {
    if (!afterId) return [...tasks, ...items];
    const block = new Set([afterId, ...descendantIds(tasks, afterId)]);
    let idx = -1;
    tasks.forEach((t, i) => block.has(t.id) && (idx = i));
    return [...tasks.slice(0, idx + 1), ...items, ...tasks.slice(idx + 1)];
  };

  const addTask = (kind: 'task' | 'phase' | 'milestone', parentId?: string) => {
    const p = planRef.current;
    if (!p) return;
    const sel = selectedId ? byId.get(selectedId) : undefined;
    const parent = parentId ?? (sel && !(kids.get(sel.id) || []).length ? sel.parentId : sel && kind !== 'phase' ? sel.id : undefined);
    const anchor = parentId ? byId.get(parentId) : sel;
    const startDay = anchor ? (parentId ? toDay(anchor.start) : toDay(anchor.end) + 1) : todayDay();
    const category = anchor?.category || Object.keys(p.categoryColors)[0] || 'General';
    const base = {progress: 0, category, dependencies: [], assignee: '', notes: ''};
    const items: GTask[] = [];
    if (kind === 'phase') {
      const phaseId = uid();
      items.push({...base, id: phaseId, name: 'New phase', start: fromDay(startDay), end: fromDay(startDay + 4), type: 'task'});
      items.push({...base, id: uid(), name: 'New task', start: fromDay(startDay), end: fromDay(startDay + 4), type: 'task', parentId: phaseId});
    } else {
      items.push({...base, id: uid(), name: kind === 'milestone' ? 'New milestone' : 'New task', start: fromDay(startDay), end: fromDay(kind === 'milestone' ? startDay : startDay + 4), type: kind === 'milestone' ? 'milestone' : 'task', parentId: parent});
    }
    commit(q => ({...q, tasks: insertAfter(q.tasks.map(t => (t.id === parentId ? {...t, collapsed: false} : t)), parentId ? [...descendantIds(q.tasks, parentId)].pop() || parentId : selectedId, items)}), undefined);
    setSelectedId(items[kind === 'phase' ? 1 : 0].id);
    setPanel('task');
  };

  const deleteTask = (id: string) => {
    const t = byId.get(id);
    const inside = descendantIds(planRef.current?.tasks || [], id);
    if (inside.size && !window.confirm(`Delete "${t?.name}" and the ${inside.size} item${inside.size === 1 ? '' : 's'} inside it?`)) return;
    const gone = new Set([id, ...inside]);
    commit(p => ({...p, tasks: p.tasks.filter(x => !gone.has(x.id)).map(x => ({...x, dependencies: x.dependencies.filter(d => !gone.has(d))}))}));
    if (selectedId && gone.has(selectedId)) {
      setSelectedId(null);
      setPanel(null);
    }
  };

  const duplicateTask = (id: string) => {
    const p = planRef.current;
    const src = p?.tasks.find(t => t.id === id);
    if (!p || !src) return;
    const map = new Map<string, string>();
    const block = [src, ...p.tasks.filter(t => descendantIds(p.tasks, id).has(t.id))];
    block.forEach(t => map.set(t.id, uid()));
    const copies = block.map(t => ({...t, id: map.get(t.id)!, name: t.id === id ? `${t.name} (copy)` : t.name, parentId: t.id === id ? t.parentId : map.get(t.parentId!) || t.parentId, dependencies: t.dependencies.map(d => map.get(d) || d), progress: 0}));
    commit(q => ({...q, tasks: insertAfter(q.tasks, id, copies)}));
    setSelectedId(copies[0].id);
  };

  const indent = (id: string) =>
    commit(p => {
      const t = p.tasks.find(x => x.id === id);
      if (!t) return p;
      const siblings = p.tasks.filter(x => x.parentId === t.parentId);
      const prev = siblings[siblings.findIndex(x => x.id === id) - 1];
      if (!prev || prev.type === 'milestone') return p;
      return {...p, tasks: p.tasks.map(x => (x.id === id ? {...x, parentId: prev.id} : x.id === prev.id ? {...x, collapsed: false} : x))};
    });

  const outdent = (id: string) =>
    commit(p => {
      const t = p.tasks.find(x => x.id === id);
      if (!t?.parentId) return p;
      const parent = p.tasks.find(x => x.id === t.parentId);
      const moved = {...t, parentId: parent?.parentId};
      const rest = p.tasks.filter(x => x.id !== id);
      return {...p, tasks: insertAfter(rest, t.parentId, [moved])};
    });

  const move = (id: string, dS: number, dE: number) =>
    commit(p => {
      const inside = descendantIds(p.tasks, id);
      const shift = (s: string, d: number) => fromDay(toDay(s) + d);
      return {
        ...p,
        tasks: p.tasks.map(t => {
          if (inside.size) return inside.has(t.id) ? {...t, start: shift(t.start, dS), end: shift(t.end, dS)} : t;
          if (t.id !== id) return t;
          const start = shift(t.start, dS);
          return t.type === 'milestone' ? {...t, start, end: start} : {...t, start, end: shift(t.end, dE)};
        }),
      };
    });

  const linkTasks = (from: string, to: string) =>
    commit(p => {
      const target = p.tasks.find(t => t.id === to);
      if (!target || target.dependencies.includes(from)) return p;
      // No cycles: `from` must not already (indirectly) wait on `to`
      const byIdNow = new Map(p.tasks.map(t => [t.id, t]));
      const waitsOn = (a: string, b: string, seen = new Set<string>()): boolean => {
        if (a === b) return true;
        if (seen.has(a)) return false;
        seen.add(a);
        return (byIdNow.get(a)?.dependencies || []).some(d => waitsOn(d, b, seen));
      };
      if (waitsOn(from, to) || descendantIds(p.tasks, from).has(to) || descendantIds(p.tasks, to).has(from)) return p;
      return {...p, tasks: p.tasks.map(t => (t.id === to ? {...t, dependencies: [...t.dependencies, from]} : t))};
    });

  const addCategory = (name: string) =>
    commit(p => (p.categoryColors[name] ? p : {...p, categoryColors: {...p.categoryColors, [name]: PALETTE[Object.keys(p.categoryColors).length % PALETTE.length]}}));

  const exportCsv = () => {
    if (!plan) return;
    const blob = new Blob([toCsv(plan)], {type: 'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${plan.name.replace(/[^\w -]/g, '').trim() || 'project'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Keyboard: undo/redo, delete, escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName || '');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault();
        redo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !typing) {
        e.preventDefault();
        deleteTask(selectedId);
      } else if (e.key === 'Escape' && !typing) {
        setPanel(null);
        setSelectedId(null);
        setHighlight(undefined);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-500">
        <p>{loadError}</p>
        <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px]" onClick={onBack} type="button">
          Back to projects
        </button>
      </div>
    );
  }
  if (!plan) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening project…
      </div>
    );
  }

  const selected = selectedId ? byId.get(selectedId) : undefined;
  const iconBtn = 'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition disabled:opacity-35';
  const toggle = (on: boolean) => `${iconBtn} ${on ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`;
  const saveLabel = {saved: 'All changes saved', saving: 'Saving…', unsaved: 'Unsaved changes', error: 'Not saved, retrying on next change'}[save];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Title bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" onClick={onBack} title="All projects" type="button">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <input className="w-full max-w-[520px] rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[17px] font-bold text-slate-800 outline-none hover:border-slate-200 focus:border-indigo-300" onChange={e => commit(p => ({...p, name: e.target.value}), 'plan-name')} value={plan.name} />
          <p className={`px-1.5 text-[11px] ${save === 'error' ? 'text-rose-600' : 'text-slate-400'}`}>
            {save === 'saving' ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : save === 'saved' ? <Check className="mr-1 inline h-3 w-3 text-emerald-500" /> : null}
            {saveLabel}
          </p>
        </div>
        <button className={`${iconBtn} text-slate-500 hover:bg-slate-100`} disabled={!past.current.length} onClick={undo} title="Undo (Ctrl+Z)" type="button">
          <Undo2 className="h-4 w-4" />
        </button>
        <button className={`${iconBtn} text-slate-500 hover:bg-slate-100`} disabled={!future.current.length} onClick={redo} title="Redo (Ctrl+Shift+Z)" type="button">
          <Redo2 className="h-4 w-4" />
        </button>
        <button className={`${iconBtn} text-slate-500 hover:bg-slate-100`} onClick={exportCsv} title="Download as CSV (opens in Excel)" type="button">
          <Download className="h-4 w-4" /> CSV
        </button>
        <button
          className={`${iconBtn} ${panel === 'ai' ? 'bg-indigo-600 text-white' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:opacity-90'}`}
          onClick={() => setPanel(p => (p === 'ai' ? null : 'ai'))}
          type="button">
          <Sparkles className="h-4 w-4" /> AI assistant
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 bg-white px-5 py-2.5 text-[12px]">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{width: `${stats.progress}%`}} />
          </div>
          <span className="font-bold tabular-nums text-slate-800">{stats.progress}%</span>
          <span className="text-slate-400">complete</span>
        </div>
        <span className="text-slate-500">
          <b className="font-semibold text-slate-800">{stats.done}</b> of {stats.total} tasks done
        </span>
        {stats.late > 0 && (
          <span className="flex items-center gap-1 font-semibold text-rose-600">
            <AlertTriangle className="h-3.5 w-3.5" /> {stats.late} late
          </span>
        )}
        {stats.start && stats.end && (
          <span className="text-slate-500">
            {fmt(stats.start)} → <b className="font-semibold text-slate-800">{fmt(stats.end, {month: 'short', day: 'numeric', year: 'numeric'})}</b>
          </span>
        )}
        {stats.nextMilestone && (
          <span className="flex items-center gap-1 text-slate-500">
            <Diamond className="h-3.5 w-3.5 text-violet-500" /> Next: <b className="font-semibold text-slate-800">{stats.nextMilestone.name}</b> · {fmt(stats.nextMilestone.start)}
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50/80 px-4 py-2">
        <button className={`${iconBtn} bg-slate-900 text-white hover:bg-slate-700`} onClick={() => addTask('task')} type="button">
          <Plus className="h-4 w-4" /> Task
        </button>
        <button className={`${iconBtn} border border-slate-200 bg-white text-slate-700 hover:border-slate-300`} onClick={() => addTask('phase')} type="button">
          <ListTree className="h-4 w-4" /> Phase
        </button>
        <button className={`${iconBtn} border border-slate-200 bg-white text-slate-700 hover:border-slate-300`} onClick={() => addTask('milestone')} type="button">
          <Diamond className="h-4 w-4" /> Milestone
        </button>
        <span className="mx-1.5 h-5 w-px bg-slate-200" />
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
          {(['day', 'week', 'month', 'quarter'] as Zoom[]).map(z => (
            <button
              className={`rounded-md px-2.5 py-1 text-[12px] font-semibold capitalize ${zoom === z ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}
              key={z}
              onClick={() => {
                setZoom(z);
                try {
                  localStorage.setItem('GANTT_ZOOM', z);
                } catch {
                  // storage unavailable
                }
              }}
              type="button">
              {z}
            </button>
          ))}
        </div>
        <button className={`${iconBtn} text-slate-600 hover:bg-white`} onClick={() => setScrollKey(k => k + 1)} type="button">
          Today
        </button>
        <span className="mx-1.5 h-5 w-px bg-slate-200" />
        <button
          className={toggle(showDetails)}
          onClick={() => {
            setShowDetails(v => {
              try {
                localStorage.setItem('GANTT_DETAILS', String(!v));
              } catch {
                // storage unavailable
              }
              return !v;
            });
          }}
          title="Show start, finish, days and progress columns"
          type="button">
          <Layers className="h-4 w-4" /> Columns
        </button>
        <button className={toggle(showDeps)} onClick={() => setShowDeps(v => !v)} title="Show dependency arrows" type="button">
          <GitBranch className="h-4 w-4" /> Links
        </button>
        <button className={toggle(showCritical)} onClick={() => setShowCritical(v => !v)} title="Highlight tasks that set the finish date" type="button">
          <Route className="h-4 w-4" /> Critical path
        </button>
        <button className={toggle(autoSchedule)} onClick={() => setAutoSchedule(v => !v)} title="When a task moves, push the tasks that depend on it" type="button">
          <CalendarRange className="h-4 w-4" /> Auto-schedule
        </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <button className={`${iconBtn} text-slate-600 hover:bg-white`} onClick={() => setCatsOpen(v => !v)} type="button">
              <Palette className="h-4 w-4" /> Categories
              {hiddenCats.length > 0 && <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] text-white">{hiddenCats.length} hidden</span>}
            </button>
            {catsOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {Object.entries(plan.categoryColors).map(([name, color]) => {
                  const hidden = hiddenCats.includes(name);
                  const used = plan.tasks.some(t => t.category === name);
                  return (
                    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50" key={name}>
                      <input className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0" onChange={e => commit(p => ({...p, categoryColors: {...p.categoryColors, [name]: e.target.value}}), `color-${name}`)} title="Colour" type="color" value={color} />
                      <span className={`min-w-0 flex-1 truncate text-[12.5px] ${hidden ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{name}</span>
                      <button className="rounded p-1 text-slate-400 hover:text-slate-700" onClick={() => setHiddenCats(h => (hidden ? h.filter(x => x !== name) : [...h, name]))} title={hidden ? 'Show' : 'Hide'} type="button">
                        {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        className="rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        disabled={used}
                        onClick={() => commit(p => ({...p, categoryColors: Object.fromEntries(Object.entries(p.categoryColors).filter(([k]) => k !== name))}))}
                        title={used ? 'In use by tasks' : 'Remove'}
                        type="button">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
                <form
                  className="mt-1 border-t border-slate-100 pt-2"
                  onSubmit={e => {
                    e.preventDefault();
                    const input = (e.currentTarget.elements.namedItem('cat') as HTMLInputElement) || null;
                    if (input?.value.trim()) addCategory(input.value.trim());
                    if (input) input.value = '';
                  }}>
                  <input className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-indigo-300" name="cat" placeholder="Add a category, press Enter" />
                </form>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 focus-within:border-indigo-300">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input className="w-36 border-0 bg-transparent p-0 text-[12.5px] outline-none" onChange={e => setQuery(e.target.value)} placeholder="Find tasks, people…" value={query} />
            {query && (
              <button onClick={() => setQuery('')} type="button">
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chart + side panel */}
      <div className="flex min-h-0 flex-1" onClick={() => catsOpen && setCatsOpen(false)}>
        <div className="min-w-0 flex-1">
          {rows.length ? (
            <GanttTimeline
              byId={byId}
              colors={plan.categoryColors}
              critical={critical}
              highlight={highlight}
              onAddChild={id => addTask('task', id)}
              onDelete={deleteTask}
              onIndent={indent}
              onLink={linkTasks}
              onMove={move}
              onOutdent={outdent}
              onRename={(id, name) => patchTask(id, {name}, 'rename')}
              onSelect={id => {
                setSelectedId(id);
                setHighlight(undefined);
                if (id) setPanel(p => (p === 'ai' ? p : 'task'));
              }}
              onToggle={id => commit(p => ({...p, tasks: p.tasks.map(t => (t.id === id ? {...t, collapsed: !t.collapsed} : t))}), undefined, {history: false})}
              rows={rows}
              scrollKey={scrollKey}
              selectedId={selectedId}
              showCritical={showCritical}
              showDeps={showDeps}
              showDetails={showDetails}
              zoom={zoom}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
              <p className="text-[14px]">{filterOn ? 'Nothing matches that filter.' : 'This plan is empty.'}</p>
              {!filterOn && (
                <div className="flex gap-2">
                  <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-[13px] font-semibold text-white" onClick={() => addTask('phase')} type="button">
                    Add a phase
                  </button>
                  <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[13px] font-semibold text-white" onClick={() => setPanel('ai')} type="button">
                    Ask the AI
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {panel === 'task' && selected && plan.tasks.some(t => t.id === selected.id) && (
          <TaskEditor
            isParent={!!(kids.get(selected.id) || []).length}
            onAddCategory={addCategory}
            onClose={() => {
              setPanel(null);
              setSelectedId(null);
            }}
            onDelete={() => deleteTask(selected.id)}
            onDuplicate={() => duplicateTask(selected.id)}
            onPatch={(patch, key) => patchTask(selected.id, patch, key)}
            plan={plan}
            task={selected}
          />
        )}
        {panel === 'ai' && (
          <AIPanel
            onApply={(next, summary) => commit(p => ({...p, ...next}), `ai-${summary}`)}
            onClose={() => setPanel(null)}
            onFocus={ids => {
              setHighlight(new Set(ids));
              setSelectedId(ids[0] || null);
              commit(p => ({...p, tasks: p.tasks.map(t => (t.collapsed && ids.some(id => descendantIds(p.tasks, t.id).has(id)) ? {...t, collapsed: false} : t))}), undefined, {history: false});
            }}
            plan={plan}
          />
        )}
      </div>
    </div>
  );
}

/* ════════════════════════ Shell ════════════════════════ */

export default function GanttApp() {
  const [openId, setOpenId] = useState<string | null>(null);

  // Remember the open project in the URL so a refresh keeps you there
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) setOpenId(id);
    const onPop = () => setOpenId(new URLSearchParams(window.location.search).get('id'));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const open = (id: string | null) => {
    setOpenId(id);
    window.history.pushState(null, '', id ? `/gantt?id=${id}` : '/gantt');
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-50 font-sans text-slate-800">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <Link className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800" href="/">
          <Home className="h-4 w-4" /> Home
        </Link>
        <span className="h-5 w-px bg-slate-200" />
        <button className="flex items-center gap-2 text-[14px] font-bold text-slate-800" onClick={() => open(null)} type="button">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
            <CalendarRange className="h-4 w-4" />
          </span>
          Gantt planner
        </button>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">Admin</span>
      </header>
      {openId ? (
        <Workspace chartId={openId} key={openId} onBack={() => open(null)} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <ProjectHome onOpen={id => open(id)} />
        </div>
      )}
    </div>
  );
}
