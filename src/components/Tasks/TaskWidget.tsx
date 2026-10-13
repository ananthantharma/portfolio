/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {CalendarClock, Check, CircleCheck, FileText, Flag, Hourglass, Plus, X} from 'lucide-react';
import React, {useEffect, useState} from 'react';

import {api} from './api';
import {AssigneePill, CopySubjectButton, glowStyle, GlowToggles, LinkVendorButton, VendorPill} from './TaskExtras';
import {useTaskCollection} from './TaskProvider';
import styles from './TaskWorkspace.module.css';
import {daysUntil, glowOf, statusOf, Subtask, Task, vendorIdOf} from './types';

const PRIORITY_COLOR: Record<Task['priority'], string> = {High: '#e11d48', Medium: '#f59e0b', Low: '#0ea5e9', None: '#a3a89a'};

function statusLabel(task: Task) {
  const status = statusOf(task);
  if (status === 'done') return 'Done';
  if (status === 'in-progress') return 'In progress';
  const d = daysUntil(task.dueDate);
  if (d === null) return 'To do';
  if (d < 0) return `Overdue ${-d}d`;
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due ${new Date(task.dueDate!).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}`;
}

function Bar({pct}: {pct: number}) {
  return (
    <span className={styles.bar}>
      <span style={{width: `${pct}%`}} />
    </span>
  );
}

/**
 * One task as a card. Collapsed: title, checklist progress, priority / status / people.
 * Expanded (click the card): the title and checklist, both editable in place; "…" opens the task's page.
 */
export default function TaskWidget({
  task,
  inGroup,
  underPerson,
  selected,
  completedLabel,
  onToggle,
  onOpen,
}: {
  task: Task;
  inGroup: boolean;
  underPerson?: boolean;
  selected?: boolean;
  completedLabel?: string;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const {busy, drafts} = useTaskCollection();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  // Checklist edits show at once and save in the background
  const [items, setItems] = useState<Subtask[]>(task.subtasks || []);
  const [newItem, setNewItem] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTitle(task.title), [task.title]);
  useEffect(() => setItems(task.subtasks || []), [task.subtasks]);

  const done = statusOf(task) === 'done';
  const total = items.length;
  const finished = items.filter(i => i.isCompleted).length;
  const pct = total ? Math.round((finished / total) * 100) : 0;

  const save = async (patch: Partial<Task>, rollback: () => void) => {
    setError(null);
    try {
      await api.update(task._id, patch as Record<string, unknown>);
    } catch (cause) {
      rollback();
      setError(cause instanceof Error ? cause.message : 'Could not save. Try again.');
    }
  };
  const saveItems = (next: Subtask[]) => {
    const before = items;
    setItems(next);
    void save({subtasks: next}, () => setItems(before));
  };
  const commitTitle = () => {
    const next = title.trim();
    if (!next) return setTitle(task.title);
    if (next !== task.title) void save({title: next}, () => setTitle(task.title));
  };
  const addItem = () => {
    const text = newItem.trim();
    if (!text) return;
    setNewItem('');
    saveItems([...items, {title: text, isCompleted: false}]);
  };

  return (
    <article
      className={styles.card}
      data-done={done}
      data-glow={glowOf(task) || undefined}
      data-open={open}
      data-selected={selected}
      onClick={e => {
        // Buttons and fields do their own thing; anywhere else on the card opens / closes it
        if ((e.target as HTMLElement).closest('button, input, textarea, select, a, label')) return;
        setOpen(v => !v);
      }}
      style={glowStyle(task)}>
      <div className={styles.cardHead}>
        <div className={styles.cardChip}>
          <button
            aria-label={`${done ? 'Reopen' : 'Complete'} ${task.title}`}
            aria-pressed={done}
            className={styles.cardCheck}
            disabled={busy.includes(task._id)}
            onClick={onToggle}
            type="button">
            <Check size={open ? 18 : 14} strokeWidth={3} />
          </button>
          {/* The task's page (notes) — same size as the tick box so it's easy to hit */}
          <button
            aria-label={`Open the page for ${task.title}`}
            className={styles.cardPageBtn}
            data-has={!!task.hasPage}
            onClick={onOpen}
            title={task.hasPage ? 'Open its page' : 'Open page & details'}
            type="button">
            <FileText size={open ? 18 : 14} strokeWidth={2} />
          </button>
          {open ? (
            <textarea
              aria-label="Task name"
              className={styles.cardTitleInput}
              onBlur={commitTitle}
              onChange={e => setTitle(e.target.value.replace(/\s*\n\s*/g, ' '))}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
                if (e.key === 'Escape') {
                  setTitle(task.title);
                  e.currentTarget.blur();
                }
              }}
              rows={1}
              value={title}
            />
          ) : (
            <span className={styles.cardTitle} title={task.title}>
              {task.title}
              {drafts[task._id] && <em className={styles.draftDot} title="Unsaved edits" />}
            </span>
          )}
        </div>
        {!open && total > 0 && (
          <span className={styles.cardProgress}>
            <Bar pct={pct} />
            {pct}%
          </span>
        )}
      </div>

      {!open && (
        <div className={styles.cardMeta}>
          {task.priority !== 'None' && (
            <span>
              <Flag fill={PRIORITY_COLOR[task.priority]} size={13} style={{color: PRIORITY_COLOR[task.priority]}} />
              {task.priority}
            </span>
          )}
          <span>
            {task.dueDate && !done ? <CalendarClock size={13} /> : <Hourglass size={13} />}
            {completedLabel || statusLabel(task)}
          </span>
          <span className={styles.metaRight}>
            {vendorIdOf(task) ? !inGroup && <VendorPill task={task} /> : <span className={styles.hoverOnly}><LinkVendorButton task={task} /></span>}
            {!underPerson && <AssigneePill assignee={task.assignedTo} />}
            <CopySubjectButton size={12} subject={task.emailSubject} />
            <span className={styles.rowTools}>
              <GlowToggles size={12} task={task} />
            </span>
          </span>
        </div>
      )}

      <div className={styles.cardBody}>
        <div>
          {total > 0 && (
            <div className={styles.progressPill}>
              <CircleCheck size={16} />
              <span>
                <b>{finished}</b> of {total}
              </span>
              <Bar pct={pct} />
              <b>{pct}%</b>
            </div>
          )}
          <div className={styles.tree} style={total ? undefined : {marginTop: 14}}>
            {items.map((item, index) => (
              <div className={styles.step} data-done={item.isCompleted} key={item._id || `new-${index}`}>
                <button
                  aria-label={`${item.isCompleted ? 'Uncheck' : 'Check'} ${item.title}`}
                  aria-pressed={item.isCompleted}
                  className={styles.stepCheck}
                  onClick={() => saveItems(items.map((it, i) => (i === index ? {...it, isCompleted: !it.isCompleted} : it)))}
                  type="button">
                  {item.isCompleted && <Check size={11} strokeWidth={3} />}
                </button>
                <input
                  aria-label={`Checklist item ${index + 1}`}
                  className={styles.stepInput}
                  defaultValue={item.title}
                  key={item.title}
                  onBlur={e => {
                    const text = e.target.value.trim();
                    if (!text) e.target.value = item.title;
                    else if (text !== item.title) saveItems(items.map((it, i) => (i === index ? {...it, title: text} : it)));
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                    if (e.key === 'Escape') {
                      e.currentTarget.value = item.title;
                      e.currentTarget.blur();
                    }
                  }}
                />
                <button
                  aria-label={`Remove ${item.title}`}
                  className={styles.stepRemove}
                  onClick={() => saveItems(items.filter((_, i) => i !== index))}
                  type="button">
                  <X size={13} />
                </button>
              </div>
            ))}
            <div className={`${styles.step} ${styles.stepAdd}`}>
              <button aria-label="Add checklist item" className={styles.stepCheck} disabled={!newItem.trim()} onClick={addItem} type="button">
                <Plus size={11} strokeWidth={3} />
              </button>
              <input
                aria-label="New checklist item"
                className={styles.stepInput}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem();
                  }
                }}
                placeholder="Add a step…"
                value={newItem}
              />
            </div>
          </div>
          {error && (
            <p className={styles.cardError} role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
