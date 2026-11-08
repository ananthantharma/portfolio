/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import {Archive, ArchiveRestore, CalendarDays, Check, ChevronRight, Flag, Layers, Loader2, Trash2, UserRound} from 'lucide-react';
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {api} from './api';
import {saveTaskChanges} from './taskActions';
import {initialsOf, useStaffList} from './TaskExtras';
import {bucketOf, Status, statusOf, Task, TASK_BUCKETS} from './types';

type Sub = 'category' | 'priority' | 'status' | 'due' | 'assign' | null;

const PRIORITIES: {key: Task['priority']; label: string; color: string}[] = [
  {key: 'High', label: 'High', color: '#e11d48'},
  {key: 'Medium', label: 'Medium', color: '#f59e0b'},
  {key: 'Low', label: 'Low', color: '#0ea5e9'},
  {key: 'None', label: 'No priority', color: '#cbd5e1'},
];
const STATUSES: {key: Status; label: string}[] = [
  {key: 'todo', label: 'To do'},
  {key: 'in-progress', label: 'In progress'},
  {key: 'done', label: 'Done'},
];
export const CATEGORY_COLORS: Record<string, string> = {work: '#46674d', 'personal-short': '#3c7a9e', 'personal-long': '#6a5ca8', career: '#a5603c'};

/** Due date N days from today at 5pm (the same default quick add uses). */
function dueIn(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}
function nextMonday() {
  const d = new Date();
  return ((8 - d.getDay()) % 7) || 7;
}

/**
 * Everything you'd change about a task without opening it: category, priority, status,
 * due date, who it's assigned to, archive and delete. Opens at the pointer (right-click or the … button).
 */
