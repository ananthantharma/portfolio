/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {CalendarDays, CheckCircle2, Circle, Loader2, Plus, Sparkles, Tag, Timer, X} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';

import {api} from './api';
import {PRIORITY_META, startOfDay, Status, STATUSES, Task} from './types';

interface NewTaskModalProps {
  defaultStatus?: Status;
  onClose: () => void;
  onCreated: (task: Task) => void;
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

export default function NewTaskModal({defaultStatus = 'todo', onClose, onCreated}: NewTaskModalProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('None');
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [dueDate, setDueDate] = useState<string>(''); // yyyy-mm-dd
  const [category, setCategory] = useState('');
  const [estimate, setEstimate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

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

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const addSubtask = () => {
    const t = subtaskInput.trim();
    if (t) setSubtasks([...subtasks, t]);
    setSubtaskInput('');
  };

  const submit = async () => {
    const t = title.trim();
    if (!t || saving) return;
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
        ...(estimate && Number(estimate) > 0 ? {estimatedTime: Number(estimate)} : {}),
        tags,
        subtasks: subtasks.map(s => ({title: s, isCompleted: false})),
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-slate-900/40 px-4 pt-[10vh] backdrop-blur-[2px]"
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg animate-scale-in overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-rose-50 px-5 py-3.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <h2 className="text-[15px] font-bold text-slate-800">New task</h2>
          <button
            className="ml-auto rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
            onClick={onClose}
            title="Close (Esc)">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
          {/* Title */}
          <input
            className="w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-[15px] font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-300 focus:border-orange-400"
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="What needs to be done?"
            ref={titleRef}
            value={title}
          />

          {/* Status + Priority */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Status</label>
              <div className="mt-1 flex rounded-xl bg-slate-100 p-1">
                {STATUSES.map(s => (
                  <button
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-all ${
                      status === s.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    key={s.key}
                    onClick={() => setStatus(s.key)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Priority</label>
              <div className="mt-1 flex gap-1">
                {(['High', 'Medium', 'Low', 'None'] as const).map(p => (
                  <button
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold ring-1 ring-inset transition-all ${
                      priority === p ? PRIORITY_META[p].chip : 'bg-white text-slate-400 ring-slate-200 hover:ring-slate-300'
                    }`}
                    key={p}
                    onClick={() => setPriority(p)}>
                    {p === 'Medium' ? 'Med' : p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Due date */}
          <div className="mt-3">
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Due date</label>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-1.5 focus-within:border-orange-400">
                <CalendarDays className="h-3.5 w-3.5 text-slate-300" />
                <input
                  className="bg-transparent text-[12.5px] text-slate-700 outline-none"
                  onChange={e => setDueDate(e.target.value)}
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
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                    key={p.label}
                    onClick={() => setDueDate(active ? '' : iso)}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category + Estimate */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Category</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[12.5px] text-slate-700 outline-none placeholder:text-slate-300 focus:border-orange-400"
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Work"
                value={category}
              />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Estimate (min)</label>
              <div className="mt-1 flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-orange-400">
                <Timer className="h-3.5 w-3.5 text-slate-300" />
                <input
                  className="w-full bg-transparent text-[12.5px] text-slate-700 outline-none placeholder:text-slate-300"
                  min={0}
                  onChange={e => setEstimate(e.target.value)}
                  placeholder="30"
                  type="number"
                  value={estimate}
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="mt-3">
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Tags</label>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {tags.map(tag => (
                <span
                  className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
                  key={tag}>
                  <Tag className="h-2.5 w-2.5 text-slate-400" />
                  {tag}
                  <button className="text-slate-300 hover:text-rose-500" onClick={() => setTags(tags.filter(t => t !== tag))}>
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              <input
                className="w-24 rounded-lg border border-dashed border-slate-300 px-2 py-1 text-[11px] outline-none placeholder:text-slate-300 focus:border-orange-400"
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="+ tag ↵"
                value={tagInput}
              />
            </div>
          </div>

          {/* Subtasks */}
          <div className="mt-3">
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Subtasks</label>
            <div className="mt-1 space-y-1">
              {subtasks.map((s, i) => (
                <div className="group flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5" key={i}>
                  <Circle className="h-3.5 w-3.5 text-slate-300" />
                  <span className="flex-1 text-[12.5px] text-slate-700">{s}</span>
                  <button
                    className="text-slate-300 hover:text-rose-500"
                    onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 px-1">
                <Plus className="h-3.5 w-3.5 text-slate-300" />
                <input
                  className="flex-1 bg-transparent py-1 text-[12.5px] text-slate-700 outline-none placeholder:text-slate-300"
                  onChange={e => setSubtaskInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSubtask()}
                  placeholder="Add a subtask and press Enter"
                  value={subtaskInput}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-3">
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Notes</label>
            <textarea
              className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-[12.5px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300 focus:border-orange-400 focus:bg-white"
              onChange={e => setNotes(e.target.value)}
              placeholder="Details, links, context…"
              rows={3}
              value={notes}
            />
          </div>

          {error && <p className="mt-2 text-[12px] font-medium text-rose-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            className="rounded-xl px-4 py-2 text-[12.5px] font-semibold text-slate-500 transition-colors hover:bg-slate-100"
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
      </div>
    </div>
  );
}
