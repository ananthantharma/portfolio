'use client';
/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import styles from './ToolRail.module.css';

export type ToolRailItem = {
  label: string;
  Icon: React.ComponentType<{className?: string}>;
  action: () => void;
  /** Optional key hints shown beside the label, e.g. ['⌘', 'K'] */
  keys?: string[];
};

type Tip = {x: number; y: number; clipPath: string};

/**
 * Dark pill of round icon buttons. Hovering shows one tooltip that glides and reshapes
 * between labels (all labels live in a single panel; a clip-path reveals the active one).
 * Expanded, the pill widens and shows the labels inline instead.
 */
export default function ToolRail({
  items,
  expanded,
  onToggle,
  toggleIcon: ToggleIcon,
  collapseIcon: CollapseIcon,
  tooltipDelay = 300,
}: {
  items: ToolRailItem[];
  expanded: boolean;
  onToggle: () => void;
  toggleIcon: React.ComponentType<{className?: string}>;
  collapseIcon: React.ComponentType<{className?: string}>;
  tooltipDelay?: number;
}) {
  // Index -1 is the expand/collapse toggle at the top of the pill
  const all = [{label: expanded ? 'Collapse tools' : 'Expand tools', Icon: ToggleIcon, action: onToggle} as ToolRailItem, ...items];
  const [active, setActive] = useState<number | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [instant, setInstant] = useState(true);
  const [mounted, setMounted] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const measure = useCallback((i: number): Tip | null => {
    const btn = buttons.current[i];
    const row = rows.current[i];
    const box = panel.current;
    if (!btn || !row || !box) return null;
    const b = btn.getBoundingClientRect();
    const total = box.offsetHeight;
    const width = box.offsetWidth;
    const top = (row.offsetTop / total) * 100;
    const bottom = 100 - ((row.offsetTop + row.offsetHeight) / total) * 100;
    const right = Math.max(0, width - row.offsetWidth);
    return {
      x: b.right + 12,
      y: b.top + b.height / 2 - (row.offsetTop + row.offsetHeight / 2),
      clipPath: `inset(${top}% ${right}px ${bottom}% 0 round 8px)`,
    };
  }, []);

  const show = (i: number, immediate = false) => {
    if (expanded) return;
    if (timer.current) clearTimeout(timer.current);
    if (active === null) {
      // First hover waits a beat, then appears in place (no glide from nowhere)
      timer.current = setTimeout(
        () => {
          const next = measure(i);
          if (!next) return;
          setInstant(true);
          setTip(next);
          setActive(i);
          requestAnimationFrame(() => requestAnimationFrame(() => setInstant(false)));
        },
        immediate ? 0 : tooltipDelay,
      );
    } else {
      const next = measure(i);
      if (!next) return;
      setTip(next);
      setActive(i);
    }
  };

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setActive(null);
    setInstant(true);
  };

  useEffect(() => {
    if (expanded) hide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const tooltip =
    mounted &&
    createPortal(
      <div
        aria-hidden
        className={`${styles.tooltip} ${instant ? styles.instant : ''}`}
        ref={panel}
        style={{
          opacity: active !== null && tip ? 1 : 0,
          transform: tip ? `translate3d(${tip.x}px, ${tip.y}px, 0)` : undefined,
          clipPath: tip?.clipPath,
        }}>
        {all.map((item, i) => (
          <div className={styles.row} key={item.label} ref={el => void (rows.current[i] = el)}>
            <span>{item.label}</span>
            {item.keys && (
              <span className={styles.keys}>
                {item.keys.map(k => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </span>
            )}
          </div>
        ))}
      </div>,
      document.body,
    );

  return (
    <nav aria-label="Tools" className={styles.rail} data-expanded={expanded}>
      <div className={styles.pill} onMouseLeave={hide} onScroll={hide}>
        {all.map(({label, Icon, action}, i) => (
          <React.Fragment key={label}>
            <button
              aria-expanded={i === 0 ? expanded : undefined}
              aria-label={label}
              className={`${styles.item} ${i === 0 ? styles.toggle : ''} ${active === i ? styles.active : ''}`}
              onBlur={hide}
              onClick={() => {
                hide();
                action();
              }}
              onFocus={e => e.currentTarget.matches(':focus-visible') && show(i, true)}
              onMouseEnter={() => show(i)}
              ref={el => void (buttons.current[i] = el)}
              type="button">
              <span className={styles.icon}>{i === 0 && expanded ? <CollapseIcon /> : <Icon />}</span>
              <span className={styles.label}>{label}</span>
            </button>
            {i === 0 && <span className={styles.divider} />}
          </React.Fragment>
        ))}
      </div>
      {tooltip}
    </nav>
  );
}
