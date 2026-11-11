/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {Check, Palette, X} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {api} from './api';
import {AttachmentChip} from './TaskAttachments';
import {useTaskCollection} from './TaskProvider';
import styles from './TaskWorkspace.module.css';
import {colorOf, colorPatch, daysUntil, formatDue, statusOf, Task, TASK_COLOR_KEYS, TASK_COLORS, TaskColor} from './types';

type At = {left: number; top: number};

/** Saves a task's colour; the list updates as soon as the server answers. */
export async function setTaskColor(task: Task, color: TaskColor | null) {
  if (colorOf(task) === color) return;
  await api.update(task._id, colorPatch(color));
}

/** The eight colours (and "none") in a small floating panel. */
export function ColorMenu({task, at, onClose}: {task: Task; at: At; onClose: () => void}) {
  const current = colorOf(task);
  const panel = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const close = (event: Event) => {
      if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape') return;
      if (event.type === 'pointerdown' && panel.current?.contains(event.target as Node)) return;
      onClose();
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [onClose]);
  const pick = (color: TaskColor | null) => {
    onClose();
    void setTaskColor(task, color).catch(() => setError(true));
  };
  const width = 236;
  const left = Math.max(8, Math.min(at.left, window.innerWidth - width - 8));
  const top = Math.min(at.top, window.innerHeight - 64);
  return createPortal(
    <div aria-label={`Colour for ${task.title}`} className={styles.colorMenu} ref={panel} role="menu" style={{left, top}}>
      <button aria-label="No colour" className={styles.colorNone} data-on={!current} onClick={() => pick(null)} role="menuitemradio" title="No colour (0)" type="button">
        <X size={12} />
      </button>
      {TASK_COLOR_KEYS.map((key, i) => (
        <button
          aria-checked={current === key}
          aria-label={TASK_COLORS[key].label}
          data-on={current === key}
          key={key}
          onClick={() => pick(key)}
          role="menuitemradio"
          style={{background: TASK_COLORS[key].dot, ['--ring' as string]: TASK_COLORS[key].dot}}
          title={`${TASK_COLORS[key].label} (${i + 1})`}
          type="button"
        />
      ))}
      {error && <span className={styles.colorError}>Not saved</span>}
    </div>,
    document.body,
  );
}

/**
 * One task on a single line: tick, title, due date and files. The row takes the task's colour.
 * Hover for the palette; right-click anywhere on it, or press 1-8 (0 clears) while it has focus.
 */
export default function TaskRow({
  task,
  selected,
  completedLabel,
  onToggle,
  onOpen,
}: {
  task: Task;
  selected?: boolean;
  completedLabel?: string;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const {busy, drafts} = useTaskCollection();
  const [menu, setMenu] = useState<At | null>(null);
  const paletteBtn = useRef<HTMLButtonElement>(null);
  const done = statusOf(task) === 'done';
  const color = colorOf(task);
  const tone = color ? TASK_COLORS[color] : null;
  const d = daysUntil(task.dueDate);
  // Late tasks show the date they were due (in red) rather than a long "41d overdue"
  const due = !done && task.dueDate ? (d !== null && d < 0 ? new Date(task.dueDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : formatDue(task.dueDate)) : '';

  const openPalette = () => {
    const r = paletteBtn.current?.getBoundingClientRect();
    if (r) setMenu({left: r.right - 236, top: r.bottom + 6});
  };

  return (
    <div
      className={styles.trow}
      data-color={color || undefined}
      data-done={done}
      data-selected={selected}
      onContextMenu={e => {
        e.preventDefault();
        setMenu({left: e.clientX, top: e.clientY + 4});
      }}
      onKeyDown={e => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter') return onOpen();
        if (/^[0-8]$/.test(e.key)) {
          e.preventDefault();
          const n = Number(e.key);
          void setTaskColor(task, n ? TASK_COLOR_KEYS[n - 1] : null).catch(() => undefined);
        }
      }}
      style={tone ? ({['--row-bg' as string]: tone.bg, ['--row-ink' as string]: tone.ink, ['--row-dot' as string]: tone.dot} as React.CSSProperties) : undefined}
      tabIndex={0}>
      <button
        aria-label={`${done ? 'Reopen' : 'Complete'} ${task.title}`}
        aria-pressed={done}
        className={styles.tcheck}
        disabled={busy.includes(task._id)}
        onClick={onToggle}
        type="button">
        <Check size={10} strokeWidth={3.5} />
      </button>
      <button className={styles.ttitle} onClick={onOpen} title={task.title} type="button">
        {task.title}
        {drafts[task._id] && <em className={styles.draftDot} title="Unsaved edits" />}
      </button>
      <span className={styles.tmeta}>
        {done && completedLabel ? (
          <span>{completedLabel}</span>
        ) : (
          due && (
            <span data-late={d !== null && d < 0} data-today={d === 0} title={`${d !== null && d < 0 ? `${-d} day${d === -1 ? '' : 's'} overdue · ` : ''}Due ${new Date(task.dueDate!).toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'})}`}>
              {due}
            </span>
          )
        )}
        <AttachmentChip size={12} task={task} />
      </span>
      <button
        aria-expanded={!!menu}
        aria-label={`Colour for ${task.title}`}
        className={styles.tpalette}
        onClick={() => (menu ? setMenu(null) : openPalette())}
        onPointerDown={e => e.stopPropagation()}
        ref={paletteBtn}
        title="Colour (right-click, or press 1-8)"
        type="button">
        {color ? <span style={{background: TASK_COLORS[color].dot}} /> : <Palette size={13} />}
      </button>
      {menu && <ColorMenu at={menu} onClose={() => setMenu(null)} task={task} />}
    </div>
  );
}

/** Background tint for a coloured task in the larger lists and boards. */
export function tintStyle(task: Task): React.CSSProperties | undefined {
  const color = colorOf(task);
  return color ? {background: TASK_COLORS[color].bg, borderColor: `${TASK_COLORS[color].dot}66`} : undefined;
}

/** A small palette button that opens the colour menu (for rows outside the sidebar). */
export function ColorButton({task, className = ''}: {task: Task; className?: string}) {
  const [menu, setMenu] = useState<At | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const color = colorOf(task);
  return (
    <>
      <button
        aria-expanded={!!menu}
        aria-label={`Colour for ${task.title}`}
        className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 ${className}`}
        onClick={e => {
          e.stopPropagation();
          if (menu) return setMenu(null);
          const r = button.current!.getBoundingClientRect();
          setMenu({left: r.right - 236, top: r.bottom + 6});
        }}
        onPointerDown={e => e.stopPropagation()}
        ref={button}
        title="Colour"
        type="button">
        {color ? <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{background: TASK_COLORS[color].dot}} /> : <Palette size={13} />}
      </button>
      {menu && <ColorMenu at={menu} onClose={() => setMenu(null)} task={task} />}
    </>
  );
}
