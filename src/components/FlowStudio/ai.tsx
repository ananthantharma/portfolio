/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import type {Edge, Node} from '@xyflow/react';
import {ArrowLeft, GitBranch, Loader2, RotateCcw, Sparkles, Workflow, X} from 'lucide-react';
import React, {useMemo, useState} from 'react';

import {layeredLayout, layoutMind, mindInfo} from './layout';
import {AiFlow, AiTree, autoSides, BoardKind, FD, frameNode, framesFirst, makePreview, nodesFromAiFlow, nodesFromAiTree, Preview} from './model';

export interface AiResult {
  kind: BoardKind;
  title: string;
  summary: string;
  flow?: AiFlow;
  tree?: AiTree;
}

const size = (n: Node) => ({w: (n.width as number) || 200, h: (n.height as number) || 72});

/** Lays out what the AI drafted: a top-down flowchart, swimlanes when it named who does what, or a mind map. */
export function buildFromAi(r: AiResult): {nodes: Node[]; edges: Edge[]} {
  if (r.kind === 'mindmap') {
    const nodes = nodesFromAiTree(r.tree || {label: r.title || 'Idea'});
    const info = mindInfo(nodes, 'right');
    const boxes = layoutMind(nodes, info, 'right');
    nodes.forEach(n => {
      const b = boxes.get(n.id);
      if (b) n.position = {x: b.x, y: b.y};
    });
    return {nodes, edges: []};
  }
  const flow = r.flow || {steps: [], links: []};
  const {nodes, edges} = nodesFromAiFlow(flow);
  const lanes = (flow.lanes || []).map(String).filter(Boolean);
  const laneOf = (n: Node) => String((n.data as FD).lane || '');
  const inLanes = nodes.filter(n => lanes.includes(laneOf(n))).length;
  const useLanes = lanes.length > 1 && inLanes >= nodes.length * 0.8;
  const abs = new Map<string, {x: number; y: number; w: number; h: number}>();
  let out: Node[] = nodes;

  if (!useLanes) {
    const pos = layeredLayout(nodes, edges, 'TB', {x: 0, y: 0});
    nodes.forEach(n => {
      const p = pos.get(n.id)!;
      n.position = p;
      abs.set(n.id, {...p, ...size(n)});
    });
  } else {
    const pos = layeredLayout(nodes, edges, 'LR', {x: 0, y: 0});
    const fallback = lanes[0];
    const frames: Node[] = [];
    let top = 0;
    const width = Math.max(...nodes.map(n => pos.get(n.id)!.x + size(n).w)) + 160;
    lanes.forEach((lane, i) => {
      const members = nodes.filter(n => (lanes.includes(laneOf(n)) ? laneOf(n) : fallback) === lane).sort((a, b) => pos.get(a.id)!.x - pos.get(b.id)!.x);
      // Steps in the same column of a lane stack on top of each other
      const cols: {x: number; items: Node[]}[] = [];
      members.forEach(n => {
        const x = pos.get(n.id)!.x;
        const col = cols.find(c => Math.abs(c.x - x) < 110);
        if (col) col.items.push(n);
        else cols.push({x, items: [n]});
      });
      const rowH = Math.max(1, ...cols.map(c => c.items.reduce((s, n) => s + size(n).h + 24, 0)));
      const h = Math.max(170, rowH + 70);
      const frame = frameNode(0, top, lane, ['blue', 'purple', 'green', 'yellow', 'orange', 'teal', 'red', 'gray'][i % 8], width, h);
      frames.push(frame);
      cols.forEach(c => {
        const total = c.items.reduce((s, n) => s + size(n).h, 0) + (c.items.length - 1) * 24;
        let y = 48 + (h - 48 - total) / 2;
        c.items.forEach(n => {
          n.parentId = frame.id;
          n.position = {x: c.x + 60, y};
          abs.set(n.id, {x: c.x + 60, y: top + y, ...size(n)});
          y += size(n).h + 24;
        });
      });
      top += h + 24;
    });
    out = framesFirst([...frames, ...nodes]);
  }
  edges.forEach(e => {
    const a = abs.get(e.source);
    const b = abs.get(e.target);
    if (!a || !b) return;
    const [s, t] = autoSides(a, b);
    e.sourceHandle = s;
    e.targetHandle = t;
  });
  out.forEach(n => {
    if ((n.data as FD).lane !== undefined) {
      const {lane: _lane, ...rest} = n.data as FD;
      n.data = rest;
    }
  });
  return {nodes: out, edges};
}

