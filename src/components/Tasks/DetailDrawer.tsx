/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {
  Archive,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  FileText,
  Flag,
  ListChecks,
  Loader2,
  Maximize2,
  Paperclip,
  Pin,
  Plus,
  Repeat,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';

import {planTask} from './aiSubtasks';
import AttachmentGallery, {PasteHint} from './AttachmentGallery';
import LinkedNoteSection from './LinkedNoteSection';
import {attachmentFromPaste} from './pasteImage';
import PropertyCard from './PropertyCard';
import {
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
  onClose: () => void;
  onExpand: (task: Task) => void;
  onPatch: (id: string, patch: Record<string, unknown>) => void; // optimistic save
  onDelete: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onArchive: (task: Task) => void;
  onSaveAsTemplate: (task: Task) => void;
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
  onClose,
  onExpand,
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
  const [planning, setPlanning] = useState(false);
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
  const subDone = subtasks.filter(s => s.isCompleted).length;

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

  const runAiPlan = async () => {
    if (!task.title.trim() || planning) return;
    setPlanning(true);
    try {
      const plan = await planTask(task.title, task.notes);
      const existing = new Set(subtasks.map(s => s.title.toLowerCase()));
      const fresh = plan.subtasks.filter(s => !existing.has(s.toLowerCase()));
      const patch: Record<string, unknown> = {
        subtasks: [...subtasks, ...fresh.map(s => ({title: s, isCompleted: false}))],
      };
      if (plan.summary) {
        patch.notes = plan.summary;
        setNotes(plan.summary);
      }
      onPatch(task._id, patch);
    } catch (err) {
      alert(`Could not plan this task: ${err instanceof Error ? err.message : err}`);
    } finally {
      setPlanning(false);
    }
  };

  const attachments = task.attachments || [];

  const onPasteAttachment = async (e: React.ClipboardEvent) => {
    try {
      const att = await attachmentFromPaste(e);
      if (!att) return;
      e.preventDefault();
      onPatch(task._id, {attachments: [...attachments, att]});
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not paste that image.');
    }
  };

  const removeAttachment = (index: number) => {
    onPatch(task._id, {attachments: attachments.filter((_, i) => i !== index)});
  };

  const pinned = isPinned(task);
  const prio = PRIORITY_META[task.priority];

  return (
    <aside className="relative flex h-full w-[400px] shrink-0 animate-slide-up flex-col overflow-hidden border-l border-slate-200/80 bg-white shadow-[-12px_0_40px_-20px_rgba(15,23,42,0.25)] dark:border-slate-700 dark:bg-slate-800">
      {/* Accent bar */}
      <span
        className={`absolute inset-x-0 top-0 z-10 h-[3px] bg-gradient-to-r ${prio.gradient} ${
          task.priority === 'None' ? 'opacity-0' : ''
        }`}
      />

      {/* Header */}
      <div className="flex items-center gap-1 border-b border-slate-100 bg-white/80 px-3.5 py-3 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
        <button
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold shadow-sm transition-all ${
            task.isCompleted
              ? 'bg-emerald-500 text-white shadow-emerald-500/25 hover:bg-emerald-600'
              : 'bg-slate-100 text-slate-500 shadow-none hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
          }`}
          onClick={() =>
            onPatch(task._id, {isCompleted: !task.isCompleted, status: task.isCompleted ? 'todo' : 'done'})
          }>
          {task.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
          {task.isCompleted ? 'Completed' : 'Mark done'}
        </button>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
            onClick={() => onExpand(task)}
            title="Open in full window">
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            className={`rounded-full p-1.5 transition-colors ${
              pinned
                ? 'text-cyan-500'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700'
            }`}
            onClick={() =>
              onPatch(task._id, {hasNeonBorder: !pinned, neonColor: pinned ? null : task.neonColor || 'blue'})
            }
            title={pinned ? 'Unpin' : 'Pin / highlight'}>
            <Pin className="h-4 w-4 rotate-45" />
          </button>
          <button
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
            onClick={() => onSaveAsTemplate(task)}
            title="Save as template">
            <Bookmark className="h-4 w-4" />
          </button>
          <button
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
            onClick={() => onDuplicate(task)}
            title="Duplicate task">
            <Copy className="h-4 w-4" />
          </button>
          <button
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10"
            onClick={() => onArchive(task)}
            title="Archive task">
            <Archive className="h-4 w-4" />
          </button>
          <button
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
            onClick={() => onDelete(task)}
            title="Delete permanently">
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />
          <button
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
            onClick={onClose}
            title="Close (Esc)">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:thin]" onPaste={onPasteAttachment}>
        {/* Title */}
        <textarea
          className="w-full resize-none bg-transparent text-[20px] font-extrabold leading-snug tracking-tight text-slate-900 outline-none placeholder:text-slate-300 dark:text-white"
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
        <div className="mt-3.5 flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-700/60">
          {STATUSES.map(s => (
            <button
              className={`flex-1 rounded-xl py-1.5 text-[11.5px] font-semibold transition-all ${
                status === s.key
                  ? s.key === 'done'
                    ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-600 dark:text-emerald-300'
                    : s.key === 'in-progress'
                    ? 'bg-white text-amber-600 shadow-sm dark:bg-slate-600 dark:text-amber-300'
                    : 'bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              key={s.key}
              onClick={() => setStatus(s.key)}>
              {s.label}
            </button>
          ))}
        </div>

        {pinned && (
          <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-cyan-50/70 px-3 py-2 dark:bg-cyan-500/10">
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
              Highlight
            </span>
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

        {/* AI plan */}
        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2.5 text-[12.5px] font-bold text-white shadow-sm shadow-orange-500/25 transition-all hover:shadow-md hover:shadow-orange-500/30 disabled:opacity-40"
          disabled={!task.title.trim() || planning}
          onClick={runAiPlan}
          title="Ask Gemini to write a summary and a full subtask checklist">
          {planning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {planning ? 'Thinking…' : 'AI: Summarize & plan'}
        </button>

        {/* Properties */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <PropertyCard icon={<Flag className="h-3 w-3" />} label="Priority" tint="rose">
            <div className="flex flex-wrap gap-1">
              {(['High', 'Medium', 'Low', 'None'] as const).map(p => (
                <button
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition-all ${
                    task.priority === p
                      ? PRIORITY_META[p].chip
                      : 'bg-white text-slate-400 ring-slate-200 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-600'
                  }`}
                  key={p}
                  onClick={() => onPatch(task._id, {priority: p})}>
                  {p}
                </button>
              ))}
            </div>
          </PropertyCard>

          <PropertyCard icon={<Repeat className="h-3 w-3" />} label="Repeats" tint="violet">
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-700 outline-none focus:border-orange-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              onChange={e => onPatch(task._id, {recurrence: {freq: e.target.value as RecurrenceFreq, interval: 1}})}
              value={task.recurrence?.freq || 'none'}>
              {(Object.keys(RECURRENCE_META) as RecurrenceFreq[]).map(f => (
                <option key={f} value={f}>
                  {RECURRENCE_META[f]}
                </option>
              ))}
            </select>
          </PropertyCard>

          <PropertyCard
            className="col-span-2"
            icon={<CalendarDays className="h-3 w-3" />}
            label="Due date"
            tint="orange">
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-slate-700 outline-none focus:border-orange-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                onChange={e => {
                  if (!e.target.value) return;
                  const d = new Date(`${e.target.value}T17:00:00`);
                  onPatch(task._id, {dueDate: d.toISOString()});
                }}
                type="date"
                value={toDateInputValue(task.dueDate)}
              />
              {[
                {label: 'Today', days: 0},
                {label: 'Tomorrow', days: 1},
                {label: '+1 week', days: 7},
              ].map(p => (
                <button
                  className="rounded-lg bg-slate-50 px-2 py-1.5 text-[10.5px] font-semibold text-slate-500 transition-colors hover:bg-orange-100 hover:text-orange-700 dark:bg-slate-700 dark:text-slate-300"
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
          </PropertyCard>

          <PropertyCard className="col-span-2" icon={<Tag className="h-3 w-3" />} label="Category & tags" tint="sky">
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-slate-700 outline-none placeholder:text-slate-300 focus:border-orange-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              onBlur={() => {
                if ((category || '') !== (task.category || '')) onPatch(task._id, {category});
              }}
              onChange={e => setCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder="Category, e.g. Work"
              value={category}
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {tags.map(tag => (
                <span
                  className="group flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
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
                className="w-20 rounded-lg border border-dashed border-slate-300 bg-transparent px-2 py-1 text-[11px] outline-none placeholder:text-slate-300 focus:border-orange-400 dark:border-slate-600"
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="+ tag"
                value={newTag}
              />
            </div>
          </PropertyCard>
        </div>

        {/* Subtasks */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <ListChecks className="h-3.5 w-3.5 text-slate-400" />
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Subtasks</h4>
            {subtasks.length > 0 && (
              <span className="text-[10.5px] font-semibold text-slate-400">
                {subDone}/{subtasks.length}
              </span>
            )}
          </div>
          {subtasks.length > 0 && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${
                  subDone === subtasks.length ? 'from-emerald-400 to-emerald-500' : 'from-orange-400 to-rose-400'
                }`}
                style={{width: `${(subDone / subtasks.length) * 100}%`}}
              />
            </div>
          )}
          <div className="mt-2.5 space-y-0.5">
            {subtasks.map((sub, i) => (
              <div
                className="group flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40"
                key={i}>
                <button className="shrink-0" onClick={() => toggleSubtask(i)}>
                  {sub.isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-300 hover:text-orange-400" />
                  )}
                </button>
                <span
                  className={`flex-1 text-[13px] ${
                    sub.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'
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
            <div className="flex items-center gap-2 rounded-xl px-1.5 py-1.5">
              <Plus className="h-4 w-4 text-slate-300" />
              <input
                className="flex-1 bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-300 dark:text-white"
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
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Notes</h4>
          </div>
          <textarea
            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 text-[13px] leading-relaxed text-slate-700 outline-none transition-colors placeholder:text-slate-300 focus:border-orange-400 focus:bg-white dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-200"
            onBlur={() => {
              if ((notes || '') !== (task.notes || '')) onPatch(task._id, {notes});
            }}
            onChange={e => setNotes(e.target.value)}
            placeholder="Details, links, context… or click AI: Summarize & plan above"
            rows={5}
            value={notes}
          />
        </div>

        {/* Attachments */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <Paperclip className="h-3.5 w-3.5 text-slate-400" />
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Attachments</h4>
          </div>
          <div className="mt-2 space-y-2">
            <AttachmentGallery attachments={attachments} compact onRemove={removeAttachment} />
            <PasteHint />
          </div>
        </div>

        {/* Linked note */}
        <LinkedNoteSection onPatch={onPatch} task={task} />

        <div className="mt-6 flex items-center gap-1.5 border-t border-slate-100 pb-2 pt-3 text-[10.5px] text-slate-300 dark:border-slate-700 dark:text-slate-600">
          <Clock className="h-3 w-3" />
          Created {new Date(task.createdAt).toLocaleDateString()} · Updated{' '}
          {new Date(task.updatedAt).toLocaleDateString()}
        </div>
      </div>
    </aside>
  );
}
