/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {
  Archive,
  Bookmark,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  FileText,
  Lock,
  Paperclip,
  Pause,
  Pin,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';

import {
  formatMinutes,
  isPinned,
  NEON_COLORS,
  PRIORITY_META,
  RECURRENCE_META,
  RecurrenceFreq,
  Status,
  STATUSES,
  statusOf,
  Task,
} from './types';

interface DetailDrawerProps {
  task: Task;
  allTasks: Task[];
  onClose: () => void;
  onPatch: (id: string, patch: Record<string, unknown>) => void; // optimistic save
  onDelete: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onArchive: (task: Task) => void;
  onSaveAsTemplate: (task: Task) => void;
}

/** Simple stopwatch that logs elapsed minutes into task.actualMinutes on stop. */
function FocusTimer({task, onPatch}: {task: Task; onPatch: (id: string, patch: Record<string, unknown>) => void}) {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const stopAndLog = () => {
    setRunning(false);
    const minutes = Math.round(seconds / 60);
    if (minutes > 0) onPatch(task._id, {actualMinutes: (task.actualMinutes || 0) + minutes});
    setSeconds(0);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-700/40">
      <span className="font-mono text-[13px] font-bold tabular-nums text-slate-700 dark:text-slate-200">
        {mm}:{ss}
      </span>
      <button
        className={`ml-auto rounded-lg p-1.5 transition-colors ${
          running ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
        }`}
        onClick={() => setRunning(r => !r)}
        title={running ? 'Pause' : 'Start focus timer'}>
        {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <button
        className="rounded-lg bg-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-300"
        disabled={seconds === 0}
        onClick={stopAndLog}
        title="Log time to task">
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function DetailDrawer({
  task,
  allTasks,
  onClose,
  onPatch,
  onDelete,
  onDuplicate,
  onArchive,
  onSaveAsTemplate,
}: DetailDrawerProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || '');
  const [category, setCategory] = useState(task.category || '');
  const [newTag, setNewTag] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Re-sync local fields when a different task is opened
  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes || '');
    setCategory(task.category || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task._id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = statusOf(task);
  const subtasks = task.subtasks || [];
  const tags = task.tags || [];

  const commitTitle = () => {
    const t = title.trim();
    if (t && t !== task.title) onPatch(task._id, {title: t});
    else setTitle(task.title);
  };

  const setStatus = (s: Status) => {
    onPatch(task._id, {status: s, isCompleted: s === 'done'});
  };

  const toggleSubtask = (index: number) => {
    const next = subtasks.map((s, i) => (i === index ? {...s, isCompleted: !s.isCompleted} : s));
    onPatch(task._id, {subtasks: next});
  };

  const addSubtask = () => {
    const t = newSubtask.trim();
    if (!t) return;
    onPatch(task._id, {subtasks: [...subtasks, {title: t, isCompleted: false}]});
    setNewSubtask('');
  };

  const removeSubtask = (index: number) => {
    onPatch(task._id, {subtasks: subtasks.filter((_, i) => i !== index)});
  };

  const addTag = () => {
    const t = newTag.trim().replace(/^#/, '');
    if (!t || tags.includes(t)) {
      setNewTag('');
      return;
    }
    onPatch(task._id, {tags: [...tags, t]});
    setNewTag('');
  };

  const sourceTitle =
    task.sourcePageId && typeof task.sourcePageId === 'object' ? task.sourcePageId.title : null;
  const pinned = isPinned(task);
  const blockers = allTasks.filter(t => (task.blockedBy || []).includes(t._id));
  const blockedActive = blockers.some(t => !t.isCompleted);

  return (
    <aside className="flex h-full w-[380px] shrink-0 animate-slide-up flex-col border-l border-slate-200 bg-white shadow-[-8px_0_30px_-15px_rgba(0,0,0,0.1)] dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
        <button
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
          onClick={() => onPatch(task._id, {isCompleted: !task.isCompleted, status: task.isCompleted ? 'todo' : 'done'})}>
          {task.isCompleted ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Completed
            </>
          ) : (
            <>
              <Circle className="h-4 w-4" /> Mark done
            </>
          )}
        </button>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            className={`rounded-lg p-1.5 transition-colors ${
              pinned ? 'text-cyan-500' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700'
            }`}
            onClick={() => onPatch(task._id, {hasNeonBorder: !pinned, neonColor: pinned ? null : task.neonColor || 'blue'})}
            title={pinned ? 'Unpin' : 'Pin / highlight'}>
            <Pin className="h-4 w-4 rotate-45" />
          </button>
          <button
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
            onClick={() => onSaveAsTemplate(task)}
            title="Save as template">
            <Bookmark className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
            onClick={() => onDuplicate(task)}
            title="Duplicate task">
            <Copy className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10"
            onClick={() => onArchive(task)}
            title="Archive task">
            <Archive className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            onClick={() => onDelete(task)}
            title="Delete permanently">
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            title="Close (Esc)">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
        {/* Title */}
        <textarea
          className="w-full resize-none bg-transparent text-[17px] font-bold leading-snug text-slate-900 outline-none placeholder:text-slate-300"
          onBlur={commitTitle}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
          placeholder="Task title"
          ref={titleRef}
          rows={2}
          value={title}
        />

        {/* Status segmented */}
        <div className="mt-2 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
          {STATUSES.map(s => (
            <button
              className={`flex-1 rounded-lg py-1.5 text-[11.5px] font-semibold transition-all ${
                status === s.key
                  ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              key={s.key}
              onClick={() => setStatus(s.key)}>
              {s.label}
            </button>
          ))}
        </div>

        {blockedActive && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
            <Lock className="h-3 w-3" /> Blocked by {blockers.filter(b => !b.isCompleted).length} unfinished task
            {blockers.filter(b => !b.isCompleted).length === 1 ? '' : 's'}
          </div>
        )}

        {pinned && (
          <div className="mt-2 flex items-center gap-1.5 px-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Highlight</span>
            {NEON_COLORS.map(c => (
              <button
                className={`h-4 w-4 rounded-full ${c.dot} ${task.neonColor === c.key ? 'ring-2 ring-offset-1' : ''}`}
                key={c.key}
                onClick={() => onPatch(task._id, {neonColor: c.key})}
                title={c.label}
              />
            ))}
          </div>
        )}

        {/* Properties */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <label className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Priority
            </label>
            <div className="flex gap-1">
              {(['High', 'Medium', 'Low', 'None'] as const).map(p => (
                <button
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition-all ${
                    task.priority === p ? PRIORITY_META[p].chip : 'bg-white text-slate-400 ring-slate-200 hover:ring-slate-300'
                  }`}
                  key={p}
                  onClick={() => onPatch(task._id, {priority: p})}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Repeats
            </label>
            <div className="flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5 text-slate-300" />
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-700 outline-none focus:border-orange-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                onChange={e =>
                  onPatch(task._id, {recurrence: {freq: e.target.value as RecurrenceFreq, interval: 1}})
                }
                value={task.recurrence?.freq || 'none'}>
                {(Object.keys(RECURRENCE_META) as RecurrenceFreq[]).map(f => (
                  <option key={f} value={f}>
                    {RECURRENCE_META[f]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <label className="mt-1.5 w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Due
            </label>
            <div className="flex flex-1 flex-col gap-1.5">
              <input
                className="w-fit rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] text-slate-700 outline-none focus:border-orange-400"
                onChange={e => {
                  if (!e.target.value) return;
                  const d = new Date(`${e.target.value}T17:00:00`);
                  onPatch(task._id, {dueDate: d.toISOString()});
                }}
                type="date"
                value={toDateInputValue(task.dueDate)}
              />
              <div className="flex gap-1">
                {[
                  {label: 'Today', days: 0},
                  {label: 'Tomorrow', days: 1},
                  {label: '+1 week', days: 7},
                ].map(p => (
                  <button
                    className="rounded-md bg-slate-100 px-2 py-1 text-[10.5px] font-semibold text-slate-500 transition-colors hover:bg-orange-100 hover:text-orange-700"
                    key={p.label}
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + p.days);
                      d.setHours(17, 0, 0, 0);
                      onPatch(task._id, {dueDate: d.toISOString()});
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Category
            </label>
            <input
              className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] text-slate-700 outline-none placeholder:text-slate-300 focus:border-orange-400"
              onBlur={() => {
                if ((category || '') !== (task.category || '')) onPatch(task._id, {category});
              }}
              onChange={e => setCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder="e.g. Work"
              value={category}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Estimate
            </label>
            <div className="flex items-center gap-2">
              <input
                className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12.5px] text-slate-700 outline-none focus:border-orange-400"
                min={0}
                onChange={e => onPatch(task._id, {estimatedTime: Number(e.target.value) || 0})}
                type="number"
                value={task.estimatedTime || ''}
              />
              <span className="text-[11px] text-slate-400">
                min {task.estimatedTime ? `(${formatMinutes(task.estimatedTime)})` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Focus timer
            </label>
            <div className="flex-1">
              <FocusTimer onPatch={onPatch} task={task} />
            </div>
          </div>

          <div className="flex items-start gap-3">
            <label className="mt-1.5 w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Blocked by
            </label>
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {blockers.map(b => (
                <span
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ${
                    b.isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                  }`}
                  key={b._id}>
                  <Lock className="h-2.5 w-2.5" />
                  {b.title}
                  <button
                    className="text-slate-300 hover:text-rose-500"
                    onClick={() => onPatch(task._id, {blockedBy: (task.blockedBy || []).filter(id => id !== b._id)})}>
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              <select
                className="rounded-lg border border-dashed border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500 outline-none focus:border-orange-400 dark:border-slate-600 dark:bg-slate-700"
                onChange={e => {
                  const id = e.target.value;
                  if (id) onPatch(task._id, {blockedBy: [...(task.blockedBy || []), id]});
                  e.target.value = '';
                }}
                value="">
                <option value="">+ add blocker…</option>
                {allTasks
                  .filter(t => t._id !== task._id && !t.isTemplate && !(task.blockedBy || []).includes(t._id))
                  .map(t => (
                    <option key={t._id} value={t._id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-start gap-3">
            <label className="mt-1.5 w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Tags
            </label>
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              {tags.map(tag => (
                <span
                  className="group flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
                  key={tag}>
                  <Tag className="h-2.5 w-2.5 text-slate-400" />
                  {tag}
                  <button
                    className="text-slate-300 hover:text-rose-500"
                    onClick={() => onPatch(task._id, {tags: tags.filter(t => t !== tag)})}>
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              <input
                className="w-20 rounded-lg border border-dashed border-slate-200 px-2 py-1 text-[11px] outline-none placeholder:text-slate-300 focus:border-orange-400"
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="+ tag"
                value={newTag}
              />
            </div>
          </div>
        </div>

        {/* Subtasks */}
        <div className="mt-6">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Subtasks {subtasks.length > 0 && `· ${subtasks.filter(s => s.isCompleted).length}/${subtasks.length}`}
          </h4>
          <div className="mt-2 space-y-1">
            {subtasks.map((sub, i) => (
              <div className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50" key={i}>
                <button className="shrink-0" onClick={() => toggleSubtask(i)}>
                  {sub.isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-300 hover:text-slate-400" />
                  )}
                </button>
                <span
                  className={`flex-1 text-[13px] ${
                    sub.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'
                  }`}>
                  {sub.title}
                </span>
                <button
                  className="hidden text-slate-300 hover:text-rose-500 group-hover:block"
                  onClick={() => removeSubtask(i)}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 px-1 pt-1">
              <Plus className="h-4 w-4 text-slate-300" />
              <input
                className="flex-1 bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-300"
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSubtask()}
                placeholder="Add a subtask and press Enter"
                value={newSubtask}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Notes</h4>
          <textarea
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-[13px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300 focus:border-orange-400 focus:bg-white"
            onBlur={() => {
              if ((notes || '') !== (task.notes || '')) onPatch(task._id, {notes});
            }}
            onChange={e => setNotes(e.target.value)}
            placeholder="Details, links, context…"
            rows={5}
            value={notes}
          />
        </div>

        {/* Attachments (read-only) */}
        {(task.attachments?.length || 0) > 0 && (
          <div className="mt-6">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attachments</h4>
            <div className="mt-2 space-y-1.5">
              {task.attachments!.map((att, i) => (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[12px] text-slate-600" key={i}>
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate">{att.name}</span>
                  {att.webViewLink && (
                    <a
                      className="text-slate-400 hover:text-orange-600"
                      href={att.webViewLink}
                      rel="noreferrer"
                      target="_blank">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source note */}
        {sourceTitle && (
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-indigo-50/70 px-3 py-2.5 text-[12px] text-indigo-700">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">
              From note: <strong>{sourceTitle}</strong>
              {task.tabName ? ` · ${task.tabName}` : ''}
            </span>
          </div>
        )}

        <p className="mt-6 pb-2 text-[10.5px] text-slate-300">
          Created {new Date(task.createdAt).toLocaleDateString()} · Updated{' '}
          {new Date(task.updatedAt).toLocaleDateString()}
        </p>
      </div>
    </aside>
  );
}
