/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import {ArrowLeft, Building2, CalendarClock, Check, Flag, FolderKanban, Layers, ListChecks, Loader2, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, Tag, X} from 'lucide-react';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import RichTextEditor from '../Notes/RichTextEditor';
import {api} from './api';
import {saveTaskChanges} from './taskActions';
import {AssigneePill, useTaskGroups, useVendorOptions} from './TaskExtras';
import {useTaskCollection} from './TaskProvider';
import {NoteContext, TaskEditor} from './TaskWorkspace';
import styles from './TaskWorkspace.module.css';
import {bucketOf, daysUntil, formatDue, statusOf, subtaskProgress, TASK_BUCKETS, vendorIdOf, vendorOf} from './types';

type SaveState = 'loading' | 'saved' | 'saving' | 'unsaved' | 'error';

/** Something worth keeping: text, or a picture/table/divider/drawing. */
const hasContent = (html: string) => !!html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() || /<(img|table|hr)\b|data-lexical-drawing/i.test(html);

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
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
 * The private page behind a task. Header with the task's key facts, the Word-style editor (autosaves),
 * and the full task details in a side panel.
 */
export function TaskPageView({taskId, note, onClose, backLabel, actions}: {taskId: string; note?: NoteContext; onClose: () => void; backLabel?: string; actions?: React.ReactNode}) {
  const {tasks, busy, run} = useTaskCollection();
  const task = tasks.find(t => t._id === taskId);
  const vendors = useVendorOptions();
  const groups = useTaskGroups();
  const [content, setContent] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [title, setTitle] = useState(task?.title || '');
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPageRef = useRef(!!task?.hasPage);

  useEffect(() => setShowDetails(read('TASK_PAGE_DETAILS', true)), []);
  useEffect(() => setTitle(task?.title || ''), [task?.title]);
  useEffect(() => {
    hasPageRef.current = !!task?.hasPage;
  }, [task?.hasPage]);

  // Load the page
  useEffect(() => {
    let alive = true;
    setContent(null);
    setSave('loading');
    setError(null);
    fetch(`/api/todos/${taskId}/page`)
      .then(async res => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) throw new Error(json?.error || 'Could not open this page');
        if (alive) {
          setContent(json.data.content || '');
          setSave('saved');
        }
      })
      .catch(e => alive && (setError(e instanceof Error ? e.message : 'Could not open this page'), setSave('error')));
    return () => {
      alive = false;
    };
  }, [taskId]);

  /** Save whatever is pending (also used on close, with keepalive so it survives unmount). */
  const flush = useCallback(
    async (keepalive = false) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      const html = pending.current;
      if (html === null) return;
      pending.current = null;
      setSave('saving');
      try {
        const res = await fetch(`/api/todos/${taskId}/page`, {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({content: html}), keepalive: keepalive && html.length < 60000});
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) throw new Error(json?.error || 'Not saved');
        setSave(pending.current === null ? 'saved' : 'unsaved');
        // Show the page icon on the task card when there's something on the page
        const has = hasContent(html);
        if (has !== hasPageRef.current) {
          hasPageRef.current = has;
          void api.update(taskId, {hasPage: has}).catch(() => undefined);
        }
      } catch (e) {
        pending.current = pending.current ?? html;
        setSave('error');
        setError(e instanceof Error ? e.message : 'Not saved');
      }
    },
    [taskId],
  );

  useEffect(
    () => () => {
      void flush(true);
    },
    [flush],
  );
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current !== null) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const onChange = (html: string) => {
    pending.current = html;
    setSave('unsaved');
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 900);
  };

  const close = () => {
    void flush(true);
    onClose();
  };

  // A deleted task closes its page
  useEffect(() => {
    if (!task && save !== 'loading' && tasks.length) onClose();
  }, [task, tasks.length, save, onClose]);

  if (!task) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening…
      </div>
    );
  }

  const done = statusOf(task) === 'done';
  const d = daysUntil(task.dueDate);
  const {done: sd, total: st} = subtaskProgress(task);
  const vId = vendorIdOf(task);
  const vendor = vId ? vendors?.find(v => v._id === vId) : undefined;
  const linkName = vId ? vendor?.name || vendorOf(task)?.name : task.taskGroupId ? groups?.find(g => g._id === task.taskGroupId)?.name : undefined;
  const LinkIcon = vId ? (vendor?.kind === 'project' ? FolderKanban : Building2) : Tag;
  const chip = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-[3px] text-[12px] font-medium transition hover:border-slate-300';
  const openDetails = () => {
    setShowDetails(true);
    write('TASK_PAGE_DETAILS', true);
  };
  const saveLabel = {loading: 'Opening…', saved: 'Saved', saving: 'Saving…', unsaved: 'Editing…', error: 'Not saved'}[save];

  const commitTitle = () => {
    const next = title.trim();
    if (!next || next === task.title) return setTitle(task.title);
    void run(task._id, () => api.update(task._id, {title: next}));
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-3.5">
        <button className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800" onClick={close} title={backLabel ? `Back to ${backLabel}` : 'Close'} type="button">
          <ArrowLeft className="h-4 w-4" />
          {backLabel && <span className="hidden sm:inline">{backLabel}</span>}
        </button>
        <button
          aria-label={done ? 'Reopen task' : 'Complete task'}
          className={`mt-2 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition ${done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500'}`}
          disabled={busy.includes(task._id)}
          onClick={() => void run(task._id, () => saveTaskChanges(task, {isCompleted: !done, status: done ? 'todo' : 'done'}))}
          type="button">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <input
            aria-label="Task title"
            className={`w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[21px] font-semibold tracking-tight outline-none hover:border-slate-200 focus:border-indigo-300 ${done ? 'text-slate-400 line-through' : 'text-slate-900'}`}
            onBlur={commitTitle}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setTitle(task.title);
                (e.target as HTMLInputElement).blur();
              }
            }}
            value={title}
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1">
            <button className={`${chip} ${d !== null && d < 0 && !done ? 'border-rose-200 bg-rose-50 text-rose-700' : d === 0 && !done ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600'}`} onClick={openDetails} type="button">
              <CalendarClock className="h-3.5 w-3.5" />
              {task.dueDate ? formatDue(task.dueDate) : 'No due date'}
            </button>
            {task.priority !== 'None' && (
              <button className={`${chip} border-slate-200 bg-white text-slate-600`} onClick={openDetails} type="button">
                <Flag className="h-3.5 w-3.5" style={{color: {High: '#e11d48', Medium: '#f59e0b', Low: '#0ea5e9'}[task.priority]}} />
                {task.priority}
              </button>
            )}
            <button className={`${chip} border-slate-200 bg-white text-slate-600`} onClick={openDetails} type="button">
              <Layers className="h-3.5 w-3.5 text-[#6b885c]" />
              {TASK_BUCKETS.find(b => b.key === bucketOf(task))?.label}
            </button>
            {linkName && (
              <button className={`${chip} border-slate-200 bg-white text-slate-600`} onClick={openDetails} type="button">
                <LinkIcon className="h-3.5 w-3.5" />
                {linkName}
              </button>
            )}
            {st > 0 && (
              <button className={`${chip} border-slate-200 bg-white ${sd === st ? 'text-emerald-600' : 'text-slate-600'}`} onClick={openDetails} type="button">
                <ListChecks className="h-3.5 w-3.5" />
                {sd}/{st}
              </button>
            )}
            {statusOf(task) === 'in-progress' && <span className={`${chip} border-amber-200 bg-amber-50 text-amber-700`}>In progress</span>}
            <AssigneePill assignee={task.assignedTo} />
          </div>
        </div>
        <span className={`mt-2.5 flex shrink-0 items-center gap-1 text-[11.5px] ${save === 'error' ? 'text-rose-600' : 'text-slate-400'}`} title={error || undefined}>
          {save === 'saving' || save === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : save === 'saved' ? <Check className="h-3 w-3 text-emerald-500" /> : null}
          {saveLabel}
        </span>
        <button
          className={`mt-1 rounded-lg p-2 ${showDetails ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
          onClick={() => {
            setShowDetails(v => (write('TASK_PAGE_DETAILS', !v), !v));
          }}
          title={showDetails ? 'Hide task details' : 'Show task details'}
          type="button">
          {showDetails ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </button>
        {actions}
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {error && save === 'error' && content === null ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-[13px] text-slate-500">
              {error}
            </div>
          ) : content === null ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening page…
            </div>
          ) : (
            <div className="absolute inset-0">
              <RichTextEditor key={taskId} onChange={onChange} placeholder="This task's page. Notes, emails, decisions, anything. Press “/” for headings, lists, tables…" title={task.title} value={content} />
            </div>
          )}
        </div>
        {showDetails && (
          <aside className="w-[360px] shrink-0 overflow-y-auto border-l border-slate-200 bg-[#fffefa] max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-20 max-lg:shadow-2xl">
            <div className={`${styles.workspace} ${styles.compact}`} style={{display: 'block', height: 'auto'}}>
              <TaskEditor
                key={task._id}
                note={note}
                onClose={() => {
                  setShowDetails(false);
                  write('TASK_PAGE_DETAILS', false);
                }}
                task={task}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/** The task page as its own window over the app (opened by clicking a task in the sidebar or Tasks page). */
export default function TaskPageWindow({taskId, note, onClose}: {taskId: string; note?: NoteContext; onClose: () => void}) {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => setMaximized(read('TASK_PAGE_MAX', false)), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (/input|textarea|select/i.test(el.tagName) || el.isContentEditable);
      if (e.key === 'Escape' && !typing) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[225] flex items-center justify-center bg-slate-900/35 backdrop-blur-[3px]" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div aria-label="Task page" aria-modal className={`relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] transition-[width,height] duration-200 ${maximized ? 'h-[96vh] w-[97vw]' : 'h-[92vh] w-[96vw] md:h-[86vh] md:w-[82vw]'}`} role="dialog">
        <TaskPageView
          actions={
            <>
              <button className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setMaximized(v => (write('TASK_PAGE_MAX', !v), !v))} title={maximized ? 'Restore size' : 'Fill the screen'} type="button">
                {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose} title="Close (Esc)" type="button">
                <X className="h-4 w-4" />
              </button>
            </>
          }
          note={note}
          onClose={onClose}
          taskId={taskId}
        />
      </div>
    </div>,
    document.body,
  );
}
