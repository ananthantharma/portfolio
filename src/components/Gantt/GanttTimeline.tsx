/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import {ArrowLeftToLine, ArrowRightToLine, ChevronDown, ChevronRight, Plus, Trash2} from 'lucide-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';

import {dateOf, duration, fmt, fromDay, GTask, isLate, PX_PER_DAY, Row, toDay, todayDay, weekdayOf, Zoom} from './gantt';

const ROW_H = 40;
const HEAD_H = 58;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface Props {
  rows: Row[];
  byId: Map<string, GTask>;
  colors: Record<string, string>;
  zoom: Zoom;
  showDetails: boolean;
  showDeps: boolean;
  showCritical: boolean;
  critical: Set<string>;
  highlight?: Set<string>;
  selectedId: string | null;
  scrollKey: number;
  onSelect: (id: string | null) => void;
  onMove: (id: string, dStart: number, dEnd: number) => void;
  onLink: (from: string, to: string) => void;
  onToggle: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAddChild: (id: string) => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
  onDelete: (id: string) => void;
}

type Drag = {id: string; mode: 'move' | 'start' | 'end'; x0: number; dS: number; dE: number; moved: boolean; ids: Set<string>; dur: number};
type Link = {from: string; x1: number; y1: number; x2: number; y2: number};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]!.toUpperCase())
    .join('');

/** Group consecutive days that share a key into header cells. */
function segments(lo: number, days: number, key: (d: number) => string, label: (d: number) => string) {
  const out: {left: number; width: number; label: string}[] = [];
  let curKey = '';
  for (let i = 0; i < days; i++) {
    const k = key(lo + i);
    if (k !== curKey) {
      out.push({left: i, width: 1, label: label(lo + i)});
      curKey = k;
    } else out[out.length - 1].width++;
  }
  return out;
}