export default function TaskQuickMenu({task, at, onClose, onNotice}: {task: Task; at: {x: number; y: number}; onClose: () => void; onNotice?: (text: string) => void}) {
  const staff = useStaffList();
  const [sub, setSub] = useState<Sub>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState(at);
  const ref = useRef<HTMLDivElement>(null);

  // Keep the menu (and its open submenu) on screen
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({x: Math.max(8, Math.min(at.x, window.innerWidth - r.width - 8)), y: Math.max(8, Math.min(at.y, window.innerHeight - r.height - 8))});
  }, [at, sub]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (sub) setSub(null);
      else onClose();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose, sub]);

  const apply = async (action: () => Promise<unknown>, notice: string) => {
    setSaving(true);
    setError(null);
    try {
      await action();
      onNotice?.(notice);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Not saved. Try again.');
      setSaving(false);
    }
  };
  const update = (patch: Record<string, unknown>, notice: string) => apply(() => api.update(task._id, patch), notice);

  const item = (key: Sub, icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <button
      aria-expanded={sub === key}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] ${sub === key ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
      onClick={() => setSub(sub === key ? null : key)}
      type="button">
      <span className="flex w-4 justify-center text-slate-400">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="max-w-[120px] truncate text-[12px] text-slate-400">{value}</span>
      <ChevronRight className={`h-3.5 w-3.5 text-slate-300 transition ${sub === key ? 'rotate-90' : ''}`} />
    </button>
  );
  const option = (selected: boolean, label: React.ReactNode, onPick: () => void, key: string) => (
    <button
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] ${selected ? 'font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
      disabled={saving}
      key={key}
      onClick={onPick}
      type="button">
      <span className="flex min-w-0 flex-1 items-center gap-2 truncate">{label}</span>
      {selected && <Check className="h-3.5 w-3.5 text-[#46674d]" />}
    </button>
  );
  const subList = (children: React.ReactNode) => <div className="mb-1 ml-7 border-l border-slate-100 pl-1">{children}</div>;

  const category = bucketOf(task);
  const status = statusOf(task);
  const assigned = task.assignedTo?.name || '';
  const dueLabel = task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'None';

  return createPortal(
    <div
      aria-label={`Change ${task.title}`}
      className="fixed z-[400] w-[264px] rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)]"
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
      ref={ref}
      role="menu"
      style={{left: pos.x, top: pos.y, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'}}>
      <p className="truncate px-2.5 pb-1.5 pt-1 text-[11.5px] font-semibold text-slate-400" title={task.title}>
        {task.title}
      </p>

      {item('category', <Layers className="h-4 w-4" />, 'Category', TASK_BUCKETS.find(b => b.key === category)?.short)}
      {sub === 'category' &&
        subList(
          TASK_BUCKETS.map(b =>
            option(
              b.key === category,
              <>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{background: CATEGORY_COLORS[b.key]}} />
                {b.label}
              </>,
              () => (b.key === category ? onClose() : void update({bucket: b.key}, `Moved to ${b.label}`)),
              b.key,
            ),
          ),
        )}

      {item('priority', <Flag className="h-4 w-4" />, 'Priority', task.priority === 'None' ? 'None' : task.priority)}
      {sub === 'priority' &&
        subList(
          PRIORITIES.map(p =>
            option(
              p.key === task.priority,
              <>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{background: p.color}} />
                {p.label}
              </>,
              () => (p.key === task.priority ? onClose() : void update({priority: p.key}, `Priority: ${p.label}`)),
              p.key,
            ),
          ),
        )}

      {item('status', <Check className="h-4 w-4" />, 'Status', STATUSES.find(s => s.key === status)?.label)}
      {sub === 'status' &&
        subList(
          STATUSES.map(s =>
            option(
              s.key === status,
              s.label,
              () =>
                s.key === status
                  ? onClose()
                  : void apply(async () => {
                      const result = await saveTaskChanges(task, {status: s.key, isCompleted: s.key === 'done'});
                      if (result.warning) throw new Error(result.warning);
                    }, s.key === 'done' ? 'Task completed' : `Marked ${s.label.toLowerCase()}`),
              s.key,
            ),
          ),
        )}

      {item('due', <CalendarDays className="h-4 w-4" />, 'Due', dueLabel)}
      {sub === 'due' &&
        subList(
          <>
            {option(false, 'Today', () => void update({dueDate: dueIn(0)}, 'Due today'), 'today')}
            {option(false, 'Tomorrow', () => void update({dueDate: dueIn(1)}, 'Due tomorrow'), 'tomorrow')}
            {option(false, 'Next Monday', () => void update({dueDate: dueIn(nextMonday())}, 'Due next Monday'), 'monday')}
            {option(false, 'In a week', () => void update({dueDate: dueIn(7)}, 'Due in a week'), 'week')}
            <label className="flex items-center gap-2 px-2.5 py-1.5 text-[12.5px] text-slate-600">
              Pick
              <input
                className="min-w-0 flex-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-[12px]"
                onChange={e => {
                  if (!e.target.value) return;
                  const d = new Date(`${e.target.value}T17:00:00`);
                  void update({dueDate: d.toISOString()}, `Due ${d.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}`);
                }}
                type="date"
              />
            </label>
            {task.dueDate && option(false, 'No due date', () => void update({dueDate: null}, 'Due date cleared'), 'none')}
          </>,
        )}

      {item('assign', <UserRound className="h-4 w-4" />, 'Assigned to', assigned || 'No one')}
      {sub === 'assign' &&
        subList(
          <div className="max-h-56 overflow-y-auto">
            {staff === null && <p className="px-2.5 py-1.5 text-[12px] text-slate-400">Loading…</p>}
            {staff !== null && !staff.length && <p className="px-2.5 py-1.5 text-[12px] text-slate-400">Add people in a People notebook or the Assign work window.</p>}
            {assigned && option(false, 'Not assigned', () => void update({assignedTo: null}, 'Unassigned'), 'none')}
            {(staff || []).map(p =>
              option(
                task.assignedTo?.staffId ? task.assignedTo.staffId === p._id : assigned.toLowerCase() === p.name.toLowerCase(),
                <>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1f8a7a] text-[8.5px] font-bold text-white">{initialsOf(p.name)}</span>
                  <span className="truncate">{p.name}</span>
                  {p.sectionId && <small className="text-[10.5px] text-slate-400">page</small>}
                </>,
                () => void update({assignedTo: {staffId: p._id, name: p.name, email: p.email || ''}}, `Assigned to ${p.name}`),
                p._id,
              ),
            )}
          </div>,
        )}

      <div className="my-1 h-px bg-slate-100" />
      <button
        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] text-slate-700 hover:bg-slate-50"
        disabled={saving}
        onClick={() => void update({isArchived: !task.isArchived}, task.isArchived ? 'Back in your list' : 'Archived')}
        type="button">
        <span className="flex w-4 justify-center text-slate-400">{task.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</span>
        {task.isArchived ? 'Unarchive' : 'Archive'}
      </button>
      <button
        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-[13px] text-rose-600 hover:bg-rose-50"
        disabled={saving}
        onClick={() => {
          if (window.confirm(`Delete “${task.title}”? This can’t be undone.`)) void apply(() => api.remove(task._id), 'Task deleted');
        }}
        type="button">
        <span className="flex w-4 justify-center">
          <Trash2 className="h-4 w-4" />
        </span>
        Delete
      </button>
      {saving && <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 animate-spin text-slate-400" />}
      {error && <p className="px-2.5 py-1 text-[12px] text-rose-600">{error}</p>}
    </div>,
    document.body,
  );
}
