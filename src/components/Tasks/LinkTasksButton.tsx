/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

// Link existing tasks to a note (and, from a vendor or project page, to that vendor/project too).

import {Check, Link2, ListTodo, Search, Unlink, X} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {api} from './api';
import styles from './LinkTasks.module.css';
import {useOptionalTaskCollection} from './TaskProvider';
import {formatDue, smartCompare, statusOf, Task, TaskVendor, vendorIdOf} from './types';

function pageIdOf(task: Task): string | null {
  const p = task.sourcePageId;
  if (!p) return null;
  return typeof p === 'string' ? p : p._id || null;
}

function pageTitleOf(task: Task): string {
  return typeof task.sourcePageId === 'object' && task.sourcePageId?.title ? task.sourcePageId.title : 'another note';
}

interface Props {
  pageId: string;
  pageTitle: string;
  // When linking from a vendor/project page, unlinked tasks also get that vendor/project
  vendor?: TaskVendor | null;
  variant?: 'row' | 'toolbar';
}

export default function LinkTasksButton({pageId, pageTitle, vendor, variant = 'row'}: Props) {
  const collection = useOptionalTaskCollection();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [pos, setPos] = useState<{top: number; left: number} | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const tasks = collection?.tasks;
  const live = useMemo(() => (tasks || []).filter(t => !t.isTemplate && !t.isArchived), [tasks]);
  const linked = useMemo(() => live.filter(t => pageIdOf(t) === pageId).sort(smartCompare), [live, pageId]);
  const openLinked = linked.filter(t => statusOf(t) !== 'done').length;

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return live
      .filter(t => pageIdOf(t) !== pageId && statusOf(t) !== 'done')
      .filter(t => !q || `${t.title} ${t.category || ''} ${(t.tags || []).join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => {
        // Tasks already on this vendor/project come first
        const av = vendor && vendorIdOf(a) === vendor._id ? 0 : 1;
        const bv = vendor && vendorIdOf(b) === vendor._id ? 0 : 1;
        return av - bv || smartCompare(a, b);
      })
      .slice(0, 60);
  }, [live, pageId, query, vendor]);

  // The panel is portalled to <body> so toolbars and cards with overflow can't clip it
  const place = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(360, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const below = rect.bottom + 6;
    const top = below + 420 > window.innerHeight ? Math.max(8, rect.top - 426) : below;
    setPos({top, left});
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onMove = () => place();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  if (!collection) return null;

  const run = async (task: Task, patch: Record<string, unknown>) => {
    setError('');
    try {
      await collection.run(task._id, () => api.update(task._id, patch));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the task.');
    }
  };

  const link = (task: Task) =>
    run(task, {sourcePageId: pageId, ...(vendor && !vendorIdOf(task) ? {vendorSectionId: vendor._id} : {})});
  const unlink = (task: Task) => run(task, {sourcePageId: null});

  const label = variant === 'toolbar' ? (linked.length ? `Tasks · ${openLinked}` : 'Link tasks') : linked.length ? `${openLinked}` : '';

  return (
    <>
      <button
        aria-expanded={open}
        aria-label={`Tasks linked to ${pageTitle}`}
        className={variant === 'toolbar' ? styles.toolbarButton : styles.rowButton}
        data-has={linked.length > 0}
        onClick={e => {
          e.stopPropagation();
          setOpen(v => !v);
        }}
        ref={buttonRef}
        title={linked.length ? `${openLinked} open of ${linked.length} linked task${linked.length === 1 ? '' : 's'}` : 'Link existing tasks to this note'}
        type="button">
        <ListTodo size={variant === 'toolbar' ? 14 : 13} />
        {label}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            aria-label={`Tasks for ${pageTitle}`}
            className={styles.panel}
            onClick={e => e.stopPropagation()}
            ref={panelRef}
            role="dialog"
            style={{top: pos.top, left: pos.left}}>
            <div className={styles.head}>
              <strong>Tasks for this note</strong>
              <button aria-label="Close" className={styles.icon} onClick={() => setOpen(false)} type="button">
                <X size={14} />
              </button>
            </div>

            {linked.length > 0 ? (
              <ul className={styles.linked}>
                {linked.map(t => (
                  <li key={t._id} data-done={statusOf(t) === 'done'}>
                    <span className={styles.status}>{statusOf(t) === 'done' ? <Check size={11} /> : null}</span>
                    <span className={styles.title}>
                      {t.title}
                      {t.dueDate && <small>{formatDue(t.dueDate)}</small>}
                    </span>
                    <button
                      aria-label={`Unlink ${t.title} from this note`}
                      className={styles.icon}
                      disabled={collection.busy.includes(t._id)}
                      onClick={() => unlink(t)}
                      title="Unlink from this note (keeps the task)"
                      type="button">
                      <Unlink size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>No tasks linked yet. Pick one below.</p>
            )}

            <label className={styles.search}>
              <Search size={13} />
              <input
                aria-label="Search your open tasks"
                autoFocus
                onChange={e => setQuery(e.target.value)}
                placeholder="Find an open task to link"
                value={query}
              />
            </label>
            <div className={styles.candidates}>
              {candidates.length ? (
                candidates.map(t => (
                  <button
                    className={styles.candidate}
                    disabled={collection.busy.includes(t._id)}
                    key={t._id}
                    onClick={() => link(t)}
                    type="button">
                    <Link2 size={13} />
                    <span>
                      {t.title}
                      <small>
                        {[
                          t.dueDate && formatDue(t.dueDate),
                          pageIdOf(t) && `Moves from ${pageTitleOf(t)}`,
                          vendor && vendorIdOf(t) === vendor._id && `On ${vendor.name}`,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Not linked to a note'}
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <p className={styles.empty}>{query ? 'No open tasks match.' : 'Every open task is already linked here.'}</p>
              )}
            </div>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
