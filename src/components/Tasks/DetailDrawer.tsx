/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {
  Archive,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Circle,
  Copy,
  FileText,
  Flag,
  ListChecks,
  Loader2,
  Maximize2,
  Paperclip,
  Pin,
  Plus,
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
import {isPinned, NEON_COLORS, PRIORITY_META, Status, STATUSES, statusOf, Task} from './types';

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
  const asideRef = useRef<HTMLElement>(null);

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

  const onPasteAttachment = async (e: React.ClipboardEvent | ClipboardEvent) => {
    try {
      const att = await attachmentFromPaste(e);
      if (!att) return;
      e.preventDefault();
      onPatch(task._id, {attachments: [...attachments, att]});
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not paste that image.');
    }
  };

  // Paste an image to attach it to this task — but only when the paste actually happened
  // inside the drawer. Pasting elsewhere on the page is claimed by the AI capture flow
  // (which stops propagation before this listener runs).
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (e.defaultPrevented) return;
      const node = e.target as Node | null;
      if (!node || !asideRef.current?.contains(node)) return;
      onPasteAttachment(e);
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments]);

  const removeAttachment = (index: number) => {
    onPatch(task._id, {attachments: attachments.filter((_, i) => i !== index)});
  };

  const pinned = isPinned(task);
  const prio = PRIORITY_META[task.priority];

  const iconBtn =
    'rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800';
  const sectionLabel =
    'flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500';

  return (
    <aside
      className="relative flex h-full w-[468px] shrink-0 animate-slide-up flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-slate-700/70 dark:bg-slate-900"
      ref={asideRef}>
      {task.priority !== 'None' && (
        <span className={`absolute inset-x-0 top-0 z-10 h-[2px] bg-gradient-to-r ${prio.gradient}`} />
      )}

      {/* Header */}
      <div className="flex items-center gap-1 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
        <button
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
            task.isCompleted
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
          onClick={() =>
            onPatch(task._id, {isCompleted: !task.isCompleted, status: task.isCompleted ? 'todo' : 'done'})
          }>
          {task.isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
          {task.isCompleted ? 'Completed' : 'Mark done'}
        </button>
        <div className="ml-auto flex items-center gap-0.5">
          <button className={iconBtn} onClick={() => onExpand(task)} title="Open in full window">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            className={`rounded-md p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
              pinned ? 'text-cyan-500' : 'text-slate-400 hover:text-slate-700'
            }`}
            onClick={() =>
              onPatch(task._id, {hasNeonBorder: !pinned, neonColor: pinned ? null : task.neonColor || 'blue'})
            }
            title={pinned ? 'Unpin' : 'Pin / highlight'}>
            <Pin className="h-3.5 w-3.5 rotate-45" />
          </button>
          <button className={iconBtn} onClick={() => onSaveAsTemplate(task)} title="Save as template">
            <Bookmark className="h-3.5 w-3.5" />
          </button>
          <button className={iconBtn} onClick={() => onDuplicate(task)} title="Duplicate task">
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10"
            onClick={() => onArchive(task)}
            title="Archive task">
            <Archive className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
            onClick={() => onDelete(task)}
            title="Delete permanently">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <button className={iconBtn} onClick={onClose} title="Close (Esc)">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:thin]">
        {/* Title */}
        <textarea
          className="w-full resize-none bg-transparent text-[15px] font-bold leading-snug tracking-tight text-slate-900 outline-none placeholder:text-slate-300 dark:text-white"
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
        <div className="mt-3 flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
          {STATUSES.map(s => (
            <button
              className={`flex-1 rounded-md py-1 text-[10.5px] font-semibold transition-all ${
                status === s.key
                  ? s.key === 'done'
                    ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-700 dark:text-emerald-300'
                    : s.key === 'in-progress'
                    ? 'bg-white text-amber-600 shadow-sm dark:bg-slate-700 dark:text-amber-300'
                    : 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              key={s.key}
              onClick={() => setStatus(s.key)}>
              {s.label}
            </button>
          ))}
        </div>

        {pinned && (
          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-cyan-50/70 px-2.5 py-1.5 dark:bg-cyan-500/10">
            <span className="text-[9.5px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
              Highlight
            </span>
            {NEON_COLORS.map(c => (
              <button
                className={`h-3.5 w-3.5 rounded-full ${c.dot} ${task.neonColor === c.key ? 'ring-2 ring-offset-1' : ''}`}
                key={c.key}
                onClick={() => onPatch(task._id, {neonColor: c.key})}
                title={c.label}
              />
            ))}
          </div>
        )}

        {/* AI plan */}
        <button
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11.5px] font-semibold text-slate-600 transition-colors hover:border-green-300 hover:text-green-600 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          disabled={!task.title.trim() || planning}
          onClick={runAiPlan}
          title="Ask Gemini to write a summary and a full subtask checklist">
          {planning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-green-600" />}
          {planning ? 'Thinking…' : 'Summarize & plan with AI'}
        </button>

        {/* Properties */}
        <div className="mt-4 space-y-3.5">
          <div>
            <div className={sectionLabel}>
              <Flag className="h-3 w-3" /> Priority
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(['High', 'Medium', 'Low', 'None'] as const).map(p => (
                <button
                  className={`rounded-md px-2.5 py-1 text-[10.5px] font-semibold ring-1 ring-inset transition-all ${
                    task.priority === p
                      ? PRIORITY_META[p].chip
                      : 'bg-white text-slate-400 ring-slate-200 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-700'
                  }`}
                  key={p}
                  onClick={() => onPatch(task._id, {priority: p})}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className={sectionLabel}>
              <CalendarDays className="h-3 w-3" /> Due date
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <input
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11.5px] text-slate-700 outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
                  className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-green-100 hover:text-green-700 dark:bg-slate-800 dark:text-slate-300"
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
              {task.dueDate && (
                <button
                  className="rounded-md px-1.5 py-1 text-[10px] font-semibold text-slate-300 transition-colors hover:text-rose-500"
                  onClick={() => onPatch(task._id, {dueDate: null})}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div>
            <div className={sectionLabel}>
              <Tag className="h-3 w-3" /> Category &amp; tags
            </div>
            <input
              className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] text-slate-700 outline-none placeholder:text-slate-300 focus:border-green-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              onBlur={() => {
                if ((category || '') !== (task.category || '')) onPatch(task._id, {category});
              }}
              onChange={e => setCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder="Category, e.g. Work"
              value={category}
            />
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {tags.map(tag => (
                <span
                  className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  key={tag}>
                  #{tag}
                  <button
                    className="text-slate-300 hover:text-rose-500"
                    onClick={() => onPatch(task._id, {tags: tags.filter(t => t !== tag)})}>
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              <input
                className="w-16 rounded-md border border-dashed border-slate-300 bg-transparent px-1.5 py-0.5 text-[10.5px] outline-none placeholder:text-slate-300 focus:border-green-500 dark:border-slate-600"
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="+ tag"
                value={newTag}
              />
            </div>
          </div>
        </div>

        {/* Subtasks */}
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <ListChecks className="h-3.5 w-3.5 text-slate-400" />
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Subtasks</h4>
            {subtasks.length > 0 && (
              <span className="text-[10px] font-semibold text-slate-400">
                {subDone}/{subtasks.length}
              </span>
            )}
          </div>
          {subtasks.length > 0 && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  subDone === subtasks.length ? 'bg-emerald-500' : 'bg-green-500'
                }`}
                style={{width: `${(subDone / subtasks.length) * 100}%`}}
              />
            </div>
          )}
          <div className="mt-2 space-y-0.5">
            {subtasks.map((sub, i) => (
              <div
                className="group flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                key={i}>
                <button className="shrink-0" onClick={() => toggleSubtask(i)}>
                  {sub.isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-slate-300 hover:text-green-500" />
                  )}
                </button>
                <span
                  className={`flex-1 text-[12px] ${
                    sub.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'
                  }`}>
                  {sub.title}
                </span>
                <button
                  className="hidden text-slate-300 hover:text-rose-500 group-hover:block"
                  onClick={() => removeSubtask(i)}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 rounded-lg px-1.5 py-1">
              <Plus className="h-3.5 w-3.5 text-slate-300" />
              <input
                className="flex-1 bg-transparent text-[12px] text-slate-700 outline-none placeholder:text-slate-300 dark:text-white"
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSubtask()}
                placeholder="Add a subtask and press Enter"
                value={newSubtask}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Notes</h4>
          </div>
          <textarea
            className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 text-[12px] leading-relaxed text-slate-700 outline-none transition-colors placeholder:text-slate-300 focus:border-green-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200"
            onBlur={() => {
              if ((notes || '') !== (task.notes || '')) onPatch(task._id, {notes});
            }}
            onChange={e => setNotes(e.target.value)}
            placeholder="Details, links, context…"
            rows={4}
            value={notes}
          />
        </div>

        {/* Attachments */}
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <Paperclip className="h-3.5 w-3.5 text-slate-400" />
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Attachments</h4>
          </div>
          <div className="mt-2 space-y-2">
            <AttachmentGallery attachments={attachments} compact onRemove={removeAttachment} taskId={task._id} />
            <PasteHint />
          </div>
        </div>

        {/* Linked note */}
        <LinkedNoteSection onPatch={onPatch} task={task} />

        <div className="mt-5 border-t border-slate-100 pb-1 pt-3 text-[10px] text-slate-300 dark:border-slate-800 dark:text-slate-600">
          Created {new Date(task.createdAt).toLocaleDateString()} · Updated {new Date(task.updatedAt).toLocaleDateString()}
        </div>
      </div>
    </aside>
  );
}
