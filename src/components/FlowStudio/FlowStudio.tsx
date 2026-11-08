/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props */
'use client';

import '@xyflow/react/dist/style.css';
import './studio.css';

import {ArrowLeft, Copy, Frame, GitBranch, LayoutGrid, Loader2, MoreHorizontal, Pencil, Plus, Search, Sparkles, Trash2, Upload, X} from 'lucide-react';
import dynamic from 'next/dynamic';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {AiBuilder, previewOf, PreviewSvg} from './ai';
import {BoardData, BoardKind, framesFirst, isBoardData, Preview, TEMPLATES, toBoard} from './model';

const Editor = dynamic(() => import('./Editor'), {ssr: false, loading: () => <Splash label="Opening board…" />});

interface FlowSummary {
  _id: string;
  name: string;
  lastUpdated: string;
  kind?: BoardKind;
  preview?: Preview | null;
}

function Splash({label}: {label: string}) {
  return (
    <div className="fs-root fs-splash">
      <Loader2 className="fs-spin" /> {label}
    </div>
  );
}

const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
};

async function createBoard(name: string, data: BoardData): Promise<string> {
  const res = await fetch('/api/process-flow', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({name, data, kind: data.kind, preview: previewOf(data)}),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.flow?._id) throw new Error(json?.error || 'Could not create the board');
  return String(json.flow._id);
}

/** /process-flow: your boards, or one board open in the editor (?id=). */
export default function FlowStudio() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname() || '/process-flow';
  const id = params.get('id');
  const open = useCallback((boardId: string) => router.push(`${path}?id=${encodeURIComponent(boardId)}`), [router, path]);
  if (id) return <BoardLoader id={id} key={id} onBack={() => router.push(path)} />;
  return <Gallery onOpen={open} />;
}

