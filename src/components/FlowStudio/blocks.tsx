/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

// Flow Studio blocks: timelines, Gantt charts, tables, charts, ready-made diagrams and checklists.
// Each block is one item on the board that draws itself from a list of entries (d.items or d.cells).
import {Node, NodeProps, NodeResizeControl, ResizeControlVariant} from '@xyflow/react';
import {ArrowDown, ArrowDownUp, ArrowUp, Check, ClipboardPaste, Plus, Trash2} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';

import {BlockItem, FD, inkOn, isHex, mix, uid} from './model';
import {boxStyle, EditableText, Extras, Handles, Resizer, typeStyle, useStudio} from './nodes';

// ── Dates ──────────────────────────────────────────────────────────────────
const DAY = 86_400_000;
export const toDate = (s?: string) => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromToday = (n: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return isoDay(new Date(d.getTime() + n * DAY));
};
const fmtDay = (s?: string, year = false) => toDate(s)?.toLocaleDateString(undefined, year ? {month: 'short', day: 'numeric', year: 'numeric'} : {month: 'short', day: 'numeric'}) || '';
const fmtRange = (a?: string, b?: string) => {
  const x = fmtDay(a);
  const y = fmtDay(b);
  return x && y && a !== b ? `${x} – ${y}` : x || y;
};
const todayNoon = () => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
};

