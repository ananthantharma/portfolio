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
  Flag,
  ListChecks,
  Loader2,
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
import {api} from './api';
import AttachmentGallery, {PasteHint} from './AttachmentGallery';
import {ExtractedTask} from './emailParse';
import LinkedNoteSection from './LinkedNoteSection';
import {attachmentFromPaste} from './pasteImage';
import PropertyCard from './PropertyCard';
import {
  Attachment,
  isPinned,
  NEON_COLORS,
  PRIORITY_META,
  RECURRENCE_META,
  RecurrenceFreq,
  startOfDay,
  Status,
  STATUSES,
  statusOf,
  Subtask,
  Task,
} from './types';

interface TaskWindowProps {
  task?: Task | null; // present => edit an existing task; absent => create a new one
  defaultStatus?: Status;
  prefill?: ExtractedTask | null;
  onClose: () => void;
  onCreated?: (task: Task) => void;
  onPatch?: (id: string, patch: Record<string, unknown>) => void;
  onDelete?: (task: Task) => void;
  onDuplicate?: (task: Task) => void;
  onArchive?: (task: Task) => void;
  onSaveAsTemplate?: (task: Task) => void;
}

const DUE_PRESETS: {label: string; days: number}[] = [
  {label: 'Today', days: 0},
  {label: 'Tomorrow', days: 1},
  {label: 'In 3 days', days: 3},
  {label: 'Next week', days: 7},
];

function isoForDaysAhead(days: number): string {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + days);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}