function BoardLoader({id, onBack}: {id: string; onBack: () => void}) {
  const [state, setState] = useState<{name: string; data: BoardData} | {error: string} | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/process-flow?id=${encodeURIComponent(id)}`)
      .then(async r => {
        const json = await r.json().catch(() => null);
        if (!r.ok || !json?.flow) throw new Error(json?.error || 'This board could not be opened');
        const kind: BoardKind = json.flow.kind === 'mindmap' || json.flow.data?.kind === 'mindmap' ? 'mindmap' : 'whiteboard';
        if (alive) setState({name: json.flow.name || 'Untitled board', data: toBoard(json.flow.data, kind)});
      })
      .catch(e => alive && setState({error: e instanceof Error ? e.message : 'This board could not be opened'}));
    return () => {
      alive = false;
    };
  }, [id]);
  if (!state) return <Splash label="Opening board…" />;
  if ('error' in state)
    return (
      <div className="fs-root fs-splash">
        <p>{state.error}</p>
        <button className="fs-btn" onClick={onBack} type="button">
          <ArrowLeft /> All boards
        </button>
      </div>
    );
  return <Editor boardId={id} initial={state.data} name={state.name} onBack={onBack} />;
}

function Gallery({onOpen}: {onOpen: (id: string) => void}) {
  const [flows, setFlows] = useState<FlowSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | BoardKind>('all');
  const [sort, setSort] = useState<'recent' | 'name'>('recent');
  const [picker, setPicker] = useState(false);
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fetch('/api/process-flow')
      .then(r => r.json())
      .then(j => {
        if (!Array.isArray(j?.flows)) throw new Error(j?.error || 'Could not load your boards');
        setFlows(j.flows);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load your boards'));
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  const shown = useMemo(() => {
    const list = (flows || []).filter(f => (filter === 'all' || (f.kind || 'whiteboard') === filter) && f.name.toLowerCase().includes(q.trim().toLowerCase()));
    return sort === 'name' ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;
  }, [flows, filter, q, sort]);

  const start = async (name: string, data: BoardData) => {
    setBusy(name);
    setError(null);
    try {
      onOpen(await createBoard(name, data));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the board');
      setBusy(null);
    }
  };
  const duplicate = async (f: FlowSummary) => {
    setBusy(f._id);
    try {
      const r = await fetch(`/api/process-flow?id=${encodeURIComponent(f._id)}`).then(x => x.json());
      const data = toBoard(r.flow?.data, f.kind || 'whiteboard');
      await createBoard(`${f.name} (copy)`, data);
      load();
    } catch {
      setError('Could not duplicate that board');
    } finally {
      setBusy(null);
    }
  };
  const remove = async (f: FlowSummary) => {
    if (!window.confirm(`Delete “${f.name}”? This cannot be undone.`)) return;
    setFlows(list => (list || []).filter(x => x._id !== f._id));
    const res = await fetch(`/api/process-flow?id=${encodeURIComponent(f._id)}`, {method: 'DELETE'}).catch(() => null);
    if (!res?.ok) {
      setError('Could not delete that board');
      load();
    }
  };
  const rename = async (f: FlowSummary, name: string) => {
    setRenaming(null);
    const v = name.trim();
    if (!v || v === f.name) return;
    setFlows(list => (list || []).map(x => (x._id === f._id ? {...x, name: v} : x)));
    await fetch('/api/process-flow', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: f._id, name: v})}).catch(() => setError('Could not rename'));
  };
  const importFile = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text());
      const data = toBoard(raw, isBoardData(raw) ? raw.kind : 'whiteboard');
      await start(String(raw.name || file.name.replace(/\.json$/i, '')) || 'Imported board', data);
    } catch {
      setError('That file could not be read');
    }
  };

  return (
    <div className="fs-root fs-gallery">
      <header className="fs-gallery-head">
        <a className="fs-btn fs-btn-ghost" href="/notes">
          <ArrowLeft /> Notes
        </a>
        <div className="fs-gallery-title">
          <span className="fs-logo">
            <LayoutGrid />
          </span>
          <div>
            <h1>Process flows</h1>
            <p>Whiteboards, flowcharts and mind maps</p>
          </div>
        </div>
        <div className="fs-gallery-actions">
          <button className="fs-btn" onClick={() => importRef.current?.click()} title="Import a .json board (also old builder files)" type="button">
            <Upload /> <span className="fs-hide-sm">Import</span>
          </button>
          <button className="fs-btn fs-btn-ai" onClick={() => setAi(true)} type="button">
            <Sparkles /> Build with AI
          </button>
          <button className="fs-btn fs-btn-primary" onClick={() => setPicker(true)} type="button">
            <Plus /> New board
          </button>
        </div>
      </header>

      <main className="fs-gallery-main">
        <section className="fs-quickstart">
          {TEMPLATES.filter(t => ['blank', 'flowchart', 'swimlane', 'mind-blank'].includes(t.key)).map(t => (
            <button className="fs-qs" disabled={!!busy} key={t.key} onClick={() => void start(t.key === 'blank' ? 'Untitled whiteboard' : t.name, t.build())} type="button">
              <span className={`fs-qs-icon ${t.kind === 'mindmap' ? 'is-mind' : ''}`}>{t.kind === 'mindmap' ? <GitBranch /> : t.key === 'blank' ? <Plus /> : <Frame />}</span>
              <span>
                <b>{t.key === 'blank' ? 'Blank whiteboard' : t.name}</b>
                <small>{t.blurb}</small>
              </span>
              {busy === (t.key === 'blank' ? 'Untitled whiteboard' : t.name) && <Loader2 className="fs-spin" />}
            </button>
          ))}
          <button className="fs-qs fs-qs-more" onClick={() => setPicker(true)} type="button">
            <span className="fs-qs-icon">
              <LayoutGrid />
            </span>
            <span>
              <b>All templates</b>
              <small>Journey, retro, SWOT, org chart…</small>
            </span>
          </button>
        </section>

        <div className="fs-gallery-bar">
          <div className="fs-seg">
            {(
              [
                ['all', 'All'],
                ['whiteboard', 'Whiteboards'],
                ['mindmap', 'Mind maps'],
              ] as const
            ).map(([k, l]) => (
              <button className={filter === k ? 'on' : ''} key={k} onClick={() => setFilter(k)} type="button">
                {l}
              </button>
            ))}
          </div>
          <label className="fs-search-input">
            <Search />
            <input onChange={e => setQ(e.target.value)} placeholder="Search boards" value={q} />
          </label>
          <select className="fs-select" onChange={e => setSort(e.target.value as 'recent' | 'name')} value={sort}>
            <option value="recent">Recently edited</option>
            <option value="name">Name</option>
          </select>
        </div>

        {error && <p className="fs-error">{error}</p>}
        {!flows && !error ? (
          <div className="fs-grid">
            {[0, 1, 2, 3].map(i => (
              <div className="fs-card-board is-skeleton" key={i} />
            ))}
          </div>
        ) : shown.length ? (
          <div className="fs-grid">
            {shown.map(f => (
              <article className="fs-card-board" key={f._id}>
                <button className="fs-card-preview" onClick={() => onOpen(f._id)} type="button">
                  <PreviewSvg preview={f.preview} />
                  {!f.preview && <span className="fs-card-open">Open to see it</span>}
                </button>
                <div className="fs-card-meta">
                  <span className={`fs-kind-chip ${f.kind === 'mindmap' ? 'is-mind' : ''}`}>{f.kind === 'mindmap' ? <GitBranch /> : <Frame />}</span>
                  <div className="fs-card-text">
                    {renaming === f._id ? (
                      <input autoFocus defaultValue={f.name} onBlur={e => void rename(f, e.target.value)} onKeyDown={e => (e.key === 'Enter' ? (e.target as HTMLInputElement).blur() : e.key === 'Escape' && setRenaming(null))} />
                    ) : (
                      <button className="fs-card-name" onClick={() => onOpen(f._id)} type="button">
                        {f.name}
                      </button>
                    )}
                    <small>Edited {ago(f.lastUpdated)}</small>
                  </div>
                  {busy === f._id ? (
                    <Loader2 className="fs-spin" />
                  ) : (
                    <div className="fs-pop-anchor">
                      <button
                        aria-label={`More for ${f.name}`}
                        className="fs-icon-btn"
                        onClick={e => {
                          e.stopPropagation();
                          setMenu(m => (m === f._id ? null : f._id));
                        }}
                        type="button">
                        <MoreHorizontal />
                      </button>
                      {menu === f._id && (
                        <div className="fs-menu fs-menu-right" onClick={e => e.stopPropagation()}>
                          <button onClick={() => (setMenu(null), setRenaming(f._id))} type="button">
                            <Pencil /> Rename
                          </button>
                          <button onClick={() => (setMenu(null), void duplicate(f))} type="button">
                            <Copy /> Duplicate
                          </button>
                          <button className="danger" onClick={() => (setMenu(null), void remove(f))} type="button">
                            <Trash2 /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="fs-empty">
            <LayoutGrid />
            <h3>{flows?.length ? 'No boards match' : 'No boards yet'}</h3>
            <p>{flows?.length ? 'Try another search.' : 'Start from a template, or describe a process and let AI draw it.'}</p>
            {!flows?.length && (
              <button className="fs-btn fs-btn-ai" onClick={() => setAi(true)} type="button">
                <Sparkles /> Build with AI
              </button>
            )}
          </div>
        )}
      </main>

      <input accept="application/json,.json" hidden onChange={e => (e.target.files?.[0] && void importFile(e.target.files[0]), (e.target.value = ''))} ref={importRef} type="file" />

      {picker && <TemplatePicker busy={busy} onClose={() => setPicker(false)} onPick={(name, data) => void start(name, data)} />}
      {ai && (
        <AiBuilder
          onBuild={async (r, built) => {
            const data: BoardData = {...TEMPLATES[0].build(), kind: r.kind, nodes: r.kind === 'mindmap' ? built.nodes : framesFirst(built.nodes), edges: built.edges};
            onOpen(await createBoard(r.title || 'AI board', data));
          }}
          onClose={() => setAi(false)}
        />
      )}
    </div>
  );
}

function TemplatePicker({busy, onPick, onClose}: {busy: string | null; onPick: (name: string, data: BoardData) => void; onClose: () => void}) {
  const items = useMemo(() => TEMPLATES.map(t => ({t, preview: previewOf(t.build())})), []);
  return (
    <div className="fs-modal-back" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="fs-modal fs-templates" role="dialog" aria-label="Templates">
        <header className="fs-modal-head">
          <span className="fs-ai-mark is-plain">
            <LayoutGrid />
          </span>
          <div>
            <h3>Start a board</h3>
            <p>Pick a starting point. You can change everything afterwards.</p>
          </div>
          <button aria-label="Close" className="fs-icon-btn" onClick={onClose} type="button">
            <X />
          </button>
        </header>
        <div className="fs-modal-body">
          {(['whiteboard', 'mindmap'] as const).map(k => (
            <section key={k}>
              <h4>{k === 'whiteboard' ? 'Whiteboards & flowcharts' : 'Mind maps'}</h4>
              <div className="fs-tpl-grid">
                {items
                  .filter(x => x.t.kind === k)
                  .map(({t, preview}) => (
                    <button className="fs-tpl" disabled={!!busy} key={t.key} onClick={() => onPick(t.key === 'blank' ? 'Untitled whiteboard' : t.name, t.build())} type="button">
                      <div className="fs-tpl-prev">{t.key === 'blank' ? <Plus className="fs-tpl-plus" /> : <PreviewSvg preview={preview} />}</div>
                      <b>{t.name}</b>
                      <small>{t.blurb}</small>
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