// ── Colours ────────────────────────────────────────────────────────────────
export const BLOCK_SCHEMES: Record<string, {name: string; colors: string[]}> = {
  vivid: {name: 'Vivid', colors: ['#7b68ee', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899']},
  ocean: {name: 'Ocean', colors: ['#1e3a8a', '#1d4ed8', '#2563eb', '#0284c7', '#0891b2', '#0d9488']},
  sunset: {name: 'Sunset', colors: ['#be123c', '#db2777', '#ea580c', '#f59e0b', '#c026d3', '#f97316']},
  forest: {name: 'Forest', colors: ['#14532d', '#15803d', '#16a34a', '#65a30d', '#0d9488', '#4d7c0f']},
  grape: {name: 'Grape', colors: ['#4c1d95', '#6d28d9', '#7c3aed', '#a855f7', '#c026d3', '#db2777']},
  pastel: {name: 'Pastel', colors: ['#a5b4fc', '#93c5fd', '#7dd3c0', '#a7e3a1', '#fcd581', '#fca5a5', '#f0abfc']},
  mono: {name: 'Mono', colors: ['#111827', '#374151', '#4b5563', '#6b7280', '#9ca3af']},
  opg: {name: 'OPG', colors: ['#0C2721', '#3F8F1E', '#66CC00', '#8CC63F', '#1f4d3f']},
};
export const SCHEME_KEYS = Object.keys(BLOCK_SCHEMES);
const schemeOf = (d: FD) => (BLOCK_SCHEMES[d.scheme || 'vivid'] || BLOCK_SCHEMES.vivid).colors;
export const itemColor = (d: FD, i: number) => {
  const c = d.items?.[i]?.color;
  if (isHex(c)) return c;
  const s = schemeOf(d);
  return s[i % s.length];
};
const cvar = (c: string) => ({['--c' as string]: c, ['--c-soft' as string]: mix(c, '#ffffff', 0.86), ['--c-ink' as string]: inkOn(c), ['--c-deep' as string]: mix(c, '#000000', 0.28)}) as React.CSSProperties;

// ── Catalogue ──────────────────────────────────────────────────────────────
export type BlockType = 'timeline' | 'gantt' | 'table' | 'chart' | 'diagram' | 'checklist';
export const BLOCK_TYPES = new Set<string>(['timeline', 'gantt', 'table', 'chart', 'diagram', 'checklist']);
/** Blocks whose height follows their content (only the width is dragged). */
export const AUTO_HEIGHT = new Set<string>(['gantt', 'table', 'checklist']);
export const BLOCK_NAMES: Record<BlockType, string> = {timeline: 'Timeline', gantt: 'Gantt chart', table: 'Table', chart: 'Chart', diagram: 'Diagram', checklist: 'Checklist'};

export const VARIANTS: Record<BlockType, {key: string; name: string}[]> = {
  timeline: [
    {key: 'line', name: 'Line'},
    {key: 'cards', name: 'Cards'},
    {key: 'vertical', name: 'Vertical'},
    {key: 'phases', name: 'Phases'},
  ],
  gantt: [{key: 'bars', name: 'Bars'}],
  table: [
    {key: 'striped', name: 'Striped'},
    {key: 'grid', name: 'Grid'},
    {key: 'clean', name: 'Clean'},
  ],
  chart: [
    {key: 'bar', name: 'Bars'},
    {key: 'column', name: 'Columns'},
    {key: 'line', name: 'Line'},
    {key: 'donut', name: 'Donut'},
    {key: 'rings', name: 'Rings'},
  ],
  diagram: [
    {key: 'process', name: 'Steps'},
    {key: 'cycle', name: 'Cycle'},
    {key: 'hub', name: 'Hub'},
    {key: 'funnel', name: 'Funnel'},
    {key: 'pyramid', name: 'Pyramid'},
    {key: 'stairs', name: 'Stairs'},
    {key: 'venn', name: 'Venn'},
    {key: 'matrix', name: '2 × 2'},
  ],
  checklist: [
    {key: 'list', name: 'List'},
    {key: 'cards', name: 'Cards'},
  ],
};

const item = (label: string, extra: Partial<BlockItem> = {}): BlockItem => ({id: uid('b'), label, ...extra});

export interface BlockSpec {
  key: string;
  type: BlockType;
  name: string;
  group: 'Timelines' | 'Data' | 'Diagrams';
  w: number;
  h?: number;
  data: () => Partial<FD>;
}

export const BLOCKS: BlockSpec[] = [
  {
    key: 'timeline-line',
    type: 'timeline',
    name: 'Timeline',
    group: 'Timelines',
    w: 860,
    h: 280,
    data: () => ({
      variant: 'line',
      spacing: 'date',
      today: true,
      label: 'Project timeline',
      items: [
        item('Kickoff', {date: fromToday(-21), note: 'Team and goals agreed'}),
        item('Research done', {date: fromToday(2), note: 'Interviews wrapped up'}),
        item('Design sign-off', {date: fromToday(24)}),
        item('Build complete', {date: fromToday(58), note: 'Feature freeze'}),
        item('Launch', {date: fromToday(80), note: 'Go live'}),
      ],
    }),
  },
  {
    key: 'timeline-cards',
    type: 'timeline',
    name: 'Milestone cards',
    group: 'Timelines',
    w: 920,
    h: 250,
    data: () => ({
      variant: 'cards',
      label: '',
      items: [
        item('Discovery', {date: fromToday(-14), note: 'Understand the problem and who has it'}),
        item('Alpha', {date: fromToday(20), note: 'First working version for the team'}),
        item('Beta', {date: fromToday(50), note: 'Trial with a few real users'}),
        item('Launch', {date: fromToday(84), note: 'Available to everyone'}),
      ],
    }),
  },
  {
    key: 'timeline-vertical',
    type: 'timeline',
    name: 'Vertical timeline',
    group: 'Timelines',
    w: 600,
    h: 560,
    data: () => ({
      variant: 'vertical',
      label: 'How we got here',
      items: [
        item('The idea', {date: fromToday(-700), note: 'A sketch on a whiteboard'}),
        item('First customer', {date: fromToday(-420), note: 'Signed after a three-week pilot'}),
        item('Team of ten', {date: fromToday(-200)}),
        item('New office', {date: fromToday(-60), note: 'Moved downtown'}),
        item('Next chapter', {date: fromToday(120), note: 'Expanding to two new regions'}),
      ],
    }),
  },
  {
    key: 'timeline-phases',
    type: 'timeline',
    name: 'Phases',
    group: 'Timelines',
    w: 940,
    h: 190,
    data: () => ({
      variant: 'phases',
      today: true,
      label: '',
      items: [
        item('Discover', {date: fromToday(-30), end: fromToday(-8), note: 'Research and interviews'}),
        item('Plan', {date: fromToday(-7), end: fromToday(14), note: 'Scope, budget, owners'}),
        item('Build', {date: fromToday(15), end: fromToday(60), note: 'Weekly demos'}),
        item('Launch', {date: fromToday(61), end: fromToday(75), note: 'Go-live checklist'}),
        item('Improve', {date: fromToday(76), end: fromToday(120), note: 'Feedback and fixes'}),
      ],
    }),
  },
  {
    key: 'gantt',
    type: 'gantt',
    name: 'Gantt chart',
    group: 'Timelines',
    w: 900,
    data: () => ({
      variant: 'bars',
      today: true,
      label: 'Delivery plan',
      items: [
        item('Requirements', {date: fromToday(-14), end: fromToday(-3), value: 100}),
        item('Design', {date: fromToday(-6), end: fromToday(12), value: 60}),
        item('Build', {date: fromToday(8), end: fromToday(46), value: 15}),
        item('Testing', {date: fromToday(38), end: fromToday(58)}),
        item('Training', {date: fromToday(50), end: fromToday(60)}),
        item('Go live', {date: fromToday(62), milestone: true}),
        item('Support', {date: fromToday(62), end: fromToday(80)}),
      ],
    }),
  },
  {
    key: 'table',
    type: 'table',
    name: 'Table',
    group: 'Data',
    w: 600,
    data: () => ({
      variant: 'striped',
      header: true,
      cells: [
        ['Item', 'Owner', 'Due', 'Status'],
        ['Draft the proposal', 'Alex', fmtDay(fromToday(5)), 'In progress'],
        ['Review the budget', 'Sam', fmtDay(fromToday(12)), 'To do'],
        ['Sign the contract', 'Priya', fmtDay(fromToday(21)), 'To do'],
      ],
    }),
  },
  {
    key: 'checklist',
    type: 'checklist',
    name: 'Checklist',
    group: 'Data',
    w: 320,
    data: () => ({
      variant: 'list',
      label: 'Launch checklist',
      items: [item('Final review', {done: true}), item('Tell the team', {done: true}), item('Update the docs'), item('Switch it on')],
    }),
  },
  {
    key: 'chart-bar',
    type: 'chart',
    name: 'Bar chart',
    group: 'Data',
    w: 440,
    h: 280,
    data: () => ({variant: 'bar', label: 'Tickets by team', items: [item('Support', {value: 42}), item('Finance', {value: 28}), item('IT', {value: 35}), item('HR', {value: 14}), item('Legal', {value: 9})]}),
  },
  {
    key: 'chart-column',
    type: 'chart',
    name: 'Column chart',
    group: 'Data',
    w: 480,
    h: 320,
    data: () => ({variant: 'column', label: 'Spend by quarter', unit: 'k', items: [item('Q1', {value: 120}), item('Q2', {value: 180}), item('Q3', {value: 150}), item('Q4', {value: 210})]}),
  },
  {
    key: 'chart-line',
    type: 'chart',
    name: 'Line chart',
    group: 'Data',
    w: 520,
    h: 300,
    data: () => ({variant: 'line', label: 'Requests per month', items: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => item(m, {value: [32, 41, 38, 55, 61, 74][i]}))}),
  },
  {
    key: 'chart-donut',
    type: 'chart',
    name: 'Donut',
    group: 'Data',
    w: 440,
    h: 270,
    data: () => ({variant: 'donut', label: 'Budget split', unit: '%', items: [item('People', {value: 48}), item('Software', {value: 22}), item('Vendors', {value: 18}), item('Other', {value: 12})]}),
  },
  {
    key: 'chart-rings',
    type: 'chart',
    name: 'Progress rings',
    group: 'Data',
    w: 560,
    h: 220,
    data: () => ({variant: 'rings', label: 'Workstreams', unit: '%', items: [item('Design', {value: 80}), item('Build', {value: 45}), item('Testing', {value: 20}), item('Training', {value: 60})]}),
  },
  {
    key: 'diagram-process',
    type: 'diagram',
    name: 'Numbered steps',
    group: 'Diagrams',
    w: 880,
    h: 230,
    data: () => ({variant: 'process', label: '', items: [item('Request', {note: 'Someone asks for it'}), item('Review', {note: 'Check it is complete'}), item('Approve', {note: 'Manager signs off'}), item('Deliver', {note: 'Do the work and close it'})]}),
  },
  {
    key: 'diagram-cycle',
    type: 'diagram',
    name: 'Cycle',
    group: 'Diagrams',
    w: 480,
    h: 480,
    data: () => ({variant: 'cycle', label: 'Improve', items: [item('Plan'), item('Do'), item('Check'), item('Act')]}),
  },
  {
    key: 'diagram-hub',
    type: 'diagram',
    name: 'Hub and spokes',
    group: 'Diagrams',
    w: 540,
    h: 480,
    data: () => ({variant: 'hub', label: 'Customer', items: [item('Sales'), item('Support'), item('Product'), item('Marketing'), item('Finance')]}),
  },
  {
    key: 'diagram-funnel',
    type: 'diagram',
    name: 'Funnel',
    group: 'Diagrams',
    w: 500,
    h: 340,
    data: () => ({variant: 'funnel', label: '', items: [item('Leads', {note: '1,200'}), item('Qualified', {note: '640'}), item('Proposals', {note: '210'}), item('Won', {note: '74'})]}),
  },
  {
    key: 'diagram-pyramid',
    type: 'diagram',
    name: 'Pyramid',
    group: 'Diagrams',
    w: 540,
    h: 360,
    data: () => ({variant: 'pyramid', label: '', items: [item('Vision'), item('Strategy'), item('Objectives'), item('Daily work')]}),
  },
  {
    key: 'diagram-stairs',
    type: 'diagram',
    name: 'Staircase',
    group: 'Diagrams',
    w: 700,
    h: 330,
    data: () => ({variant: 'stairs', label: 'Maturity', items: [item('Crawl', {note: 'Manual, ad hoc'}), item('Walk', {note: 'Repeatable'}), item('Run', {note: 'Measured'}), item('Fly', {note: 'Automated'})]}),
  },
  {
    key: 'diagram-venn',
    type: 'diagram',
    name: 'Venn',
    group: 'Diagrams',
    w: 500,
    h: 400,
    data: () => ({variant: 'venn', label: 'Change', items: [item('People'), item('Process'), item('Technology')]}),
  },
  {
    key: 'diagram-matrix',
    type: 'diagram',
    name: '2 × 2 matrix',
    group: 'Diagrams',
    w: 580,
    h: 500,
    data: () => ({
      variant: 'matrix',
      label: 'Priorities',
      cells: [['More urgent →', 'More important →']],
      items: [item('Schedule', {note: 'Important, not urgent'}), item('Do first', {note: 'Important and urgent'}), item('Drop', {note: 'Neither'}), item('Delegate', {note: 'Urgent, less important'})],
    }),
  },
];
export const BLOCK_BY_KEY = Object.fromEntries(BLOCKS.map(b => [b.key, b]));

/** A new block, centred on a point. */
export function blockNode(key: string, x: number, y: number, extra: Partial<FD> = {}): Node {
  const spec = BLOCK_BY_KEY[key] || BLOCKS[0];
  const h = spec.h ?? 200;
  return {
    id: uid('k'),
    type: spec.type,
    position: {x: Math.round(x - spec.w / 2), y: Math.round(y - h / 2)},
    width: spec.w,
    ...(spec.h ? {height: spec.h} : {}),
    data: {...spec.data(), ...extra},
  };
}

/** A fresh entry for a block, with sensible defaults for its kind. */
export function newItem(type: string, d: FD): BlockItem {
  const items = d.items || [];
  const last = items[items.length - 1];
  const n = items.length + 1;
  if (type === 'timeline') {
    const base = toDate(last?.end || last?.date);
    const date = base ? isoDay(new Date(base.getTime() + 14 * DAY)) : fromToday(0);
    return item(d.variant === 'phases' ? `Phase ${n}` : `Milestone ${n}`, {date, ...(d.variant === 'phases' ? {end: isoDay(new Date((toDate(date) as Date).getTime() + 14 * DAY))} : {})});
  }
  if (type === 'gantt') {
    const base = toDate(last?.end || last?.date) || todayNoon();
    return item(`Task ${n}`, {date: isoDay(base), end: isoDay(new Date(base.getTime() + 10 * DAY))});
  }
  if (type === 'chart') return item(`Item ${n}`, {value: last?.value ?? 10});
  if (type === 'checklist') return item('');
  return item(`Part ${n}`);
}

// ── Shared pieces ──────────────────────────────────────────────────────────
function WidthResizer({id, d, selected, minW}: {id: string; d: FD; selected: boolean; minW: number}) {
  const {snapshot, touch, readOnly, fitHeight} = useStudio();
  if (!selected || d.locked || readOnly) return null;
  return (
    <>
      {(['left', 'right'] as const).map(p => (
        <NodeResizeControl
          className="fs-resize-line fs-wresize"
          key={p}
          minWidth={minW}
          onResizeEnd={() => {
            fitHeight(id);
            touch();
          }}
          onResizeStart={snapshot}
          position={p}
          variant={ResizeControlVariant.Line}
        />
      ))}
    </>
  );
}

function Shell({id, d, selected, type, minW = 200, minH = 120, children}: {id: string; d: FD; selected: boolean; type: BlockType; minW?: number; minH?: number; children: React.ReactNode}) {
  const {dark} = useStudio();
  const auto = AUTO_HEIGHT.has(type);
  return (
    <div
      className={`fs-node fs-block fs-block-${type} fs-v-${d.variant || ''} ${auto ? 'is-auto' : ''} ${d.bare ? 'is-bare' : ''} ${d.bare && dark ? 'on-dark' : ''} ${selected ? 'is-selected' : ''} ${d.shadow ? 'has-shadow' : ''}`}
      style={{...boxStyle(d), ...typeStyle(d)}}>
      {auto ? <WidthResizer d={d} id={id} minW={minW} selected={selected} /> : <Resizer d={d} minH={minH} minW={minW} selected={selected} />}
      {children}
      <Handles />
      <Extras d={d} />
    </div>
  );
}

/** The block's title; shown when it has one (double-click the block to add or change it). */
function Title({id, d, className = ''}: {id: string; d: FD; className?: string}) {
  const {editingId} = useStudio();
  if (!d.label && editingId !== id) return null;
  return <EditableText className={`fs-block-title ${className}`} id={id} placeholder="Title" singleLine value={d.label || ''} />;
}

function Empty({text}: {text: string}) {
  return <div className="fs-block-empty">{text}</div>;
}

// ── Timeline ───────────────────────────────────────────────────────────────
/** Where each entry sits along the line (0-1), month or week ticks, and today, when spaced by date. */
function placeAlong(items: BlockItem[], byDate: boolean) {
  const n = items.length;
  const even = items.map((_, i) => (n === 1 ? 0.5 : 0.07 + (0.86 * i) / (n - 1)));
  const times = items.map(it => toDate(it.date)?.getTime() ?? null);
  const known = times.filter((t): t is number => t !== null);
  if (!byDate || known.length < 2) return {x: even, ticks: [] as {x: number; label: string}[], today: null as number | null};
  const lo = Math.min(...known);
  const hi = Math.max(...known);
  if (hi === lo) return {x: even, ticks: [], today: null};
  const at = (t: number) => 0.07 + (0.86 * (t - lo)) / (hi - lo);
  const x = times.map((t, i) => (t === null ? even[i] : at(t)));
  const span = (hi - lo) / DAY;
  const ticks: {x: number; label: string}[] = [];
  const c = new Date(lo);
  if (span <= 70) {
    // Weekly ticks, on Mondays
    c.setDate(c.getDate() + ((8 - c.getDay()) % 7));
    for (; c.getTime() <= hi; c.setDate(c.getDate() + 7)) ticks.push({x: at(c.getTime()), label: c.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})});
  } else {
    const step = span > 900 ? 12 : span > 420 ? 3 : 1;
    c.setDate(1);
    c.setMonth(c.getMonth() + 1);
    if (step > 1) while (c.getMonth() % step) c.setMonth(c.getMonth() + 1);
    for (; c.getTime() <= hi; c.setMonth(c.getMonth() + step))
      ticks.push({x: at(c.getTime()), label: step === 12 ? String(c.getFullYear()) : c.toLocaleDateString(undefined, step === 1 && span < 365 ? {month: 'short'} : {month: 'short', year: '2-digit'})});
  }
  const now = Date.now();
  return {x, ticks: ticks.slice(0, 40), today: now >= lo && now <= hi ? at(now) : null};
}