export default function GanttTimeline(props: Props) {
  const {rows, byId, colors, zoom, showDetails, showDeps, showCritical, critical, highlight, selectedId, scrollKey} = props;
  const px = PX_PER_DAY[zoom];
  const gridW = showDetails ? 560 : 300;
  const scrollRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [link, setLink] = useState<Link | null>(null);
  const [renaming, setRenaming] = useState<{id: string; value: string} | null>(null);
  const today = todayDay();

  // Visible date range, padded and aligned to a week or month start
  const range = useMemo(() => {
    const all = [...byId.values()];
    let lo = all.length ? Math.min(...all.map(t => toDay(t.start))) : today;
    let hi = all.length ? Math.max(...all.map(t => toDay(t.end))) : today + 30;
    lo = Math.min(lo, today);
    hi = Math.max(hi, today);
    const pad = {day: 7, week: 21, month: 45, quarter: 100}[zoom];
    lo -= pad;
    hi += pad * 2;
    if (zoom === 'day' || zoom === 'week') lo -= (weekdayOf(lo) + 6) % 7;
    else {
      const d = dateOf(lo);
      lo = Math.round(Date.UTC(d.getUTCFullYear(), zoom === 'quarter' ? Math.floor(d.getUTCMonth() / 3) * 3 : d.getUTCMonth(), 1) / 86400000);
    }
    return {lo, days: hi - lo + 1};
  }, [byId, zoom, today]);

  const width = range.days * px;
  const rowIndex = useMemo(() => new Map(rows.map((r, i) => [r.task.id, i])), [rows]);

  const header = useMemo(() => {
    const {lo, days} = range;
    const ym = (d: number) => `${dateOf(d).getUTCFullYear()}-${dateOf(d).getUTCMonth()}`;
    const year = (d: number) => `${dateOf(d).getUTCFullYear()}`;
    const top =
      zoom === 'day' || zoom === 'week'
        ? segments(lo, days, ym, d => `${MONTHS_LONG[dateOf(d).getUTCMonth()]} ${dateOf(d).getUTCFullYear()}`)
        : segments(lo, days, year, year);
    const bottom =
      zoom === 'day'
        ? segments(lo, days, d => `${d}`, d => `${dateOf(d).getUTCDate()}`)
        : zoom === 'week'
          ? segments(lo, days, d => `${d - ((weekdayOf(d) + 6) % 7)}`, d => `${MONTHS[dateOf(d).getUTCMonth()]} ${dateOf(d).getUTCDate()}`)
          : zoom === 'month'
            ? segments(lo, days, ym, d => MONTHS[dateOf(d).getUTCMonth()])
            : segments(lo, days, d => `${dateOf(d).getUTCFullYear()}-${Math.floor(dateOf(d).getUTCMonth() / 3)}`, d => `Q${Math.floor(dateOf(d).getUTCMonth() / 3) + 1}`);
    const monthStarts = segments(lo, days, ym, () => '').map(s => s.left);
    const weekends: number[] = [];
    if (zoom === 'day' || zoom === 'week') for (let i = 0; i < days; i++) if ([0, 6].includes(weekdayOf(lo + i))) weekends.push(i);
    return {top, bottom, monthStarts, weekends};
  }, [range, zoom]);

  // Keep today in view when the chart opens or the zoom changes
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = Math.max(0, (today - range.lo) * px - 220);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey, zoom]);

  /* ── dragging bars ── */
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const delta = Math.round((e.clientX - d.x0) / px);
      let dS = delta;
      let dE = delta;
      if (d.mode === 'start') {
        dS = Math.min(delta, d.dur - 1);
        dE = 0;
      } else if (d.mode === 'end') {
        dS = 0;
        dE = Math.max(delta, -(d.dur - 1));
      }
      const next = {...d, dS, dE, moved: d.moved || Math.abs(e.clientX - d.x0) > 3};
      dragRef.current = next;
      setDrag(next);
    };
    const onUp = () => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d) return;
      if (d.moved && (d.dS || d.dE)) props.onMove(d.id, d.dS, d.dE);
      else if (!d.moved) props.onSelect(d.id);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, {once: true});
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!drag, px]);

  const startDrag = (e: React.PointerEvent, t: GTask, mode: Drag['mode'], isParent: boolean) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const ids = new Set([t.id]);
    if (isParent) {
      // Moving a phase moves everything inside it
      const walk = (pid: string): void =>
        [...byId.values()]
          .filter(x => x.parentId === pid)
          .forEach(c => {
            ids.add(c.id);
            walk(c.id);
          });
      walk(t.id);
    }
    const d: Drag = {id: t.id, mode, x0: e.clientX, dS: 0, dE: 0, moved: false, ids, dur: duration(t)};
    dragRef.current = d;
    setDrag(d);
  };

  /* ── linking bars (dependencies) ── */
  useEffect(() => {
    if (!link) return;
    const onMove = (e: PointerEvent) => {
      const r = layerRef.current?.getBoundingClientRect();
      if (r) setLink(l => (l ? {...l, x2: e.clientX - r.left, y2: e.clientY - r.top} : l));
    };
    const onUp = (e: PointerEvent) => {
      const target = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest('[data-bar-id]') as HTMLElement | null;
      const to = target?.dataset.barId;
      setLink(l => {
        if (l && to && to !== l.from) props.onLink(l.from, to);
        return null;
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, {once: true});
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!link]);

  /** Where a task is drawn right now (including a drag in progress). */
  const geo = (t: GTask) => {
    let s = toDay(t.start);
    let e = toDay(t.end);
    if (drag && drag.ids.has(t.id)) {
      s += drag.dS;
      e += drag.dE;
    }
    const x = (s - range.lo) * px;
    const w = (e - s + 1) * px;
    return {x, w, s, e};
  };

  const depPaths = useMemo(() => {
    if (!showDeps) return [];
    const out: {d: string; crit: boolean; key: string}[] = [];
    rows.forEach((r, i) => {
      r.task.dependencies.forEach(depId => {
        const j = rowIndex.get(depId);
        const dep = byId.get(depId);
        if (j === undefined || !dep) return;
        const a = geo(dep);
        const b = geo(r.task);
        const x1 = (dep.type === 'milestone' ? a.x + px / 2 + 8 : a.x + a.w) + 1;
        const y1 = j * ROW_H + ROW_H / 2;
        const x2 = (r.task.type === 'milestone' ? b.x + px / 2 - 9 : b.x) - 1;
        const y2 = i * ROW_H + ROW_H / 2;
        const d =
          x2 - x1 >= 18
            ? `M${x1},${y1} H${x1 + 9} V${y2} H${x2}`
            : `M${x1},${y1} H${x1 + 9} V${y1 + (y2 > y1 ? ROW_H / 2 : -ROW_H / 2)} H${x2 - 12} V${y2} H${x2}`;
        out.push({d, crit: showCritical && critical.has(depId) && critical.has(r.task.id), key: `${depId}>${r.task.id}`});
      });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, rowIndex, byId, showDeps, showCritical, critical, drag, range, px]);

  const bodyH = rows.length * ROW_H;

  return (
    <div className="relative h-full overflow-auto overscroll-contain bg-white" ref={scrollRef}>
      <div className="relative" style={{width: gridW + width, minHeight: HEAD_H + bodyH + ROW_H * 2}}>
        {/* Header */}
        <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-white/95 backdrop-blur" style={{height: HEAD_H}}>
          <div className="sticky left-0 z-40 flex shrink-0 items-end border-r border-slate-200 bg-white px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400" style={{width: gridW}}>
            <span className="flex-1">Task</span>
            {showDetails && (
              <>
                <span className="w-[74px]">Start</span>
                <span className="w-[74px]">Finish</span>
                <span className="w-[44px] text-right">Days</span>
                <span className="w-[76px] pl-3">Progress</span>
              </>
            )}
          </div>
          <div className="relative shrink-0" style={{width}}>
            {header.top.map(s => (
              <div className="absolute top-0 flex h-[28px] items-center overflow-hidden whitespace-nowrap border-l border-slate-200 px-2 text-[11.5px] font-semibold text-slate-700" key={`t${s.left}`} style={{left: s.left * px, width: s.width * px}}>
                <span className="sticky left-2">{s.label}</span>
              </div>
            ))}
            {header.bottom.map(s => {
              const isToday = zoom === 'day' && range.lo + s.left === today;
              return (
                <div
                  className={`absolute top-[28px] flex h-[30px] items-center justify-center overflow-hidden whitespace-nowrap border-l border-t border-slate-100 text-[10.5px] ${isToday ? 'font-bold text-indigo-600' : 'text-slate-500'}`}
                  key={`b${s.left}`}
                  style={{left: s.left * px, width: s.width * px}}>
                  {zoom === 'day' ? (
                    <span className="flex flex-col items-center leading-[1.1]">
                      <span className="text-[8.5px] uppercase text-slate-400">{'SMTWTFS'[weekdayOf(range.lo + s.left)]}</span>
                      {s.label}
                    </span>
                  ) : (
                    s.label
                  )}
                </div>
              );
            })}
            <div className="absolute bottom-0 z-10 -translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-600 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-white" style={{left: (today - range.lo) * px + px / 2}}>
              Today
            </div>
          </div>
        </div>

        {/* Left grid rows (in flow, sticky to the left) */}
        <div>
          {rows.map(({task: t, depth, hasChildren, wbs}) => {
            const selected = selectedId === t.id;
            const late = isLate(t, today);
            return (
              <div className="group flex" key={t.id} style={{height: ROW_H}}>
                <div
                  className={`sticky left-0 z-20 flex shrink-0 items-center border-b border-r border-slate-100 pr-2 text-[12.5px] ${selected ? 'bg-indigo-50' : highlight?.has(t.id) ? 'bg-amber-50' : 'bg-white group-hover:bg-slate-50'}`}
                  onClick={() => props.onSelect(t.id)}
                  style={{width: gridW}}>
                  <div className="flex min-w-0 flex-1 items-center gap-1.5" style={{paddingLeft: 8 + depth * 18}}>
                    {hasChildren ? (
                      <button
                        aria-label={t.collapsed ? 'Expand' : 'Collapse'}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                        onClick={e => {
                          e.stopPropagation();
                          props.onToggle(t.id);
                        }}
                        type="button">
                        {t.collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      <span className="w-[18px]" />
                    )}
                    {t.type === 'milestone' && !hasChildren ? (
                      <span className="h-2.5 w-2.5 shrink-0 rotate-45 rounded-[2px]" style={{background: colors[t.category] || '#64748b'}} />
                    ) : (
                      <span className={`shrink-0 rounded-full ${hasChildren ? 'h-2.5 w-2.5' : 'h-2 w-2'}`} style={{background: colors[t.category] || '#64748b'}} />
                    )}
                    <span className="shrink-0 text-[10px] tabular-nums text-slate-300">{wbs}</span>
                    {renaming?.id === t.id ? (
                      <input
                        autoFocus
                        className="min-w-0 flex-1 rounded border border-indigo-300 bg-white px-1.5 py-0.5 text-[12.5px] outline-none"
                        onBlur={() => {
                          if (renaming.value.trim()) props.onRename(t.id, renaming.value.trim());
                          setRenaming(null);
                        }}
                        onChange={e => setRenaming({id: t.id, value: e.target.value})}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        value={renaming.value}
                      />
                    ) : (
                      <span
                        className={`min-w-0 flex-1 truncate ${hasChildren ? 'font-semibold text-slate-800' : 'text-slate-700'} ${t.progress >= 100 && !hasChildren ? 'text-slate-400 line-through decoration-slate-300' : ''}`}
                        onDoubleClick={e => {
                          e.stopPropagation();
                          setRenaming({id: t.id, value: t.name});
                        }}
                        title={`${t.name} (double-click to rename)`}>
                        {t.name}
                      </span>
                    )}
                    {late && !hasChildren && <span className="shrink-0 rounded bg-rose-50 px-1 text-[9px] font-bold uppercase text-rose-600">Late</span>}
                    {t.assignee && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[8.5px] font-bold text-slate-600" title={t.assignee}>
                        {initials(t.assignee)}
                      </span>
                    )}
                    {/* Row tools */}
                    <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                      {[
                        {label: 'Add a task inside', Icon: Plus, fn: props.onAddChild},
                        {label: 'Outdent', Icon: ArrowLeftToLine, fn: props.onOutdent},
                        {label: 'Indent under the row above', Icon: ArrowRightToLine, fn: props.onIndent},
                        {label: 'Delete', Icon: Trash2, fn: props.onDelete},
                      ].map(({label, Icon, fn}) => (
                        <button
                          aria-label={label}
                          className={`rounded p-1 text-slate-400 hover:bg-white ${label === 'Delete' ? 'hover:text-rose-600' : 'hover:text-slate-700'}`}
                          key={label}
                          onClick={e => {
                            e.stopPropagation();
                            fn(t.id);
                          }}
                          title={label}
                          type="button">
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </span>
                  </div>
                  {showDetails && (
                    <>
                      <span className="w-[74px] shrink-0 tabular-nums text-[11.5px] text-slate-500">{fmt(t.start)}</span>
                      <span className="w-[74px] shrink-0 tabular-nums text-[11.5px] text-slate-500">{fmt(t.end)}</span>
                      <span className="w-[44px] shrink-0 text-right tabular-nums text-[11.5px] text-slate-500">{t.type === 'milestone' && !hasChildren ? '◆' : duration(t)}</span>
                      <span className="flex w-[76px] shrink-0 items-center gap-1.5 pl-3">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <span className="block h-full rounded-full" style={{width: `${t.progress}%`, background: t.progress >= 100 ? '#10b981' : colors[t.category] || '#6366f1'}} />
                        </span>
                        <span className="w-7 text-right tabular-nums text-[10.5px] text-slate-500">{t.progress}%</span>
                      </span>
                    </>
                  )}
                </div>
                <div className="shrink-0 border-b border-slate-100" style={{width}} />
              </div>
            );
          })}
        </div>

        {/* Timeline layer */}
        <div className="absolute z-10" onPointerDown={e => e.target === e.currentTarget && props.onSelect(null)} ref={layerRef} style={{left: gridW, top: HEAD_H, width, height: Math.max(bodyH, ROW_H * 2)}}>
          {/* Background: weekends, month lines, day lines, selected row, today */}
          <div
            className="pointer-events-none absolute inset-0"
            style={zoom === 'day' ? {backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.13) 1px, transparent 1px)', backgroundSize: `${px}px 100%`} : undefined}
          />
          {header.weekends.map(i => (
            <div className="pointer-events-none absolute inset-y-0 bg-slate-50" key={`w${i}`} style={{left: i * px, width: px}} />
          ))}
          {header.monthStarts.map(i => (
            <div className="pointer-events-none absolute inset-y-0 w-px bg-slate-200/80" key={`m${i}`} style={{left: i * px}} />
          ))}
          {selectedId && rowIndex.has(selectedId) && <div className="pointer-events-none absolute inset-x-0 bg-indigo-50/70" style={{top: rowIndex.get(selectedId)! * ROW_H, height: ROW_H}} />}
          <div className="pointer-events-none absolute inset-y-0 z-20 w-[2px] bg-indigo-500/70" style={{left: (today - range.lo) * px + px / 2 - 1}} />

          {/* Dependencies */}
          <svg className="pointer-events-none absolute inset-0 z-10 overflow-visible" height={Math.max(bodyH, 1)} width={width}>
            <defs>
              <marker id="g-arrow" markerHeight="7" markerWidth="7" orient="auto-start-reverse" refX="6" refY="3.5">
                <path d="M0,0 L7,3.5 L0,7 z" fill="#94a3b8" />
              </marker>
              <marker id="g-arrow-crit" markerHeight="7" markerWidth="7" orient="auto-start-reverse" refX="6" refY="3.5">
                <path d="M0,0 L7,3.5 L0,7 z" fill="#f43f5e" />
              </marker>
            </defs>
            {depPaths.map(p => (
              <path d={p.d} fill="none" key={p.key} markerEnd={`url(#${p.crit ? 'g-arrow-crit' : 'g-arrow'})`} stroke={p.crit ? '#f43f5e' : '#94a3b8'} strokeLinejoin="round" strokeWidth={p.crit ? 1.8 : 1.3} />
            ))}
            {link && <line stroke="#6366f1" strokeDasharray="4 3" strokeWidth={1.6} x1={link.x1} x2={link.x2} y1={link.y1} y2={link.y2} />}
          </svg>

          {/* Bars */}
          {rows.map(({task: t, hasChildren}, i) => {
            const g = geo(t);
            const color = colors[t.category] || '#6366f1';
            const top = i * ROW_H;
            const selected = selectedId === t.id;
            const crit = showCritical && critical.has(t.id);
            const late = isLate(t, today) && !hasChildren;
            const title = `${t.name}\n${fmt(fromDay(g.s), {month: 'short', day: 'numeric', year: 'numeric'})} → ${fmt(fromDay(g.e), {month: 'short', day: 'numeric', year: 'numeric'})} · ${g.e - g.s + 1} day${g.e === g.s ? '' : 's'} · ${t.progress}%${t.assignee ? `\n${t.assignee}` : ''}`;
            const linkDot = (x: number) => (
              <span
                className="absolute z-30 hidden h-3 w-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white bg-indigo-500 shadow group-hover/bar:block"
                onPointerDown={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const r = layerRef.current!.getBoundingClientRect();
                  setLink({from: t.id, x1: g.x + x, y1: top + ROW_H / 2, x2: e.clientX - r.left, y2: e.clientY - r.top});
                }}
                style={{left: x - 6, top: '50%'}}
                title="Drag onto another bar to make it depend on this one"
              />
            );

            if (t.type === 'milestone' && !hasChildren) {
              const cx = g.x + px / 2;
              return (
                <div className="group/bar absolute" data-bar-id={t.id} key={t.id} style={{left: cx - 12, top, width: 24, height: ROW_H}} title={title}>
                  <div
                    className={`absolute left-1/2 top-1/2 h-[15px] w-[15px] -translate-x-1/2 -translate-y-1/2 rotate-45 cursor-grab rounded-[3px] shadow-sm active:cursor-grabbing ${selected ? 'ring-2 ring-indigo-500 ring-offset-1' : crit ? 'ring-2 ring-rose-500' : ''}`}
                    onPointerDown={e => startDrag(e, t, 'move', false)}
                    style={{background: t.progress >= 100 ? '#10b981' : color}}
                  />
                  {linkDot(12 + 13)}
                  <span className="pointer-events-none absolute left-[26px] top-1/2 -translate-y-1/2 whitespace-nowrap text-[11.5px] font-semibold text-slate-600">{t.name}</span>
                </div>
              );
            }

            if (hasChildren) {
              return (
                <div className="group/bar absolute" data-bar-id={t.id} key={t.id} style={{left: g.x, top, width: g.w, height: ROW_H}} title={title}>
                  <div className={`absolute inset-x-0 top-[15px] h-[10px] cursor-grab rounded-[3px] bg-slate-300 active:cursor-grabbing ${selected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`} onPointerDown={e => startDrag(e, t, 'move', true)}>
                    <div className="h-full rounded-[3px] bg-slate-700" style={{width: `${t.progress}%`}} />
                    <span className="absolute -bottom-[5px] left-0 h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-700" />
                    <span className="absolute -bottom-[5px] right-0 h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-700" />
                  </div>
                  <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap text-[11.5px] font-semibold text-slate-700">
                    {t.name} <span className="font-normal text-slate-400">{t.progress}%</span>
                  </span>
                </div>
              );
            }

            const inside = g.w > t.name.length * 6.6 + 24;
            return (
              <div className="group/bar absolute" data-bar-id={t.id} key={t.id} style={{left: g.x, top, width: g.w, height: ROW_H}} title={title}>
                <div
                  className={`absolute inset-x-0 top-[8px] h-[24px] cursor-grab overflow-hidden rounded-[7px] border shadow-sm transition-shadow active:cursor-grabbing ${selected ? 'ring-2 ring-indigo-500 ring-offset-1' : crit ? 'ring-2 ring-rose-500/80' : late ? 'ring-1 ring-rose-400' : ''}`}
                  onPointerDown={e => startDrag(e, t, 'move', false)}
                  style={{background: `${color}26`, borderColor: `${color}66`}}>
                  <div className="h-full" style={{width: `${t.progress}%`, background: `${color}cc`}} />
                  {inside && <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center whitespace-nowrap text-[11.5px] font-medium text-slate-800">{t.name}</span>}
                  <span className="absolute inset-y-0 left-0 w-[7px] cursor-ew-resize" onPointerDown={e => startDrag(e, t, 'start', false)} />
                  <span className="absolute inset-y-0 right-0 w-[7px] cursor-ew-resize" onPointerDown={e => startDrag(e, t, 'end', false)} />
                </div>
                {linkDot(g.w + 8)}
                {!inside && (
                  <span className="pointer-events-none absolute left-full top-1/2 ml-5 -translate-y-1/2 whitespace-nowrap text-[11.5px] text-slate-600">
                    {t.name}
                    {t.assignee && <span className="ml-1.5 text-slate-400">· {t.assignee}</span>}
                  </span>
                )}
              </div>
            );
          })}
          {drag && drag.moved && (drag.dS || drag.dE) ? (
            <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-3 py-1.5 text-[12px] font-medium text-white shadow-lg">
              {drag.mode === 'move' ? `${drag.dS > 0 ? '+' : ''}${drag.dS} day${Math.abs(drag.dS) === 1 ? '' : 's'}` : `${drag.mode === 'start' ? 'Start' : 'Finish'} ${(drag.mode === 'start' ? drag.dS : drag.dE) > 0 ? '+' : ''}${drag.mode === 'start' ? drag.dS : drag.dE} days`}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