function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function TaskWindow({
  task,
  defaultStatus = 'todo',
  prefill,
  onClose,
  onCreated,
  onPatch,
  onDelete,
  onDuplicate,
  onArchive,
  onSaveAsTemplate,
}: TaskWindowProps) {
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title || prefill?.title || '');
  const [notes, setNotes] = useState(task?.notes || prefill?.notes || '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || prefill?.priority || 'None');
  const [status, setStatus] = useState<Status>(task ? statusOf(task) : defaultStatus);
  const [dueDate, setDueDate] = useState<string>(
    task?.dueDate ? toDateInputValue(task.dueDate) : prefill?.dueDate ? prefill.dueDate.slice(0, 10) : '',
  );
  const [recurrence, setRecurrence] = useState<RecurrenceFreq>(task?.recurrence?.freq || 'none');
  const [category, setCategory] = useState(task?.category || prefill?.category || '');
  const [tags, setTags] = useState<string[]>(task?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks || []);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>(task?.attachments || []);
  const [planning, setPlanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = (patch: Record<string, unknown>) => {
    if (isEdit && task) onPatch?.(task._id, patch);
  };

  const pinned = isEdit && task ? isPinned(task) : false;
  const subDone = subtasks.filter(s => s.isCompleted).length;

  const commitTitle = () => {
    const t = title.trim();
    if (isEdit) {
      if (t && task && t !== task.title) commit({title: t});
      else if (task) setTitle(task.title);
    }
  };

  const commitNotes = () => {
    if (isEdit && task && (notes || '') !== (task.notes || '')) commit({notes});
  };

  const commitCategory = () => {
    if (isEdit && task && (category || '') !== (task.category || '')) commit({category});
  };

  const changePriority = (p: Task['priority']) => {
    setPriority(p);
    commit({priority: p});
  };

  const changeStatus = (s: Status) => {
    setStatus(s);
    commit({status: s, isCompleted: s === 'done'});
  };

  const changeRecurrence = (f: RecurrenceFreq) => {
    setRecurrence(f);
    commit({recurrence: {freq: f, interval: 1}});
  };

  const applyDueDate = (v: string) => {
    setDueDate(v);
    if (v) commit({dueDate: new Date(`${v}T17:00:00`).toISOString()});
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) {
      const next = [...tags, t];
      setTags(next);
      commit({tags: next});
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    const next = tags.filter(t => t !== tag);
    setTags(next);
    commit({tags: next});
  };

  const addSubtask = (titleText?: string) => {
    const t = (titleText ?? subtaskInput).trim();
    if (!t) return;
    const next = [...subtasks, {title: t, isCompleted: false}];
    setSubtasks(next);
    commit({subtasks: next});
    if (!titleText) setSubtaskInput('');
  };

  const toggleSubtask = (i: number) => {
    const next = subtasks.map((s, idx) => (idx === i ? {...s, isCompleted: !s.isCompleted} : s));
    setSubtasks(next);
    commit({subtasks: next});
  };

  const removeSubtask = (i: number) => {
    const next = subtasks.filter((_, idx) => idx !== i);
    setSubtasks(next);
    commit({subtasks: next});
  };

  const runAiPlan = async () => {
    if (!title.trim() || planning) return;
    setPlanning(true);
    try {
      const plan = await planTask(title.trim(), notes);
      const existing = new Set(subtasks.map(s => s.title.toLowerCase()));
      const fresh = plan.subtasks.filter(s => !existing.has(s.toLowerCase()));
      const nextSubtasks = [...subtasks, ...fresh.map(s => ({title: s, isCompleted: false}))];
      setSubtasks(nextSubtasks);
      const patch: Record<string, unknown> = {subtasks: nextSubtasks};
      if (plan.summary) {
        setNotes(plan.summary);
        patch.notes = plan.summary;
      }
      commit(patch);
    } catch (err) {
      alert(`Could not plan this task: ${err instanceof Error ? err.message : err}`);
    } finally {
      setPlanning(false);
    }
  };

  const onPasteAttachment = async (e: React.ClipboardEvent) => {
    try {
      const att = await attachmentFromPaste(e);
      if (!att) return;
      e.preventDefault();
      const next = [...attachments, att];
      setAttachments(next);
      commit({attachments: next});
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not paste that image.');
    }
  };

  const removeAttachment = (i: number) => {
    const next = attachments.filter((_, idx) => idx !== i);
    setAttachments(next);
    commit({attachments: next});
  };

  const togglePin = () => {
    if (!task) return;
    commit({hasNeonBorder: !pinned, neonColor: pinned ? null : task.neonColor || 'blue'});
  };

  const submit = async () => {
    const t = title.trim();
    if (!t || saving || isEdit) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.create({
        title: t,
        priority,
        status,
        isCompleted: status === 'done',
        ...(dueDate ? {dueDate: new Date(`${dueDate}T17:00:00`).toISOString()} : {}),
        ...(category.trim() ? {category: category.trim()} : {}),
        ...(notes.trim() ? {notes: notes.trim()} : {}),
        ...(recurrence !== 'none' ? {recurrence: {freq: recurrence, interval: 1}} : {}),
        tags,
        subtasks,
        attachments,
      });
      onCreated?.(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      setSaving(false);
    }
  };

  const prio = PRIORITY_META[priority];

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[3px]"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
      onPaste={onPasteAttachment}>
      <div className="relative flex h-[90vh] w-[min(97vw,1180px)] animate-scale-in flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        {/* Accent bar */}
        <span
          className={`absolute inset-x-0 top-0 z-10 h-[3px] bg-gradient-to-r ${prio.gradient} ${
            priority === 'None' ? 'opacity-0' : ''
          }`}
        />

        {/* Header */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 bg-white/80 px-6 py-3.5 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-sm shadow-orange-500/25">
            <Sparkles className="h-4 w-4" />
          </span>
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">{isEdit ? 'Edit task' : 'New task'}</h2>
          {prefill && !isEdit && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
              Filled by AI
            </span>
          )}
          <div className="ml-auto flex items-center gap-0.5">
            {isEdit && task && (
              <>
                <button
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold shadow-sm transition-all ${
                    task.isCompleted
                      ? 'bg-emerald-500 text-white shadow-emerald-500/25 hover:bg-emerald-600'
                      : 'bg-slate-100 text-slate-500 shadow-none hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                  }`}
                  onClick={() => commit({isCompleted: !task.isCompleted, status: task.isCompleted ? 'todo' : 'done'})}>
                  {task.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  {task.isCompleted ? 'Completed' : 'Mark done'}
                </button>
                <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />
                <button
                  className={`rounded-full p-1.5 transition-colors ${
                    pinned ? 'text-cyan-500' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  onClick={togglePin}
                  title={pinned ? 'Unpin' : 'Pin / highlight'}>
                  <Pin className="h-4 w-4 rotate-45" />
                </button>
                {onSaveAsTemplate && (
                  <button
                    className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={() => onSaveAsTemplate(task)}
                    title="Save as template">
                    <Bookmark className="h-4 w-4" />
                  </button>
                )}
                {onDuplicate && (
                  <button
                    className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={() => onDuplicate(task)}
                    title="Duplicate task">
                    <Copy className="h-4 w-4" />
                  </button>
                )}
                {onArchive && (
                  <button
                    className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10"
                    onClick={() => {
                      onArchive(task);
                      onClose();
                    }}
                    title="Archive task">
                    <Archive className="h-4 w-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                    onClick={() => {
                      onDelete(task);
                      onClose();
                    }}
                    title="Delete permanently">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />
              </>
            )}
            <button
              className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
              onClick={onClose}
              title="Close (Esc)">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body — two columns on larger screens */}
        <div className="grid flex-1 grid-cols-1 gap-7 overflow-y-auto px-7 py-6 [scrollbar-width:thin] md:grid-cols-[1.3fr_1fr]">
          {/* Left column */}
          <div className="space-y-6">
            <textarea
              className="w-full resize-none bg-transparent text-[24px] font-bold leading-snug tracking-tight text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-300 dark:text-white"
              onBlur={commitTitle}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (isEdit) (e.target as HTMLTextAreaElement).blur();
                  else submit();
                }
              }}
              placeholder="What needs to be done?"
              ref={titleRef}
              rows={2}
              value={title}
            />

            <button
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2.5 text-[12.5px] font-bold text-white shadow-sm shadow-orange-500/25 transition-all hover:shadow-md hover:shadow-orange-500/30 disabled:opacity-40"
              disabled={!title.trim() || planning}
              onClick={runAiPlan}
              title="Ask Gemini to write a summary and a full subtask checklist">
              {planning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {planning ? 'Thinking…' : 'AI: Summarize & plan'}
            </button>

            <div>
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
                <div className="flex items-center gap-2 px-1.5 pt-1">
                  <Plus className="h-4 w-4 text-slate-300" />
                  <input
                    className="flex-1 bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-300 dark:text-white"
                    onChange={e => setSubtaskInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSubtask()}
                    placeholder="Add a subtask and press Enter"
                    value={subtaskInput}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Notes</h4>
              <textarea
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 text-[13px] leading-relaxed text-slate-700 outline-none transition-colors placeholder:text-slate-300 focus:border-orange-400 focus:bg-white dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-200"
                onBlur={commitNotes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Details, links, context… or use AI: Summarize & plan above"
                rows={5}
                value={notes}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Attachments</h4>
              </div>
              <div className="mt-2 space-y-2">
                <AttachmentGallery attachments={attachments} onRemove={removeAttachment} />
                <PasteHint />
              </div>
            </div>

            {isEdit && task && onPatch && <LinkedNoteSection onPatch={onPatch} task={task} />}
          </div>

          {/* Right column — grouped properties */}
          <div className="space-y-3">
            <PropertyCard icon={<CheckCircle2 className="h-3 w-3" />} label="Status" tint="emerald">
              <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-700/60">
                {STATUSES.map(s => (
                  <button
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-all ${
                      status === s.key
                        ? s.key === 'done'
                          ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-600 dark:text-emerald-300'
                          : s.key === 'in-progress'
                          ? 'bg-white text-amber-600 shadow-sm dark:bg-slate-600 dark:text-amber-300'
                          : 'bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-white'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                    key={s.key}
                    onClick={() => changeStatus(s.key)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </PropertyCard>

            {pinned && (
              <PropertyCard icon={<Pin className="h-3 w-3 rotate-45" />} label="Highlight color" tint="cyan">
                <div className="flex items-center gap-2">
                  {NEON_COLORS.map(c => (
                    <button
                      className={`h-5 w-5 rounded-full ${c.dot} ${
                        task?.neonColor === c.key ? 'ring-2 ring-offset-2 dark:ring-offset-slate-800' : ''
                      }`}
                      key={c.key}
                      onClick={() => commit({neonColor: c.key})}
                      title={c.label}
                    />
                  ))}
                </div>
              </PropertyCard>
            )}

            <PropertyCard icon={<Flag className="h-3 w-3" />} label="Priority" tint="rose">
              <div className="flex gap-1">
                {(['High', 'Medium', 'Low', 'None'] as const).map(p => (
                  <button
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold ring-1 ring-inset transition-all ${
                      priority === p
                        ? PRIORITY_META[p].chip
                        : 'bg-white text-slate-400 ring-slate-200 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-600'
                    }`}
                    key={p}
                    onClick={() => changePriority(p)}>
                    {p === 'Medium' ? 'Med' : p}
                  </button>
                ))}
              </div>
            </PropertyCard>

            <PropertyCard icon={<CalendarDays className="h-3 w-3" />} label="Due date" tint="orange">
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 focus-within:border-orange-400 dark:border-slate-600 dark:bg-slate-800">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-300" />
                  <input
                    className="bg-transparent text-[12.5px] text-slate-700 outline-none dark:text-white"
                    onChange={e => applyDueDate(e.target.value)}
                    type="date"
                    value={dueDate}
                  />
                </div>
                {DUE_PRESETS.map(p => {
                  const iso = isoForDaysAhead(p.days).slice(0, 10);
                  const active = dueDate === iso;
                  return (
                    <button
                      className={`rounded-lg px-2 py-1.5 text-[10.5px] font-semibold transition-all ${
                        active
                          ? 'bg-orange-100 text-orange-700 ring-1 ring-inset ring-orange-200'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                      key={p.label}
                      onClick={() => applyDueDate(active ? '' : iso)}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </PropertyCard>

            <PropertyCard icon={<Repeat className="h-3 w-3" />} label="Repeats" tint="violet">
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-slate-700 outline-none focus:border-orange-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                onChange={e => changeRecurrence(e.target.value as RecurrenceFreq)}
                value={recurrence}>
                {(Object.keys(RECURRENCE_META) as RecurrenceFreq[]).map(f => (
                  <option key={f} value={f}>
                    {RECURRENCE_META[f]}
                  </option>
                ))}
              </select>
            </PropertyCard>

            <PropertyCard icon={<Tag className="h-3 w-3" />} label="Category & tags" tint="sky">
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-slate-700 outline-none placeholder:text-slate-300 focus:border-orange-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                onBlur={commitCategory}
                onChange={e => setCategory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                placeholder="Category, e.g. Work"
                value={category}
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {tags.map(tag => (
                  <span
                    className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    key={tag}>
                    <Tag className="h-2.5 w-2.5 text-slate-400" />
                    {tag}
                    <button className="text-slate-300 hover:text-rose-500" onClick={() => removeTag(tag)}>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                <input
                  className="w-20 rounded-lg border border-dashed border-slate-300 bg-transparent px-2 py-1 text-[11px] outline-none placeholder:text-slate-300 focus:border-orange-400 dark:border-slate-600 dark:text-white"
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag()}
                  placeholder="+ tag ↵"
                  value={tagInput}
                />
              </div>
            </PropertyCard>

            {isEdit && task && (
              <p className="flex items-center gap-1.5 px-1 pt-1 text-[10.5px] text-slate-300 dark:text-slate-600">
                <Clock className="h-3 w-3" />
                Created {new Date(task.createdAt).toLocaleDateString()} · Updated{' '}
                {new Date(task.updatedAt).toLocaleDateString()}
              </p>
            )}

            {error && <p className="px-1 text-[12px] font-medium text-rose-600">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        {!isEdit && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-7 py-4 dark:border-slate-700">
            <button
              className="rounded-xl px-4 py-2 text-[12.5px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={onClose}>
              Cancel
            </button>
            <button
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-2 text-[12.5px] font-bold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-40"
              disabled={!title.trim() || saving}
              onClick={submit}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Create task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