export function TimelineNode({id, data, selected}: NodeProps) {
  const d = data as FD;
  const items = d.items || [];
  const v = d.variant || 'line';
  const n = items.length;
  let body: React.ReactNode;
  if (!n) body = <Empty text="Add events in the side panel" />;
  else if (v === 'cards') {
    body = (
      <div className="fs-tl-cards">
        <div className="fs-tl-cardrow">
          {items.map((it, i) => (
            <div className="fs-tl-card" key={it.id} style={cvar(itemColor(d, i))}>
              {it.date && <span className="fs-tl-chip">{fmtDay(it.date, true)}</span>}
              <b>{it.label}</b>
              {it.note && <p>{it.note}</p>}
            </div>
          ))}
        </div>
        <div className="fs-tl-rail">
          {items.map((it, i) => (
            <span key={it.id} style={cvar(itemColor(d, i))}>
              <i />
            </span>
          ))}
        </div>
      </div>
    );
  } else if (v === 'vertical') {
    body = (
      <div className="fs-tl-vert">
        {items.map((it, i) => (
          <div className={`fs-tl-vrow ${i % 2 ? 'is-right' : 'is-left'}`} key={it.id} style={cvar(itemColor(d, i))}>
            <div className="fs-tl-vcard">
              <b>{it.label}</b>
              {it.note && <p>{it.note}</p>}
            </div>
            <span className="fs-tl-vdot" />
            <div className="fs-tl-vdate">{fmtDay(it.date, true)}</div>
          </div>
        ))}
      </div>
    );
  } else if (v === 'phases') {
    const now = Date.now();
    body = (
      <div className="fs-tl-phases">
        <div className="fs-tl-chevs">
          {items.map((it, i) => {
            const a = toDate(it.date)?.getTime();
            const b = toDate(it.end || it.date)?.getTime();
            const live = d.today && a !== undefined && b !== undefined && now >= a && now <= b + DAY;
            return (
              <div className={`fs-tl-chev ${i === 0 ? 'is-first' : ''} ${live ? 'is-now' : ''}`} key={it.id} style={cvar(itemColor(d, i))}>
                <span>{it.label}</span>
                {live && <em>Now</em>}
              </div>
            );
          })}
        </div>
        <div className="fs-tl-under">
          {items.map((it, i) => (
            <div key={it.id} style={cvar(itemColor(d, i))}>
              <small>{fmtRange(it.date, it.end)}</small>
              {it.note && <p>{it.note}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    const {x, ticks, today} = placeAlong(items, d.spacing === 'date');
    const w = Math.min(30, 175 / n);
    body = (
      <div className="fs-tl-line">
        <div className="fs-tl-axis" />
        {ticks.map(t => (
          <span className="fs-tl-tick" key={`${t.x}-${t.label}`} style={{left: `${t.x * 100}%`}}>
            {t.label}
          </span>
        ))}
        {d.today && today !== null && (
          <span className="fs-tl-today" style={{left: `${today * 100}%`}}>
            <b>Today</b>
          </span>
        )}
        {items.map((it, i) => (
          <div className={`fs-tl-ev ${i % 2 ? 'is-down' : 'is-up'}`} key={it.id} style={{left: `${x[i] * 100}%`, width: `${w}%`, ...cvar(itemColor(d, i))}}>
            <span className="fs-tl-dot" />
            <span className="fs-tl-stem" />
            <div className="fs-tl-body">
              {it.date && <small>{fmtDay(it.date, true)}</small>}
              <b>{it.label}</b>
              {it.note && <p>{it.note}</p>}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <Shell d={d} id={id} minH={140} minW={260} selected={!!selected} type="timeline">
      <Title d={d} id={id} />
      {body}
    </Shell>
  );
}

// ── Gantt ──────────────────────────────────────────────────────────────────
function ganttScale(items: BlockItem[]) {
  const starts = items.map(it => toDate(it.date)?.getTime()).filter((t): t is number => t !== undefined);
  const ends = items.map(it => toDate(it.end || it.date)?.getTime()).filter((t): t is number => t !== undefined);
  let lo = starts.length ? Math.min(...starts) : todayNoon().getTime();
  let hi = ends.length ? Math.max(...ends) + DAY : lo + 30 * DAY;
  const span = (hi - lo) / DAY;
  const unit = span <= 20 ? 'day' : span <= 110 ? 'week' : span <= 600 ? 'month' : 'quarter';
  const a = new Date(lo);
  a.setHours(0, 0, 0, 0);
  if (unit === 'week') a.setDate(a.getDate() - ((a.getDay() + 6) % 7));
  if (unit === 'month' || unit === 'quarter') a.setDate(1);
  if (unit === 'quarter') a.setMonth(a.getMonth() - (a.getMonth() % 3));
  lo = a.getTime();
  const ticks: {t: number; label: string}[] = [];
  const c = new Date(lo);
  const next = () => {
    if (unit === 'day') c.setDate(c.getDate() + 1);
    else if (unit === 'week') c.setDate(c.getDate() + 7);
    else c.setMonth(c.getMonth() + (unit === 'quarter' ? 3 : 1));
  };
  for (let guard = 0; guard < 80; guard++) {
    ticks.push({
      t: c.getTime(),
      label:
        unit === 'day'
          ? c.toLocaleDateString(undefined, {weekday: 'narrow', day: 'numeric'})
          : unit === 'week'
          ? c.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})
          : unit === 'month'
          ? c.toLocaleDateString(undefined, {month: 'short', ...(c.getMonth() === 0 || guard === 0 ? {year: '2-digit'} : {})})
          : `Q${Math.floor(c.getMonth() / 3) + 1} ’${String(c.getFullYear()).slice(2)}`,
    });
    next();
    if (c.getTime() >= hi) break;
  }
  hi = c.getTime();
  const pct = (t: number) => ((t - lo) / (hi - lo)) * 100;
  return {ticks, pct, lo, hi};
}

export function GanttNode({id, data, selected}: NodeProps) {
  const d = data as FD;
  const items = d.items || [];
  const {ticks, pct, lo, hi} = ganttScale(items);
  const now = Date.now();
  return (
    <Shell d={d} id={id} minW={420} selected={!!selected} type="gantt">
      <Title d={d} id={id} />
      {!items.length ? (
        <Empty text="Add tasks in the side panel" />
      ) : (
        <div className="fs-gantt">
          <div className="fs-gantt-head">
            <div className="fs-gantt-corner">Task</div>
            <div className="fs-gantt-scale">
              {ticks.map(t => (
                <span key={t.t} style={{left: `${pct(t.t)}%`}}>
                  {t.label}
                </span>
              ))}
            </div>
          </div>
          <div className="fs-gantt-body">
            <div className="fs-gantt-lines">
              {ticks.map(t => (
                <i key={t.t} style={{left: `${pct(t.t)}%`}} />
              ))}
              {d.today && now >= lo && now <= hi && (
                <b className="fs-gantt-today" style={{left: `${pct(now)}%`}}>
                  <span>Today</span>
                </b>
              )}
            </div>
            {items.map((it, i) => {
              const a = toDate(it.date)?.getTime();
              const b = (toDate(it.end || it.date)?.getTime() ?? a ?? 0) + DAY;
              const c = itemColor(d, i);
              const late = !it.milestone && a !== undefined && b < now && (it.value ?? 0) < 100;
              return (
                <div className="fs-gantt-row" key={it.id} style={cvar(c)}>
                  <div className="fs-gantt-name" title={it.label}>
                    <i />
                    <span>{it.label}</span>
                  </div>
                  <div className="fs-gantt-track">
                    {a === undefined ? null : it.milestone ? (
                      <span className="fs-gantt-ms" style={{left: `${pct(a + DAY / 2)}%`}} title={`${it.label} · ${fmtDay(it.date, true)}`}>
                        <i />
                        <em>{fmtDay(it.date)}</em>
                      </span>
                    ) : (
                      <span className={`fs-gantt-bar ${late ? 'is-late' : ''}`} style={{left: `${pct(a)}%`, width: `${Math.max(pct(b) - pct(a), 0.8)}%`}} title={`${it.label} · ${fmtRange(it.date, it.end)}${it.value ? ` · ${it.value}% done` : ''}`}>
                        {!!it.value && <span className="fs-gantt-prog" style={{width: `${Math.min(100, it.value)}%`}} />}
                        {!!it.value && <em>{Math.round(it.value)}%</em>}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Shell>
  );
}

// ── Table ──────────────────────────────────────────────────────────────────
export function TableNode({id, data, selected}: NodeProps) {
  const d = data as FD;
  const {patchData, readOnly} = useStudio();
  const cells = d.cells?.length ? d.cells : [['']];
  const cols = Math.max(...cells.map(r => r.length), 1);
  const editable = !!selected && !readOnly;
  const wrap = useRef<HTMLDivElement>(null);
  const tint = itemColor(d, 0);
  const setCell = (r: number, c: number, value: string) => {
    if ((cells[r]?.[c] ?? '') === value) return;
    patchData(id, {cells: cells.map((row, ri) => (ri === r ? Array.from({length: cols}, (_, ci) => (ci === c ? value : row[ci] ?? '')) : row))});
  };
  const focusCell = (r: number, c: number) => setTimeout(() => (wrap.current?.querySelector(`[data-cell="${r}-${c}"]`) as HTMLElement | null)?.focus(), 0);
  return (
    <Shell d={d} id={id} minW={200} selected={!!selected} type="table">
      <div className="fs-table" ref={wrap} style={{gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, ...cvar(tint)}}>
        {cells.map((row, r) =>
          Array.from({length: cols}, (_, c) => {
            const value = row[c] ?? '';
            const head = d.header !== false && r === 0;
            return (
              <div className={`fs-td ${head ? 'is-head' : ''} ${r % 2 === 0 && !head ? 'is-even' : ''}`} key={`${r}-${c}`}>
                {editable ? (
                  <textarea
                    className="nodrag nopan nowheel"
                    data-cell={`${r}-${c}`}
                    defaultValue={value}
                    key={value}
                    onBlur={e => setCell(r, c, e.target.value)}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        (e.target as HTMLTextAreaElement).blur();
                        if (r + 1 < cells.length) focusCell(r + 1, c);
                      } else if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur();
                    }}
                    rows={1}
                  />
                ) : (
                  <span>{value}</span>
                )}
              </div>
            );
          }),
        )}
      </div>
      {editable && (
        <>
          <button className="fs-table-add is-row nodrag" onClick={() => patchData(id, {cells: [...cells, Array(cols).fill('')]})} title="Add a row" type="button">
            <Plus />
          </button>
          <button className="fs-table-add is-col nodrag" onClick={() => patchData(id, {cells: cells.map(r => [...r, ...Array(Math.max(0, cols - r.length)).fill(''), ''])})} title="Add a column" type="button">
            <Plus />
          </button>
        </>
      )}
    </Shell>
  );
}

// ── Checklist ──────────────────────────────────────────────────────────────
export function ChecklistNode({id, data, selected}: NodeProps) {
  const d = data as FD;
  const {patchData, readOnly} = useStudio();
  const items = d.items || [];
  const done = items.filter(i => i.done).length;
  const editable = !!selected && !readOnly;
  const wrap = useRef<HTMLDivElement>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => {
    if (!focusId) return;
    (wrap.current?.querySelector(`[data-item="${focusId}"]`) as HTMLElement | null)?.focus();
    setFocusId(null);
  }, [focusId, items.length]);
  const set = (next: BlockItem[]) => patchData(id, {items: next});
  const c = itemColor(d, 0);
  return (
    <Shell d={d} id={id} minW={180} selected={!!selected} type="checklist">
      <div className="fs-check-head" style={cvar(c)}>
        <EditableText className="fs-block-title" id={id} placeholder="Checklist" singleLine value={d.label || ''} />
        <span className="fs-check-count">
          {done}/{items.length}
        </span>
      </div>
      <div className="fs-check-bar" style={cvar(c)}>
        <i style={{width: `${items.length ? (done / items.length) * 100 : 0}%`}} />
      </div>
      <div className="fs-check-list" ref={wrap}>
        {items.map((it, i) => (
          <div className={`fs-check-item ${it.done ? 'is-done' : ''}`} key={it.id} style={cvar(d.variant === 'cards' ? itemColor(d, i) : c)}>
            <button
              aria-label={it.done ? 'Mark as not done' : 'Mark as done'}
              aria-pressed={!!it.done}
              className="fs-check-box nodrag"
              disabled={readOnly}
              onClick={e => {
                e.stopPropagation();
                set(items.map(x => (x.id === it.id ? {...x, done: !x.done} : x)));
              }}
              type="button">
              <Check />
            </button>
            {editable ? (
              <input
                className="nodrag nopan"
                data-item={it.id}
                defaultValue={it.label}
                key={it.label}
                onBlur={e => e.target.value !== it.label && set(items.map(x => (x.id === it.id ? {...x, label: e.target.value} : x)))}
                onKeyDown={e => {
                  e.stopPropagation();
                  const el = e.target as HTMLInputElement;
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const fresh = newItem('checklist', d);
                    const next = items.map(x => (x.id === it.id ? {...x, label: el.value} : x));
                    next.splice(i + 1, 0, fresh);
                    set(next);
                    setFocusId(fresh.id);
                  } else if (e.key === 'Backspace' && !el.value && items.length > 1) {
                    e.preventDefault();
                    set(items.filter(x => x.id !== it.id));
                    setFocusId(items[Math.max(0, i - 1)].id);
                  } else if (e.key === 'Escape') el.blur();
                }}
                placeholder="Something to do"
              />
            ) : (
              <span>{it.label || <em className="fs-placeholder">Something to do</em>}</span>
            )}
          </div>
        ))}
        {editable && (
          <button
            className="fs-check-new nodrag"
            onClick={() => {
              const fresh = newItem('checklist', d);
              set([...items, fresh]);
              setFocusId(fresh.id);
            }}
            type="button">
            <Plus /> Add an item
          </button>
        )}
      </div>
    </Shell>
  );
}

// ── Charts ─────────────────────────────────────────────────────────────────
const num = (v: number) => (Math.abs(v) >= 1000 ? v.toLocaleString(undefined, {maximumFractionDigits: 1}) : String(Math.round(v * 10) / 10));

export function ChartNode({id, data, selected}: NodeProps) {
  const d = data as FD;
  const items = d.items || [];
  const v = d.variant || 'bar';
  const unit = d.unit || '';
  const vals = items.map(i => Number(i.value) || 0);
  const max = Math.max(...vals, 0) || 1;
  const total = vals.reduce((a, b) => a + Math.max(b, 0), 0) || 1;
  const show = (x: number) => (unit === '$' ? `$${num(x)}` : `${num(x)}${unit}`);
  let body: React.ReactNode;
  if (!items.length) body = <Empty text="Add values in the side panel" />;
  else if (v === 'column') {
    body = (
      <div className="fs-ch-cols">
        <div className="fs-ch-grid">
          {[0, 1, 2, 3].map(i => (
            <i key={i} />
          ))}
        </div>
        {items.map((it, i) => (
          <div className="fs-ch-col" key={it.id} style={cvar(itemColor(d, i))}>
            <div className="fs-ch-colplot">
              <span className="fs-ch-colbar" style={{height: `${(Math.max(vals[i], 0) / max) * 100}%`}}>
                <em>{show(vals[i])}</em>
              </span>
            </div>
            <small>{it.label}</small>
          </div>
        ))}
      </div>
    );
  } else if (v === 'line') {
    const pts = vals.map((val, i) => [items.length === 1 ? 50 : 4 + (92 * i) / (items.length - 1), 92 - (Math.max(val, 0) / max) * 80] as const);
    const c = itemColor({...d, items: []}, 0);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
    const gid = `fs-chg-${id}`;
    body = (
      <div className="fs-ch-line" style={cvar(c)}>
        <div className="fs-ch-lineplot">
          <svg preserveAspectRatio="none" viewBox="0 0 100 100">
            <defs>
              <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={c} stopOpacity="0.28" />
                <stop offset="1" stopColor={c} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[20, 46, 72].map(y => (
              <line key={y} stroke="#e8ebf0" strokeWidth="1" vectorEffect="non-scaling-stroke" x1="0" x2="100" y1={y} y2={y} />
            ))}
            <path d={`${line} L${pts[pts.length - 1][0]} 100 L${pts[0][0]} 100 Z`} fill={`url(#${gid})`} />
            <path d={line} fill="none" stroke={c} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          </svg>
          {pts.map((p, i) => (
            <span className="fs-ch-pt" key={items[i].id} style={{left: `${p[0]}%`, top: `${p[1]}%`}}>
              <em>{show(vals[i])}</em>
            </span>
          ))}
        </div>
        <div className="fs-ch-xlabels">
          {items.map((it, i) => (
            <small key={it.id} style={{left: `${pts[i][0]}%`}}>
              {it.label}
            </small>
          ))}
        </div>
      </div>
    );
  } else if (v === 'donut') {
    const r = 38;
    const circ = 2 * Math.PI * r;
    let acc = 0;
    body = (
      <div className="fs-ch-donut">
        <div className="fs-ch-donut-svg">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" fill="none" r={r} stroke="#eef0f4" strokeWidth="14" />
            {items.map((it, i) => {
              const part = Math.max(vals[i], 0) / total;
              const seg = (
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  key={it.id}
                  r={r}
                  stroke={itemColor(d, i)}
                  strokeDasharray={`${Math.max(part * circ - 1.2, 0)} ${circ}`}
                  strokeDashoffset={-acc * circ}
                  strokeWidth="14"
                  transform="rotate(-90 50 50)"
                />
              );
              acc += part;
              return seg;
            })}
          </svg>
          <div className="fs-ch-donut-mid">
            <b>{unit === '%' ? `${items.length}` : show(total)}</b>
            <small>{unit === '%' ? 'parts' : 'total'}</small>
          </div>
        </div>
        <ul className="fs-ch-legend">
          {items.map((it, i) => (
            <li key={it.id} style={cvar(itemColor(d, i))}>
              <i />
              <span>{it.label}</span>
              <b>{unit === '%' ? `${Math.round((Math.max(vals[i], 0) / total) * 100)}%` : show(vals[i])}</b>
            </li>
          ))}
        </ul>
      </div>
    );
  } else if (v === 'rings') {
    const r = 40;
    const circ = 2 * Math.PI * r;
    body = (
      <div className="fs-ch-rings">
        {items.map((it, i) => {
          const p = Math.min(Math.max(vals[i], 0), 100) / 100;
          return (
            <div className="fs-ch-ring" key={it.id} style={cvar(itemColor(d, i))}>
              <div className="fs-ch-ring-svg">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r={r} stroke="var(--c-soft)" strokeWidth="10" />
                  <circle cx="50" cy="50" fill="none" r={r} stroke="var(--c)" strokeDasharray={`${p * circ} ${circ}`} strokeLinecap="round" strokeWidth="10" transform="rotate(-90 50 50)" />
                </svg>
                <b>{Math.round(p * 100)}%</b>
              </div>
              <small>{it.label}</small>
            </div>
          );
        })}
      </div>
    );
  } else {
    body = (
      <div className="fs-ch-bars">
        {items.map((it, i) => (
          <div className="fs-ch-bar" key={it.id} style={cvar(itemColor(d, i))}>
            <small title={it.label}>{it.label}</small>
            <div className="fs-ch-track">
              <span style={{width: `${(Math.max(vals[i], 0) / max) * 100}%`}} />
            </div>
            <b>{show(vals[i])}</b>
          </div>
        ))}
      </div>
    );
  }
  return (
    <Shell d={d} id={id} minH={140} minW={220} selected={!!selected} type="chart">
      <Title d={d} id={id} />
      {body}
    </Shell>
  );
}

// ── Diagrams ───────────────────────────────────────────────────────────────
const polar = (deg: number, r: number) => [50 + r * Math.cos((deg * Math.PI) / 180), 50 + r * Math.sin((deg * Math.PI) / 180)] as const;

export function DiagramNode({id, data, selected}: NodeProps) {
  const d = data as FD;
  const {editingId} = useStudio();
  const items = d.items || [];
  const v = d.variant || 'process';
  const n = items.length;
  const centreTitle = v === 'cycle' || v === 'hub' || v === 'venn';
  let body: React.ReactNode;
  if (!n) body = <Empty text="Add parts in the side panel" />;
  else if (v === 'cycle' || v === 'hub') {
    const R = v === 'cycle' ? 36 : 37;
    const ang = (i: number) => -90 + (360 * i) / n;
    const gap = Math.min(22, 120 / n);
    body = (
      <div className="fs-dg-square">
        <svg className="fs-dg-svg" viewBox="0 0 100 100">
          <defs>
            <marker id={`fs-dga-${id}`} markerHeight="5" markerWidth="5" orient="auto" refX="3" refY="2.5" viewBox="0 0 5 5">
              <path d="M0 0 L5 2.5 L0 5 Z" fill="#a3abb8" />
            </marker>
          </defs>
          {v === 'cycle'
            ? items.map((it, i) => {
                const a = ang(i) + gap;
                const b = ang(i + 1) - gap;
                if (b <= a) return null;
                const [x1, y1] = polar(a, R);
                const [x2, y2] = polar(b, R);
                return <path d={`M${x1} ${y1} A${R} ${R} 0 ${b - a > 180 ? 1 : 0} 1 ${x2} ${y2}`} fill="none" key={it.id} markerEnd={`url(#fs-dga-${id})`} stroke="#c3c9d3" strokeLinecap="round" strokeWidth="1.4" />;
              })
            : items.map((it, i) => {
                const [x, y] = polar(ang(i), R);
                return <line key={it.id} stroke={itemColor(d, i)} strokeDasharray="1.5 2" strokeLinecap="round" strokeOpacity="0.7" strokeWidth="0.9" x1="50" x2={x} y1="50" y2={y} />;
              })}
        </svg>
        {items.map((it, i) => {
          const [x, y] = polar(ang(i), R);
          return (
            <div className={`fs-dg-orbit ${v === 'hub' ? 'is-hub' : ''}`} key={it.id} style={{left: `${x}%`, top: `${y}%`, ...cvar(itemColor(d, i))}}>
              <b>{it.label}</b>
              {it.note && <small>{it.note}</small>}
            </div>
          );
        })}
        {(d.label || editingId === id) && (
          <div className={`fs-dg-centre ${v === 'hub' ? 'is-hub' : ''}`}>
            <Title d={d} id={id} />
          </div>
        )}
      </div>
    );
  } else if (v === 'funnel' || v === 'pyramid') {
    const k = v === 'funnel' ? 62 / n : 100 / n;
    body = (
      <div className={`fs-dg-stack is-${v}`}>
        {items.map((it, i) => {
          const top = v === 'funnel' ? 100 - i * k : i * k;
          const bot = v === 'funnel' ? 100 - (i + 1) * k : (i + 1) * k;
          const c = itemColor(d, i);
          return (
            <div
              className="fs-dg-tier"
              key={it.id}
              style={{
                ...cvar(c),
                clipPath: `polygon(${50 - top / 2}% 0, ${50 + top / 2}% 0, ${50 + bot / 2}% 100%, ${50 - bot / 2}% 100%)`,
              }}>
              <b>{it.label}</b>
              {it.note && <small>{it.note}</small>}
            </div>
          );
        })}
      </div>
    );
  } else if (v === 'stairs') {
    body = (
      <div className="fs-dg-stairs">
        {items.map((it, i) => (
          <div className="fs-dg-step" key={it.id} style={{...cvar(itemColor(d, i)), height: `${28 + (72 * (i + 1)) / n}%`}}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            <b>{it.label}</b>
            {it.note && <small>{it.note}</small>}
          </div>
        ))}
      </div>
    );
  } else if (v === 'venn') {
    const spots = n === 1 ? [[50, 50]] : n === 2 ? [[37, 50], [63, 50]] : [[38, 39], [62, 39], [50, 61]];
    const r = n === 1 ? 34 : n === 2 ? 28 : 25;
    const labelAt = n === 2 ? [[24, 50], [76, 50]] : [[27, 28], [73, 28], [50, 80]];
    body = (
      <div className="fs-dg-square">
        {items.slice(0, 3).map((it, i) => (
          <React.Fragment key={it.id}>
            <span className="fs-dg-circle" style={{...cvar(itemColor(d, i)), left: `${spots[i][0] - r}%`, top: `${spots[i][1] - r}%`, width: `${r * 2}%`, height: `${r * 2}%`}} />
            <div className="fs-dg-vlabel" style={{...cvar(itemColor(d, i)), left: `${(labelAt[i] || spots[i])[0]}%`, top: `${(labelAt[i] || spots[i])[1]}%`}}>
              <b>{it.label}</b>
              {it.note && <small>{it.note}</small>}
            </div>
          </React.Fragment>
        ))}
        {(d.label || editingId === id) && (
          <div className="fs-dg-centre is-venn" style={{top: n === 2 ? '50%' : '47%'}}>
            <Title d={d} id={id} />
          </div>
        )}
      </div>
    );
  } else if (v === 'matrix') {
    const axes = d.cells?.[0] || [];
    body = (
      <div className="fs-dg-matrix">
        <div className="fs-dg-quads">
          {[0, 1, 2, 3].map(i => {
            const it = items[i];
            return (
              <div className="fs-dg-quad" key={it?.id || i} style={cvar(itemColor(d, i))}>
                {it ? (
                  <>
                    <b>{it.label}</b>
                    {it.note && <small>{it.note}</small>}
                  </>
                ) : (
                  <small className="fs-placeholder">Empty</small>
                )}
              </div>
            );
          })}
        </div>
        {axes[0] && <span className="fs-dg-axis is-x">{axes[0]}</span>}
        {axes[1] && <span className="fs-dg-axis is-y">{axes[1]}</span>}
      </div>
    );
  } else {
    body = (
      <div className="fs-dg-steps">
        {items.map((it, i) => (
          <div className="fs-dg-stepcol" key={it.id} style={cvar(itemColor(d, i))}>
            <span className="fs-dg-num">{i + 1}</span>
            <b>{it.label}</b>
            {it.note && <small>{it.note}</small>}
          </div>
        ))}
      </div>
    );
  }
  return (
    <Shell d={d} id={id} minH={140} minW={200} selected={!!selected} type="diagram">
      {!centreTitle && <Title d={d} id={id} />}
      {body}
    </Shell>
  );
}

export const blockNodeTypes = {timeline: TimelineNode, gantt: GanttNode, table: TableNode, chart: ChartNode, diagram: DiagramNode, checklist: ChecklistNode};

// ── Little pictures for the Insert menu ───────────────────────────────────
export function BlockGlyph({k}: {k: string}) {
  const s = {fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;
  const g: Record<string, React.ReactNode> = {
    'timeline-line': (
      <>
        <path d="M2 12h20" {...s} />
        <circle cx="6" cy="12" fill="currentColor" r="2" />
        <circle cx="12" cy="12" fill="currentColor" r="2" />
        <circle cx="18" cy="12" fill="currentColor" r="2" />
        <path d="M6 9V5M12 15v4M18 9V5" {...s} />
      </>
    ),
    'timeline-cards': (
      <>
        <rect height="8" rx="1.5" width="6" x="2" y="3" {...s} />
        <rect height="8" rx="1.5" width="6" x="9" y="3" {...s} />
        <rect height="8" rx="1.5" width="6" x="16" y="3" {...s} />
        <path d="M2 18h20M5 11v7M12 11v7M19 11v7" {...s} />
      </>
    ),
    'timeline-vertical': (
      <>
        <path d="M12 2v20" {...s} />
        <rect height="4" rx="1" width="7" x="2" y="4" {...s} />
        <rect height="4" rx="1" width="7" x="15" y="11" {...s} />
        <rect height="4" rx="1" width="7" x="2" y="17" {...s} />
      </>
    ),
    'timeline-phases': <path d="M1 8h6l3 4-3 4H1l2-4zM9 8h6l3 4-3 4H9l2-4zM17 8h4l2 4-2 4h-4l2-4z" {...s} />,
    gantt: (
      <>
        <path d="M3 3v18h18" {...s} />
        <rect fill="currentColor" height="3" rx="1.5" width="8" x="5" y="6" />
        <rect fill="currentColor" height="3" rx="1.5" width="9" x="9" y="11" opacity="0.7" />
        <rect fill="currentColor" height="3" rx="1.5" width="6" x="14" y="16" opacity="0.5" />
      </>
    ),
    table: (
      <>
        <rect height="16" rx="2" width="18" x="3" y="4" {...s} />
        <path d="M3 9h18M3 14h18M9 4v16M15 4v16" {...s} />
      </>
    ),
    checklist: <path d="M3 6l2 2 3-3M3 13l2 2 3-3M11 6h10M11 13h10M11 20h10M4 20h2" {...s} />,
    'chart-bar': <path d="M4 4v16M4 7h12M4 12h16M4 17h8" {...s} strokeWidth={2.6} />,
    'chart-column': <path d="M3 21h18M6 21v-7M11 21V8M16 21v-10M20 21v-4" {...s} strokeWidth={2.6} />,
    'chart-line': <path d="M3 3v18h18M6 16l4-5 3 3 6-8" {...s} />,
    'chart-donut': (
      <>
        <circle cx="12" cy="12" r="8" {...s} strokeWidth={4} opacity={0.35} />
        <path d="M12 4a8 8 0 0 1 8 8" {...s} strokeWidth={4} />
      </>
    ),
    'chart-rings': (
      <>
        <circle cx="7" cy="12" r="4.5" {...s} />
        <circle cx="17" cy="12" r="4.5" {...s} />
        <path d="M7 7.5a4.5 4.5 0 0 1 4.5 4.5M17 7.5a4.5 4.5 0 1 1-4.5 4.5" {...s} strokeWidth={3} />
      </>
    ),
    'diagram-process': (
      <>
        <circle cx="4" cy="12" r="2.5" {...s} />
        <circle cx="12" cy="12" r="2.5" {...s} />
        <circle cx="20" cy="12" r="2.5" {...s} />
        <path d="M6.5 12h3M14.5 12h3" {...s} />
      </>
    ),
    'diagram-cycle': <path d="M20 12a8 8 0 0 1-13.7 5.6M4 12a8 8 0 0 1 13.7-5.6M17.7 2.5v4h-4M6.3 21.5v-4h4" {...s} />,
    'diagram-hub': (
      <>
        <circle cx="12" cy="12" r="3" {...s} />
        <circle cx="12" cy="3" r="1.6" {...s} />
        <circle cx="20" cy="15" r="1.6" {...s} />
        <circle cx="4" cy="15" r="1.6" {...s} />
        <path d="M12 9V4.6M14.6 13.4l3.9 1M9.4 13.4l-3.9 1" {...s} />
      </>
    ),
    'diagram-funnel': <path d="M3 4h18l-2.5 5h-13zM6.5 11h11l-2 5h-7zM9.5 18h5l-1 3h-3z" {...s} />,
    'diagram-pyramid': <path d="M12 3l3 5H9zM8.3 10h7.4l2.4 4H5.9zM5 16h14l2.5 5h-19z" {...s} />,
    'diagram-stairs': <path d="M3 20h4v-4h4v-4h4V8h4V4M3 20h18" {...s} />,
    'diagram-venn': (
      <>
        <circle cx="9" cy="10" r="6" {...s} />
        <circle cx="15" cy="10" r="6" {...s} />
        <circle cx="12" cy="15" r="6" {...s} />
      </>
    ),
    'diagram-matrix': (
      <>
        <rect height="18" rx="2" width="18" x="3" y="3" {...s} />
        <path d="M12 3v18M3 12h18" {...s} />
      </>
    ),
  };
  return <svg viewBox="0 0 24 24">{g[k]}</svg>;
}

// ── Quick style (selection toolbar) ───────────────────────────────────────
export function BlockQuickStyle({type, d, onUpdate, onDetails}: {type: BlockType; d: FD; onUpdate: (p: Partial<FD>) => void; onDetails: () => void}) {
  const variants = VARIANTS[type];
  return (
    <div className="fs-block-pop">
      {variants.length > 1 && (
        <>
          <h6>Style</h6>
          <div className="fs-block-variants">
            {variants.map(x => (
              <button className={(d.variant || variants[0].key) === x.key ? 'on' : ''} key={x.key} onClick={() => onUpdate(variantPatch(type, d, x.key))} type="button">
                {x.name}
              </button>
            ))}
          </div>
        </>
      )}
      <h6>Colours</h6>
      <SchemePicker d={d} onUpdate={onUpdate} />
      <button className="fs-btn fs-block-edit" onClick={onDetails} type="button">
        Edit the {type === 'table' ? 'table' : type === 'gantt' ? 'tasks' : type === 'chart' ? 'values' : 'entries'}…
      </button>
    </div>
  );
}

/** Switching style: a timeline into phases fills in end dates so the bars have a length. */
function variantPatch(type: BlockType, d: FD, variant: string): Partial<FD> {
  if (type === 'timeline' && variant === 'phases') {
    const items = d.items || [];
    return {
      variant,
      items: items.map((it, i) => {
        if (it.end || !it.date) return it;
        const next = toDate(items[i + 1]?.date);
        const own = toDate(it.date)!;
        return {...it, end: isoDay(next ? new Date(next.getTime() - DAY) : new Date(own.getTime() + 14 * DAY))};
      }),
    };
  }
  return {variant};
}

function SchemePicker({d, onUpdate}: {d: FD; onUpdate: (p: Partial<FD>) => void}) {
  return (
    <div className="fs-scheme-row">
      {SCHEME_KEYS.map(k => (
        <button
          aria-label={BLOCK_SCHEMES[k].name}
          className={`fs-scheme ${(d.scheme || 'vivid') === k ? 'on' : ''}`}
          key={k}
          onClick={() => onUpdate({scheme: k, items: d.items?.map(({color: _c, ...rest}) => rest)})}
          title={BLOCK_SCHEMES[k].name}
          type="button">
          {BLOCK_SCHEMES[k].colors.slice(0, 4).map(c => (
            <i key={c} style={{background: c}} />
          ))}
        </button>
      ))}
    </div>
  );
}

// ── Side panel editor ──────────────────────────────────────────────────────
const DATE_RX = /^(\d{4}-\d{2}-\d{2})$/;
/** Reads a date written almost any way ("2027-03-04", "Mar 4 2027", "4/3/2027"). */
function readDate(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  if (DATE_RX.test(t)) return toDate(t) ? t : null;
  if (!/\d/.test(t) || /^\d+(\.\d+)?%?$/.test(t)) return null;
  const ms = Date.parse(/\d{4}/.test(t) ? t : `${t} ${new Date().getFullYear()}`);
  return Number.isNaN(ms) ? null : isoDay(new Date(ms));
}

/** Turns pasted lines (from a list, a spreadsheet or a document) into entries. */
export function parseLines(type: string, text: string): BlockItem[] {
  return text
    .split(/\r?\n/)
    .map(l => l.replace(/^\s*([-*•·]|\d+[.)])\s+/, '').trim())
    .filter(Boolean)
    .slice(0, 60)
    .map(line => {
      const parts = line
        .split(/\t|\s+[|–—]\s+|\s+-\s+|,\s+|:\s+/)
        .map(p => p.trim())
        .filter(Boolean);
      const dates: string[] = [];
      let value: number | undefined;
      const words: string[] = [];
      for (const p of parts) {
        const dt = readDate(p);
        if (dt && dates.length < 2) dates.push(dt);
        else if (/^-?\$?[\d,]+(\.\d+)?%?k?$/i.test(p) && value === undefined) value = Number(p.replace(/[$,%k]/gi, ''));
        else words.push(p);
      }
      const it = item(words[0] || line.slice(0, 80));
      if (words[1]) it.note = words.slice(1).join(', ');
      if (dates[0]) it.date = dates[0];
      if (dates[1]) it.end = dates[1];
      if (value !== undefined) it.value = value;
      if (type === 'checklist' && /^\[x\]/i.test(line)) {
        it.done = true;
        it.label = it.label.replace(/^\[x\]\s*/i, '');
      }
      return it;
    });
}
const parseTable = (text: string) =>
  text
    .split(/\r?\n/)
    .filter(l => l.trim())
    .slice(0, 80)
    .map(l => (l.includes('\t') ? l.split('\t') : l.split(/\s*[,|]\s*/)).map(c => c.trim()).slice(0, 12));

export function BlockEditor({node, onUpdate}: {node: Node; onUpdate: (patch: Partial<FD>, extra?: Partial<Node>) => void}) {
  const d = node.data as FD;
  const type = node.type as BlockType;
  const items = d.items || [];
  const v = d.variant || VARIANTS[type][0].key;
  const [paste, setPaste] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    setPaste(null);
    setOpen(null);
  }, [node.id]);
  const set = (next: BlockItem[]) => onUpdate({items: next});
  const patchItem = (iid: string, p: Partial<BlockItem>) => set(items.map(x => (x.id === iid ? {...x, ...p} : x)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };
  const dated = type === 'timeline' || type === 'gantt';
  const ranged = type === 'gantt' || (type === 'timeline' && v === 'phases');
  const hasNote = type === 'timeline' || type === 'diagram';
  const hasValue = type === 'chart' || type === 'gantt';
  const cap = type === 'diagram' && v === 'venn' ? 3 : type === 'diagram' && v === 'matrix' ? 4 : 60;
  const cells = d.cells?.length ? d.cells : [['']];
  const cols = Math.max(...cells.map(r => r.length), 1);
  const text = (value: string | undefined, save: (s: string) => void, placeholder: string, k: string) => (
    <input defaultValue={value || ''} key={`${k}-${value || ''}`} onBlur={e => e.target.value !== (value || '') && save(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} placeholder={placeholder} />
  );

  return (
    <div className="fs-bed">
      {type !== 'table' && (
        <label className="fs-field">
          <span>{type === 'diagram' && (v === 'cycle' || v === 'hub' || v === 'venn') ? 'Centre label' : 'Title'}</span>
          {text(d.label, s => onUpdate({label: s}), 'No title', `t-${node.id}`)}
        </label>
      )}

      {VARIANTS[type].length > 1 && (
        <div className="fs-setting">
          <span>Style</span>
          <div className="fs-block-variants">
            {VARIANTS[type].map(x => (
              <button className={v === x.key ? 'on' : ''} key={x.key} onClick={() => onUpdate(variantPatch(type, d, x.key))} type="button">
                {x.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="fs-setting">
        <span>Colours</span>
        <SchemePicker d={d} onUpdate={onUpdate} />
      </div>
      <div className="fs-bed-toggles">
        {type === 'timeline' && v === 'line' && (
          <label className="fs-check">
            <input checked={d.spacing === 'date'} onChange={e => onUpdate({spacing: e.target.checked ? 'date' : 'even'})} type="checkbox" /> Space by date
          </label>
        )}
        {(type === 'gantt' || (type === 'timeline' && (v === 'line' || v === 'phases'))) && (
          <label className="fs-check">
            <input checked={!!d.today} onChange={e => onUpdate({today: e.target.checked})} type="checkbox" /> Show today
          </label>
        )}
        {type === 'table' && (
          <label className="fs-check">
            <input checked={d.header !== false} onChange={e => onUpdate({header: e.target.checked})} type="checkbox" /> First row is a header
          </label>
        )}
        <label className="fs-check">
          <input checked={!d.bare} onChange={e => onUpdate({bare: !e.target.checked})} type="checkbox" /> Card behind it
        </label>
      </div>
      {type === 'chart' && (
        <label className="fs-field">
          <span>Unit</span>
          <select onChange={e => onUpdate({unit: e.target.value})} value={d.unit || ''}>
            <option value="">None</option>
            <option value="%">%</option>
            <option value="$">$</option>
            <option value="k">k (thousands)</option>
            <option value="h">h (hours)</option>
            <option value=" days"> days</option>
          </select>
        </label>
      )}
      {type === 'diagram' && v === 'matrix' && (
        <div className="fs-field-row">
          <label className="fs-field">
            <span>Across</span>
            {text(d.cells?.[0]?.[0], s => onUpdate({cells: [[s, d.cells?.[0]?.[1] || '']]}), 'More urgent →', `ax-${node.id}`)}
          </label>
          <label className="fs-field">
            <span>Up</span>
            {text(d.cells?.[0]?.[1], s => onUpdate({cells: [[d.cells?.[0]?.[0] || '', s]]}), 'More important →', `ay-${node.id}`)}
          </label>
        </div>
      )}

      {type === 'table' ? (
        <>
          <h4>Size</h4>
          <div className="fs-bed-size">
            <span>Rows</span>
            <button disabled={cells.length <= 1} onClick={() => onUpdate({cells: cells.slice(0, -1)})} type="button">
              −
            </button>
            <b>{cells.length}</b>
            <button onClick={() => onUpdate({cells: [...cells, Array(cols).fill('')]})} type="button">
              +
            </button>
            <span>Columns</span>
            <button disabled={cols <= 1} onClick={() => onUpdate({cells: cells.map(r => r.slice(0, cols - 1))})} type="button">
              −
            </button>
            <b>{cols}</b>
            <button onClick={() => onUpdate({cells: cells.map(r => [...r, ...Array(Math.max(0, cols - r.length)).fill(''), ''])})} type="button">
              +
            </button>
          </div>
          <p className="fs-muted">Click the table on the board to type in its cells. Enter moves down a row.</p>
        </>
      ) : (
        <>
          <h4 className="fs-bed-head">
            <span>
              {type === 'gantt' ? 'Tasks' : type === 'chart' ? 'Values' : type === 'checklist' ? 'Items' : type === 'diagram' ? 'Parts' : 'Events'} <em>{items.length}</em>
            </span>
            {dated && items.length > 1 && (
              <button
                onClick={() => set([...items].sort((a, b) => (toDate(a.date)?.getTime() ?? Infinity) - (toDate(b.date)?.getTime() ?? Infinity)))}
                title="Sort by date"
                type="button">
                <ArrowDownUp /> Sort
              </button>
            )}
          </h4>
          <ul className="fs-bed-list">
            {items.map((it, i) => {
              const c = itemColor(d, i);
              const expanded = open === it.id;
              return (
                <li className={expanded ? 'is-open' : ''} key={it.id}>
                  <div className="fs-bed-row">
                    <label className="fs-bed-dot" style={{background: c}} title="Colour">
                      <input onChange={e => patchItem(it.id, {color: e.target.value})} type="color" value={c} />
                    </label>
                    {type === 'checklist' && <input checked={!!it.done} onChange={e => patchItem(it.id, {done: e.target.checked})} title="Done" type="checkbox" />}
                    {text(it.label, s => patchItem(it.id, {label: s}), type === 'checklist' ? 'Something to do' : 'Name', `l-${it.id}`)}
                    {type === 'chart' && <input className="fs-bed-num" defaultValue={it.value ?? ''} key={`v-${it.id}-${it.value}`} onBlur={e => Number(e.target.value) !== it.value && patchItem(it.id, {value: Number(e.target.value) || 0})} placeholder="0" type="number" />}
                    <button className="fs-bed-more" onClick={() => setOpen(expanded ? null : it.id)} title="More" type="button">
                      {expanded ? '▴' : '▾'}
                    </button>
                  </div>
                  {dated && !expanded && <div className="fs-bed-sub">{ranged ? fmtRange(it.date, it.milestone ? undefined : it.end) || 'No dates' : fmtDay(it.date, true) || 'No date'}</div>}
                  {expanded && (
                    <div className="fs-bed-detail">
                      {dated && (
                        <div className="fs-field-row">
                          <label className="fs-field">
                            <span>{ranged ? 'Start' : 'Date'}</span>
                            <input onChange={e => patchItem(it.id, {date: e.target.value})} type="date" value={it.date || ''} />
                          </label>
                          {ranged && !it.milestone && (
                            <label className="fs-field">
                              <span>End</span>
                              <input min={it.date} onChange={e => patchItem(it.id, {end: e.target.value})} type="date" value={it.end || ''} />
                            </label>
                          )}
                        </div>
                      )}
                      {type === 'gantt' && (
                        <div className="fs-field-row">
                          <label className="fs-field">
                            <span>Done</span>
                            <input defaultValue={it.value ?? ''} key={`p-${it.id}-${it.value}`} max={100} min={0} onBlur={e => patchItem(it.id, {value: Math.max(0, Math.min(100, Number(e.target.value) || 0))})} placeholder="0 %" type="number" />
                          </label>
                          <label className="fs-check fs-bed-ms">
                            <input checked={!!it.milestone} onChange={e => patchItem(it.id, {milestone: e.target.checked})} type="checkbox" /> Milestone
                          </label>
                        </div>
                      )}
                      {(hasNote || type === 'chart') && <label className="fs-field">{text(it.note, s => patchItem(it.id, {note: s}), type === 'diagram' && v === 'funnel' ? 'Figure or note' : 'Note', `n-${it.id}`)}</label>}
                      <div className="fs-bed-actions">
                        <button disabled={i === 0} onClick={() => move(i, -1)} title="Move up" type="button">
                          <ArrowUp />
                        </button>
                        <button disabled={i === items.length - 1} onClick={() => move(i, 1)} title="Move down" type="button">
                          <ArrowDown />
                        </button>
                        {it.color && (
                          <button onClick={() => patchItem(it.id, {color: undefined})} type="button">
                            Reset colour
                          </button>
                        )}
                        <span className="fs-grow" />
                        <button className="danger" onClick={() => set(items.filter(x => x.id !== it.id))} title="Remove" type="button">
                          <Trash2 />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            className="fs-btn fs-bed-add"
            disabled={items.length >= cap}
            onClick={() => {
              const fresh = newItem(type, d);
              set([...items, fresh]);
              setOpen(dated || hasNote ? fresh.id : null);
            }}
            type="button">
            <Plus /> Add {type === 'gantt' ? 'a task' : type === 'chart' ? 'a value' : type === 'checklist' ? 'an item' : type === 'diagram' ? 'a part' : 'an event'}
          </button>
          {hasValue && type === 'gantt' && <p className="fs-muted">Bars turn red when their end date has passed and they are not 100% done.</p>}
        </>
      )}

      <h4>Paste</h4>
      {paste === null ? (
        <button className="fs-btn fs-bed-add" onClick={() => setPaste('')} type="button">
          <ClipboardPaste /> Paste a list or spreadsheet rows
        </button>
      ) : (
        <div className="fs-bed-paste">
          <textarea
            autoFocus
            onChange={e => setPaste(e.target.value)}
            placeholder={
              type === 'table'
                ? 'Copy cells from Excel or Sheets and paste them here'
                : type === 'gantt'
                ? 'One task per line:\nDesign, 2027-03-01, 2027-03-14'
                : type === 'chart'
                ? 'One value per line:\nSupport, 42'
                : dated
                ? 'One event per line:\nKickoff, Mar 3\nLaunch, Jun 1'
                : 'One per line'
            }
            rows={5}
            value={paste}
          />
          <div className="fs-bed-actions">
            <button
              className="fs-btn fs-btn-primary"
              disabled={!paste.trim()}
              onClick={() => {
                if (type === 'table') onUpdate({cells: parseTable(paste)});
                else set(parseLines(type, paste).slice(0, cap));
                setPaste(null);
              }}
              type="button">
              Replace
            </button>
            {type !== 'table' && (
              <button className="fs-btn" disabled={!paste.trim()} onClick={() => (set([...items, ...parseLines(type, paste)].slice(0, cap)), setPaste(null))} type="button">
                Add to the end
              </button>
            )}
            <button className="fs-btn" onClick={() => setPaste(null)} type="button">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