/** Gallery sketch of a board; mind maps are laid out first since their saved positions may be blank. */
export function previewOf(data: {kind: BoardKind; nodes: Node[]; edges: Edge[]; settings?: {layout?: 'right' | 'both' | 'down'}}): Preview {
  if (data.kind !== 'mindmap') return makePreview(data.nodes, data.edges, data.kind);
  const layout = data.settings?.layout || 'right';
  return makePreview(data.nodes, [], 'mindmap', ns => layoutMind(ns, mindInfo(ns, layout), layout));
}

export function PreviewSvg({preview, className}: {preview?: Preview | null; className?: string}) {
  if (!preview || !preview.r?.length) return <div className={`fs-prev fs-prev-empty ${className || ''}`} />;
  const maxX = Math.max(...preview.r.map(r => r[0] + r[2]), ...preview.l.map(l => Math.max(l[0], l[2])), 1);
  const maxY = Math.max(...preview.r.map(r => r[1] + r[3]), ...preview.l.map(l => Math.max(l[1], l[3])), 1);
  const pad = Math.max(maxX, maxY) * 0.06;
  const frames = preview.r.filter(r => r[5] === 2);
  const rest = preview.r.filter(r => r[5] !== 2);
  const box = ([x, y, w, h, c, k]: Preview['r'][number], i: number) => (
    <rect
      fill={k === 2 ? `${c}88` : c}
      height={h}
      key={i}
      rx={k === 1 ? Math.min(h / 2, 4) : k === 2 ? 1.6 : k === 3 ? 0.4 : 1.2}
      stroke={k === 2 ? '#c9ced8' : c === '#ffffff' ? '#cfd5de' : 'none'}
      strokeWidth={0.35}
      width={w}
      x={x}
      y={y}
    />
  );
  return (
    <svg className={`fs-prev ${className || ''}`} preserveAspectRatio="xMidYMid meet" viewBox={`${-pad} ${-pad} ${maxX + pad * 2} ${maxY + pad * 2}`}>
      {frames.map(box)}
      {preview.l.map(([x1, y1, x2, y2, c], i) => (
        <line key={`l${i}`} stroke={c} strokeLinecap="round" strokeWidth={0.55} x1={x1} x2={x2} y1={y1} y2={y2} />
      ))}
      {rest.map(box)}
    </svg>
  );
}

