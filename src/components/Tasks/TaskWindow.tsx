/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {
  Archive,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Circle,
  Copy,
  ImagePlus,
  Loader2,
  Pin,
  Plus,
  Repeat,
  Sparkles,
  Tag,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';

import {suggestSubtasks} from './aiSubtasks';
import {api} from './api';
import AttachmentGallery, {PasteHint} from './AttachmentGallery';
import {ExtractedTask} from './emailParse';
import {attachmentFromPaste} from './pasteImage';
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
  const [suggesting, setSuggesting] = useState(false);
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

  const runAiSubtasks = async () => {
    if (!title.trim() || suggesting) return;
    setSuggesting(true);
    try {
      const suggestions = await suggestSubtasks(title.trim(), notes);
      const existing = new Set(subtasks.map(s => s.title.toLowerCase()));
      const fresh = suggestions.filter(s => !existing.has(s.toLowerCase()));
      const next = [...subtasks, ...fresh.map(s => ({title: s, isCompleted: false}))];
      setSubtasks(next);
      commit({subtasks: next});
    } catch (err) {
      alert(`Could not generate subtasks: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSuggesting(false);
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

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
      onPaste={onPasteAttachment}>
      <div className="flex h-[88vh] w-[min(96vw,1100px)] animate-scale-in flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-rose-50 px-6 py-4 dark:border-slate-700 dark:from-orange-500/10 dark:to-rose-500/10">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-white">{isEdit ? 'Edit task' : 'New task'}</h2>
          {prefill && !isEdit && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              Filled by AI
            </span>
          )}
          <div className="ml-auto flex items-center gap-0.5">
            {isEdit && task && (
              <>
                <button
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-slate-500 transition-colors hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-700"
                  onClick={() => commit({isCompleted: !task.isCompleted, status: task.isCompleted ? 'todo' : 'done'})}>
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
                <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-600" />
                <button
                  className={`rounded-lg p-1.5 transition-colors ${
                    pinned ? 'text-cyan-500' : 'text-slate-400 hover:bg-white/70 dark:hover:bg-slate-700'
                  }`}
                  onClick={togglePin}
                  title={pinned ? 'Unpin' : 'Pin / highlight'}>
                  <Pin className="h-4 w-4 rotate-45" />
                </button>
                {onSaveAsTemplate && (
                  <button
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/70 dark:hover:bg-slate-700"
                    onClick={() => onSaveAsTemplate(task)}
                    title="Save as template">
                    <Bookmark className="h-4 w-4" />
                  </button>
                )}
                {onDuplicate && (
                  <button
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/70 dark:hover:bg-slate-700"
                    onClick={() => onDuplicate(task)}
                    title="Duplicate task">
                    <Copy className="h-4 w-4" />
                  </button>
                )}
                {onArchive && (
                  <button
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-100/70 hover:text-amber-600"
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
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-100/70 hover:text-rose-600"
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
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-700 dark:hover:bg-slate-700"
              onClick={onClose}
              title="Close (Esc)">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body — two columns on larger screens */}
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 py-5 [scrollbar-width:thin] md:grid-cols-[1.4fr_1fr]">
          {/* Left column */}
          <div className="space-y-5">
            <textarea
              className="w-full resize-none bg-transparent text-[22px] font-bold leading-snug text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-300 dark:text-white"
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

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Notes</h4>
              <textarea
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-[13px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300 focus:border-orange-400 focus:bg-white dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-200"
                onBlur={commitNotes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Details, links, context…"
                rows={5}
                value={notes}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Subtasks {subtasks.length > 0 && `· ${subtasks.filter(s => s.isCompleted).length}/${subtasks.length}`}
                </h4>
                <button
                  className="ml-auto flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[10.5px] font-bold text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-40 dark:bg-indigo-500/10 dark:text-indigo-300"
                  disabled={!title.trim() || suggesting}
                  onClick={runAiSubtasks}
                  title="Ask Gemini to break this task into subtasks">
                  {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                  AI suggest
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {subtasks.map((sub, i) => (
                  <div className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50 dark:hover:bg-slate-700/40" key={i}>
                    <button className="shrink-0" onClick={() => toggleSubtask(i)}>
                      {sub.isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-300 hover:text-slate-400" />
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
                <div className="flex items-center gap-2 px-1 pt-1">
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
              <div className="flex items-center gap-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Attachments</h4>
                <ImagePlus className="h-3 w-3 text-slate-300" />
              </div>
              <div className="mt-2 space-y-2">
                <AttachmentGallery attachments={attachments} onRemove={removeAttachment} />
                <PasteHint />
              </div>
            </div>
          </div>

          {/* Right column — properties */}
          <div className="space-y-4">
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Status</label>
              <div className="mt-1 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
                {STATUSES.map(s => (
                  <button
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-all ${
                      status === s.key
                        ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-white'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    key={s.key}
                    onClick={() => changeStatus(s.key)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {pinned && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">Highlight</span>
                {NEON_COLORS.map(c => (
                  <button
                    className={`h-4 w-4 rounded-full ${c.dot} ${task?.neonColor === c.key ? 'ring-2 ring-offset-1' : ''}`}
                    key={c.key}
                    onClick={() => commit({neonColor: c.key})}
                    title={c.label}
                  />
                ))}
              </div>
            )}

            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Priority</label>
              <div className="mt-1 flex gap-1">
                {(['High', 'Medium', 'Low', 'None'] as const).map(p => (
                  <button
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold ring-1 ring-inset transition-all ${
                      priority === p ? PRIORITY_META[p].chip : 'bg-white text-slate-400 ring-slate-200 hover:ring-slate-300 dark:bg-slate-700'
                    }`}
                    key={p}
                    onClick={() => changePriority(p)}>
                    {p === 'Medium' ? 'Med' : p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Due date</label>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-1.5 focus-within:border-orange-400 dark:border-slate-600">
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
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                        active
                          ? 'bg-orange-100 text-orange-700 ring-1 ring-inset ring-orange-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700'
                      }`}
                      key={p.label}
                      onClick={() => applyDueDate(active ? '' : iso)}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Category</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] text-slate-700 outline-none placeholder:text-slate-300 focus:border-orange-400 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                onBlur={commitCategory}
                onChange={e => setCategory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                placeholder="e.g. Work"
                value={category}
              />
            </div>

            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Repeats</label>
              <div className="mt-1 flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-orange-400 dark:border-slate-600">
                <Repeat className="h-3.5 w-3.5 text-slate-300" />
                <select
                  className="w-full bg-transparent text-[12.5px] text-slate-700 outline-none dark:text-white"
                  onChange={e => changeRecurrence(e.target.value as RecurrenceFreq)}
                  value={recurrence}>
                  {(Object.keys(RECURRENCE_META) as RecurrenceFreq[]).map(f => (
                    <option key={f} value={f}>
                      {RECURRENCE_META[f]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Tags</label>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {tags.map(tag => (
                  <span
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    key={tag}>
                    <Tag className="h-2.5 w-2.5 text-slate-400" />
                    {tag}
                    <button className="text-slate-300 hover:text-rose-500" onClick={() => removeTag(tag)}>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                <input
                  className="w-24 rounded-lg border border-dashed border-slate-300 px-2 py-1 text-[11px] outline-none placeholder:text-slate-300 focus:border-orange-400 dark:border-slate-600 dark:text-white"
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag()}
                  placeholder="+ tag ↵"
                  value={tagInput}
                />
              </div>
            </div>

            {isEdit && task && (
              <p className="pt-2 text-[10.5px] text-slate-300">
                Created {new Date(task.createdAt).toLocaleDateString()} · Updated{' '}
                {new Date(task.updatedAt).toLocaleDateString()}
              </p>
            )}

            {error && <p className="text-[12px] font-medium text-rose-600">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        {!isEdit && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-3.5 dark:border-slate-700">
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