function Outline({r}: {r: AiResult}) {
  if (r.kind === 'mindmap' && r.tree) {
    const rows: {label: string; depth: number}[] = [];
    const walk = (t: AiTree, d: number) => {
      rows.push({label: t.label, depth: d});
      (t.children || []).forEach(c => walk(c, d + 1));
    };
    walk(r.tree, 0);
    return (
      <ul className="fs-ai-outline">
        {rows.map((row, i) => (
          <li key={i} style={{paddingLeft: row.depth * 16}}>
            <span className={row.depth === 0 ? 'is-root' : ''}>{row.label}</span>
          </li>
        ))}
      </ul>
    );
  }
  const flow = r.flow!;
  const label = new Map(flow.steps.map(s => [String(s.id), s.label]));
  return (
    <ol className="fs-ai-outline fs-ai-steps">
      {flow.steps.map(s => {
        const outs = flow.links.filter(l => String(l.from) === String(s.id));
        return (
          <li key={s.id}>
            <span className={`fs-ai-type t-${s.type || 'step'}`}>{s.type || 'step'}</span>
            <span>{s.label}</span>
            {s.lane && <em>{s.lane}</em>}
            {outs.length > 0 && (
              <small>
                → {outs.map(o => `${label.get(String(o.to)) || '?'}${o.label ? ` (${o.label})` : ''}`).join(', ')}
              </small>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * "Build with AI": describe or paste something, Gemini drafts it, you check the draft, then it's built.
 * Nothing changes on the board until you press the build button.
 */
export function AiBuilder({
  kind: fixedKind,
  canAdd,
  context,
  addLabel,
  onClose,
  onBuild,
}: {
  kind?: BoardKind;
  canAdd?: boolean;
  context?: string;
  addLabel?: string;
  onClose: () => void;
  onBuild: (result: AiResult, built: {nodes: Node[]; edges: Edge[]}, mode: 'add' | 'replace') => void | Promise<void>;
}) {
  const [kind, setKind] = useState<BoardKind>(fixedKind || 'whiteboard');
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'add' | 'replace'>(canAdd ? 'add' : 'replace');
  const [step, setStep] = useState<'input' | 'loading' | 'review' | 'building'>('input');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiResult | null>(null);

  const built = useMemo(() => (result ? buildFromAi(result) : null), [result]);
  const preview = useMemo(() => (built && result ? makePreview(built.nodes, built.edges, result.kind) : null), [built, result]);

  const draft = async () => {
    if (!text.trim()) return setError('Describe the process, or paste notes, an email or a policy.');
    setError(null);
    setStep('loading');
    try {
      const res = await fetch('/api/process-flow/ai', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text, kind, context: mode === 'add' ? context : undefined}),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || 'The AI could not build that. Try again.');
      setResult(json.data as AiResult);
      setStep('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The AI could not build that.');
      setStep('input');
    }
  };

  const count = built ? built.nodes.filter(n => n.type !== 'frame').length : 0;

  return (
    <div className="fs-modal-back" onMouseDown={e => e.target === e.currentTarget && step !== 'building' && onClose()}>
      <div className="fs-modal fs-ai" role="dialog" aria-label="Build with AI">
        <header className="fs-modal-head">
          <span className="fs-ai-mark">
            <Sparkles />
          </span>
          <div>
            <h3>Build with AI</h3>
            <p>Gemini drafts it, you check it, then it&apos;s built. Nothing changes until you confirm.</p>
          </div>
          <button aria-label="Close" className="fs-icon-btn" onClick={onClose} type="button">
            <X />
          </button>
        </header>

        {(step === 'input' || step === 'loading') && (
          <div className="fs-modal-body">
            {!fixedKind && (
              <div className="fs-seg fs-seg-lg">
                <button className={kind === 'whiteboard' ? 'on' : ''} onClick={() => setKind('whiteboard')} type="button">
                  <Workflow /> Process flowchart
                </button>
                <button className={kind === 'mindmap' ? 'on' : ''} onClick={() => setKind('mindmap')} type="button">
                  <GitBranch /> Mind map
                </button>
              </div>
            )}
            <textarea
              autoFocus
              className="fs-ai-text"
              disabled={step === 'loading'}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void draft();
              }}
              placeholder={
                kind === 'mindmap'
                  ? 'e.g. "Plan for the Q3 vendor consolidation: goals, workstreams, risks, owners…" or paste meeting notes'
                  : 'e.g. "When an invoice arrives, AP checks it against the PO. If it matches, the manager approves and finance pays; if not, it goes back to the vendor…" or paste a policy or email'
              }
              value={text}
            />
            {canAdd && (
              <div className="fs-ai-mode">
                <label>
                  <input checked={mode === 'add'} onChange={() => setMode('add')} type="radio" /> {addLabel || 'Add to this board'}
                </label>
                <label>
                  <input checked={mode === 'replace'} onChange={() => setMode('replace')} type="radio" /> Replace everything on it
                </label>
              </div>
            )}
            {error && <p className="fs-error">{error}</p>}
            <footer className="fs-modal-foot">
              <span className="fs-muted">Uses Gemini Flash · Ctrl+Enter to draft</span>
              <button className="fs-btn fs-btn-primary" disabled={step === 'loading' || !text.trim()} onClick={() => void draft()} type="button">
                {step === 'loading' ? <Loader2 className="fs-spin" /> : <Sparkles />}
                {step === 'loading' ? 'Drafting…' : 'Draft it'}
              </button>
            </footer>
          </div>
        )}

        {(step === 'review' || step === 'building') && result && (
          <div className="fs-modal-body">
            <div className="fs-ai-review">
              <div className="fs-ai-preview">
                <PreviewSvg preview={preview} />
              </div>
              <div className="fs-ai-detail">
                <h4>{result.title}</h4>
                {result.summary && <p>{result.summary}</p>}
                <p className="fs-muted">
                  {count} {result.kind === 'mindmap' ? 'ideas' : 'steps'}
                  {built?.edges.length ? ` · ${built.edges.length} connections` : ''}
                  {canAdd ? (mode === 'add' ? ' · will be added to the board' : ' · will replace the board') : ''}
                </p>
                <Outline r={result} />
              </div>
            </div>
            {error && <p className="fs-error">{error}</p>}
            <footer className="fs-modal-foot">
              <button className="fs-btn" disabled={step === 'building'} onClick={() => setStep('input')} type="button">
                <ArrowLeft /> Edit text
              </button>
              <button className="fs-btn" disabled={step === 'building'} onClick={() => void draft()} type="button">
                <RotateCcw /> Redo draft
              </button>
              <span className="fs-grow" />
              <button
                className="fs-btn fs-btn-primary"
                disabled={step === 'building'}
                onClick={async () => {
                  if (!built) return;
                  setStep('building');
                  setError(null);
                  try {
                    await onBuild(result, buildFromAi(result), mode);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Could not build it.');
                    setStep('review');
                  }
                }}
                type="button">
                {step === 'building' ? <Loader2 className="fs-spin" /> : <Sparkles />} Looks good, build it
              </button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
