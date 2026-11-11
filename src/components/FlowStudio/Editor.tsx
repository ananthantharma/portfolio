/* eslint-disable react-memo/require-memo, react-memo/require-usememo, react/jsx-sort-props, react-hooks/exhaustive-deps */
'use client';

import {
  addEdge,
  Background,
  BackgroundVariant,
  Connection,
  ConnectionLineType,
  ConnectionMode,
  Edge,
  FinalConnectionState,
  MiniMap,
  Node,
  NodeChange,
  NodeToolbar,
  Position,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useViewport,
  ViewportPortal,
} from '@xyflow/react';
import {toBlob, toSvg} from 'html-to-image';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowDownToLine,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpToLine,
  Blend,
  Blocks,
  Bold,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Copy,
  CopyPlus,
  Diamond,
  Download,
  Frame,
  GanttChart,
  GitBranch,
  Group,
  Hand,
  Image as ImageIcon,
  Italic,
  Keyboard,
  Link2,
  ListChecks,
  ListTree,
  Loader2,
  Lock,
  Maximize,
  Minus,
  MousePointer2,
  Paintbrush,
  Palette,
  PanelRight,
  PenLine,
  Play,
  Plus,
  Redo2,
  RotateCw,
  Search,
  Smile,
  Sparkles,
  Square,
  StickyNote,
  Trash2,
  Type,
  Underline,
  Undo2,
  Unlock,
  Upload,
  X,
} from 'lucide-react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {AiBuilder, AiResult} from './ai';
import {BLOCK_BY_KEY, BLOCK_NAMES, BLOCK_TYPES, BlockEditor, BlockGlyph, blockNode, blockNodeTypes, BlockQuickStyle, BLOCKS, BlockType, toDate} from './blocks';
import {layeredLayout, layoutMind, mindInfo} from './layout';
import {
  applyTheme,
  BADGES,
  BoardData,
  BoardKind,
  BoardTheme,
  BRANCH_COLORS,
  CANVASES,
  canvasOf,
  CARD_STATUS,
  cardNode,
  cleanEdges,
  cleanNodes,
  ED,
  FD,
  flowEdge,
  frameNode,
  framesFirst,
  GRADIENT_KEYS,
  GRADIENTS,
  isBoardData,
  isHex,
  LINE_COLORS,
  makePreview,
  mindNode,
  OPG,
  OPG_BRANCHES,
  opgTheme,
  paint,
  PALETTE,
  PALETTE_KEYS,
  PEN_COLORS,
  Settings,
  SHAPE_PATHS,
  SHAPE_SIZE,
  ShapeKind,
  shapeNode,
  SHAPES,
  Side,
  STAMPS,
  STICKY_COLORS,
  stickyNode,
  stickyPaint,
  textNode,
  THEMES,
  toBoard,
  uid,
} from './model';
import {edgeTypes, FONT_CSS, ICON_KEYS, ICONS, nodeTypes, smoothPath, Studio, StudioCtx} from './nodes';

type Tool = 'select' | 'hand' | 'shape' | 'sticky' | 'text' | 'card' | 'frame' | 'pen' | 'stamp';
/** Built-in item types plus the blocks (made once so React Flow keeps them stable). */
const NODE_TYPES = {...nodeTypes, ...blockNodeTypes};
type Menu = {x: number; y: number; flow: {x: number; y: number}; on: 'node' | 'pane' | 'edge'; edgeId?: string};
/** What "copy style" carries from one item to another. */
const STYLE_KEYS = ['fill', 'look', 'ink', 'border', 'textSize', 'font', 'bold', 'italic', 'underline', 'shadow', 'opacity', 'align'] as const;
const TEXT_INKS = ['#1f2430', '#ffffff', '#e5484d', '#f97316', '#16a34a', '#3b82f6', '#7b68ee'];
type Snap = {nodes: Node[]; edges: Edge[]};
type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';

const OPPOSITE: Record<string, Side> = {t: 'b', b: 't', l: 'r', r: 'l'};
const CLIP_PREFIX = 'FLOWSTUDIO:';
const TEXT_TYPES = new Set(['shape', 'sticky', 'text', 'card', 'frame', 'mind', 'timeline', 'gantt', 'chart', 'diagram', 'checklist']);

const read = <T,>(k: string, f: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? f : (JSON.parse(v) as T);
  } catch {
    return f;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // storage unavailable
  }
};
const sizeOf = (n: Node) => ({w: (n.measured?.width ?? n.width ?? 0) as number, h: (n.measured?.height ?? n.height ?? 0) as number});
const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName));
};

/** Shrinks a pasted or dropped picture so boards stay quick to save. */
async function imageToDataUrl(file: File): Promise<{src: string; w: number; h: number}> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 1100 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const png = file.type === 'image/png' && file.size < 350_000;
    return {src: c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85), w: c.width, h: c.height};
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Indented or bulleted text → a tree (for pasting lists into a mind map). */
function parseIndented(text: string): {label: string; children: unknown[]}[] {
  const roots: {label: string; children: unknown[]}[] = [];
  const stack: {indent: number; node: {label: string; children: unknown[]}}[] = [];
  text.split(/\r?\n/).forEach(raw => {
    if (!raw.trim()) return;
    const indent = raw.replace(/\t/g, '    ').match(/^\s*/)![0].length;
    const label = raw.trim().replace(/^([-*•·]|\d+[.)])\s+/, '').slice(0, 120);
    const node = {label, children: [] as unknown[]};
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    if (stack.length) stack[stack.length - 1].node.children.push(node);
    else roots.push(node);
    stack.push({indent, node});
  });
  return roots;
}

export interface EditorProps {
  boardId: string;
  name: string;
  initial: BoardData;
  onBack: () => void;
}

export default function Editor(props: EditorProps) {
  return (
    <ReactFlowProvider>
      <EditorInner {...props} />
    </ReactFlowProvider>
  );
}

function EditorInner({boardId, name: initialName, initial, onBack}: EditorProps) {
  const rf = useReactFlow();
  const kind: BoardKind = initial.kind;
  const isMind = kind === 'mindmap';
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<Node>(isMind ? initial.nodes.map(n => ({...n, type: 'mind'})) : framesFirst(initial.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(isMind ? [] : initial.edges);
  const [settings, setSettingsState] = useState<Settings>(initial.settings);
  const [name, setName] = useState(initialName);
  const [tool, setTool] = useState<Tool>('select');
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rounded');
  const [stickyColor, setStickyColor] = useState('yellow');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penWidth, setPenWidth] = useState(3);
  const [flyout, setFlyout] = useState<null | 'shape' | 'pen' | 'sticky' | 'stamp' | 'blocks'>(null);
  const [stamp, setStamp] = useState(STAMPS[0]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [styleClip, setStyleClip] = useState<Partial<FD> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>('saved');
  const [panel, setPanel] = useState<null | 'search' | 'keys' | 'ai' | 'export' | 'style'>(null);
  const [inspector, setInspector] = useState(true);
  const [presenting, setPresenting] = useState<number | null>(null);
  const [helper, setHelper] = useState<{x?: number; y?: number}>({});
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [layoutNonce, setLayoutNonce] = useState(0);
  const [dirty, setDirty] = useState(0);
  const [readOnly, setReadOnly] = useState(false);
  const [taskDone, setTaskDone] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [, setHist] = useState(0);
  const past = useRef<Snap[]>([]);
  const future = useRef<Snap[]>([]);
  const saving = useRef(false);
  const again = useRef(false);
  const nameRef = useRef(name);
  nameRef.current = name;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => setInspector(read('FS_INSPECTOR', true)), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // ── History & saving ─────────────────────────────────────────────────────
  const touch = useCallback(() => {
    setDirty(d => d + 1);
    setSave('unsaved');
  }, []);
  const snapshot = useCallback(() => {
    past.current.push({nodes: rf.getNodes(), edges: rf.getEdges()});
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    setHist(h => h + 1);
    touch();
  }, [rf, touch]);
  const restore = (from: React.MutableRefObject<Snap[]>, to: React.MutableRefObject<Snap[]>) => {
    const s = from.current.pop();
    if (!s) return;
    to.current.push({nodes: rf.getNodes(), edges: rf.getEdges()});
    setNodes(s.nodes);
    if (!isMind) setEdges(s.edges);
    setEditingId(null);
    setHist(h => h + 1);
    setLayoutNonce(n => n + 1);
    touch();
  };
  const undo = () => restore(past, future);
  const redo = () => restore(future, past);
  const setSettings = (patch: Partial<Settings>) => {
    setSettingsState(s => ({...s, ...patch}));
    touch();
  };

  const persist = useCallback(async () => {
    if (saving.current) {
      again.current = true;
      return;
    }
    saving.current = true;
    setSave('saving');
    try {
      const ns = cleanNodes(rf.getNodes());
      const es = isMind ? [] : cleanEdges(rf.getEdges());
      const data: BoardData = {version: 2, kind, nodes: ns, edges: es, settings: settingsRef.current, viewport: rf.getViewport()};
      const preview = makePreview(rf.getNodes(), es, kind);
      const res = await fetch('/api/process-flow', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: boardId, name: nameRef.current, data, kind, preview})});
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Not saved');
      setSave(again.current ? 'unsaved' : 'saved');
    } catch {
      setSave('error');
    } finally {
      saving.current = false;
      if (again.current) {
        again.current = false;
        void persist();
      }
    }
  }, [boardId, isMind, kind, rf]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => void persist(), 1200);
    return () => clearTimeout(t);
  }, [dirty, persist]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (save !== 'saved') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [save]);

  // Linked tasks: show which are done
  useEffect(() => {
    if (!initial.nodes.some(n => (n.data as FD).taskId)) return;
    fetch('/api/todos')
      .then(r => r.json())
      .then(j => {
        if (!j?.success) return;
        const map: Record<string, boolean> = {};
        (j.data as {_id: string; isCompleted?: boolean; status?: string}[]).forEach(t => (map[t._id] = !!t.isCompleted || t.status === 'done'));
        setTaskDone(map);
      })
      .catch(() => undefined);
  }, []);

  // ── Mind map structure & layout ──────────────────────────────────────────
  const mindSig = isMind ? nodes.map(n => `${n.id}:${(n.data as FD).parent ?? ''}:${(n.data as FD).order ?? 0}:${(n.data as FD).color ?? ''}:${(n.data as FD).collapsed ? 1 : 0}`).join('|') : '';
  const mind = useMemo(() => (isMind ? mindInfo(nodes, settings.layout) : null), [mindSig, settings.layout]);
  const sizeSig = isMind ? nodes.map(n => `${Math.round(n.measured?.width || 0)}x${Math.round(n.measured?.height || 0)}`).join('|') : '';
  const root = mind?.rootId ? nodes.find(n => n.id === mind.rootId) : undefined;
  const rootSig = root ? `${Math.round(root.position.x)},${Math.round(root.position.y)}` : '';
  useEffect(() => {
    if (!isMind || !mind) return;
    setNodes(ns => {
      const boxes = layoutMind(ns, mind, settings.layout);
      let changed = false;
      const next = ns.map(n => {
        const hide = mind.hidden.has(n.id);
        const b = boxes.get(n.id);
        if (n.dragging) return n;
        const moved = b && (Math.abs(n.position.x - b.x) > 0.5 || Math.abs(n.position.y - b.y) > 0.5);
        if (!moved && !!n.hidden === hide) return n;
        changed = true;
        return {...n, hidden: hide, ...(b ? {position: {x: b.x, y: b.y}} : {})};
      });
      return changed ? next : ns;
    });
  }, [mind, sizeSig, settings.layout, layoutNonce, rootSig]);

  const mindEdges = useMemo<Edge[]>(() => {
    if (!mind) return [];
    return Object.keys(mind.parent)
      .filter(id => mind.parent[id] && !mind.hidden.has(id))
      .map(id => {
        const side = mind.side[id];
        const [sh, th] = settings.layout === 'down' ? ['b', 't'] : side === 'l' ? ['l', 'r'] : ['r', 'l'];
        return {id: `me-${id}`, type: 'mind', source: mind.parent[id]!, target: id, sourceHandle: sh, targetHandle: th, selectable: false, focusable: false, data: {color: mind.color[id], width: mind.depth[id] === 1 ? 3 : 2.2}};
      });
  }, [mind, settings.layout]);

  // First view: restore where you left off, else fit the board (as soon as its items have been measured)
  const measured = useNodesInitialized();
  // (an empty board has nothing to fit, and must not jump when its first item is added)
  const fitted = useRef(initial.nodes.length === 0);
  useEffect(() => {
    if (initial.viewport || fitted.current || !measured) return;
    fitted.current = true;
    void rf.fitView({padding: 0.2, maxZoom: 1.1});
    const t = setTimeout(() => void rf.fitView({padding: 0.2, maxZoom: 1.1, duration: 250}), 320);
    return () => clearTimeout(t);
  }, [measured]);
  useEffect(() => {
    if (initial.viewport) return;
    const t1 = setTimeout(() => rf.fitView({padding: 0.2, maxZoom: 1.1}), 80);
    const t2 = setTimeout(() => rf.fitView({padding: 0.2, maxZoom: 1.1, duration: 250}), 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const selectedNodes = nodes.filter(n => n.selected);
  const selectedEdges = isMind ? [] : edges.filter(e => e.selected);
  const dragging = nodes.some(n => n.dragging);
  const absOf = (id: string) => rf.getInternalNode(id)?.internals.positionAbsolute || rf.getNode(id)?.position || {x: 0, y: 0};
  const selectOnly = (id: string) => setNodes(ns => ns.map(n => (n.selected === (n.id === id) ? n : {...n, selected: n.id === id})));
  const centerOfView = () => {
    const r = wrapRef.current?.getBoundingClientRect();
    return rf.screenToFlowPosition({x: (r?.left || 0) + (r?.width || 800) / 2, y: (r?.top || 0) + (r?.height || 600) / 2});
  };
  const frameAt = (p: {x: number; y: number}, skip?: string) =>
    rf
      .getNodes()
      .filter(n => n.type === 'frame' && n.id !== skip)
      .reverse()
      .find(f => {
        const a = absOf(f.id);
        const s = sizeOf(f);
        return p.x >= a.x && p.x <= a.x + s.w && p.y >= a.y && p.y <= a.y + s.h;
      });

  const addNodes = (list: Node[], opts: {edit?: string; edges?: Edge[]} = {}) => {
    snapshot();
    setNodes(ns => framesFirst([...ns.map(n => (n.selected ? {...n, selected: false} : n)), ...list.map(n => ({...n, selected: true}))]));
    if (opts.edges?.length) setEdges(es => [...es, ...opts.edges!]);
    if (opts.edit) setEditingId(opts.edit);
  };

  const startEdit: StudioCtx['startEdit'] = id => {
    if (readOnly) return;
    setEditingId(id);
  };
  const commitText = (id: string, text: string) => {
    setEditingId(null);
    const cur = rf.getNode(id);
    if (!cur || (cur.data as FD).label === text) return;
    snapshot();
    setNodes(ns => ns.map(n => (n.id === id ? {...n, data: {...n.data, label: text}} : n)));
  };
  const updateNodes = (ids: string[], patch: Partial<FD>, extra: Partial<Node> = {}) => {
    snapshot();
    const set = new Set(ids);
    setNodes(ns => ns.map(n => (set.has(n.id) ? {...n, ...extra, data: {...n.data, ...patch}} : n)));
  };
  const updateSelected = (patch: Partial<FD>, extra: Partial<Node> = {}) => updateNodes(rf.getNodes().filter(n => n.selected).map(n => n.id), patch, extra);
  const updateEdges = (patch: ED, extra: Partial<Edge> = {}) => {
    snapshot();
    setEdges(es => es.map(e => (e.selected ? {...e, ...extra, data: {...e.data, ...patch}} : e)));
    const {label: _l, ...rest} = patch;
    if (Object.keys(rest).length) setSettings({edge: {...settingsRef.current.edge, ...rest}});
  };
  /** OPG theme: recolours the selection, or the whole board when nothing is selected. */
  const applyOpg = () => {
    if (readOnly) return;
    const ns = rf.getNodes();
    const es = rf.getEdges();
    if (!ns.length) return setToast('Add something first, then apply the OPG theme');
    const picked = [...ns.filter(n => n.selected).map(n => n.id), ...es.filter(e => e.selected).map(e => e.id)];
    snapshot();
    const out = opgTheme(ns, es, picked.length ? new Set(picked) : undefined);
    setNodes(out.nodes);
    if (!isMind) setEdges(out.edges);
    if (!picked.length) setSettings({edge: {...settingsRef.current.edge, color: OPG.dark}});
    setLayoutNonce(n => n + 1);
    setToast(picked.length ? 'OPG theme applied to the selection' : 'OPG theme applied to the board');
  };
  /** A colour theme: recolours the selection, or the whole board (and its background) when nothing is selected. */
  const applyBoardTheme = (t: BoardTheme) => {
    if (readOnly) return;
    const ns = rf.getNodes();
    const es = rf.getEdges();
    const picked = [...ns.filter(n => n.selected).map(n => n.id), ...es.filter(e => e.selected).map(e => e.id)];
    snapshot();
    const out = applyTheme(t, ns, es, picked.length ? new Set(picked) : undefined);
    setNodes(out.nodes);
    if (!isMind) setEdges(out.edges);
    if (!picked.length) setSettings({edge: {...settingsRef.current.edge, color: t.edge}, ...(t.canvas ? {canvas: t.canvas} : {})});
    setLayoutNonce(n => n + 1);
    setToast(picked.length ? `${t.name} applied to the selection` : `${t.name} applied to the board`);
  };
  /** One style change for every selected item, or everything on the board when nothing is selected. */
  const styleAll = (patch: Partial<FD>, types?: string[]) => {
    if (readOnly) return;
    const some = rf.getNodes().some(n => n.selected);
    snapshot();
    setNodes(ns => ns.map(n => ((!some || n.selected) && (!types || types.includes(n.type || '')) ? {...n, data: {...n.data, ...patch}} : n)));
    setLayoutNonce(n => n + 1);
  };
  const edgesAll = (patch: ED) => {
    if (readOnly) return;
    snapshot();
    setEdges(es => es.map(e => ({...e, data: {...e.data, ...patch}})));
    setSettings({edge: {...settingsRef.current.edge, ...patch}});
  };
  const copyStyle = () => {
    const n = rf.getNodes().find(x => x.selected);
    if (!n) return;
    const d = n.data as FD;
    const clip: Partial<FD> = {};
    STYLE_KEYS.forEach(k => ((clip as Record<string, unknown>)[k] = d[k]));
    // Sticky notes name their colours differently, so carry the actual colour
    if (n.type === 'sticky') clip.fill = stickyPaint(d).bg;
    setStyleClip(clip);
    setToast('Style copied. Select other items and paste it (Ctrl+Alt+V)');
  };
  const pasteStyle = () => {
    if (!styleClip || readOnly) return;
    snapshot();
    setNodes(ns =>
      ns.map(n => {
        if (!n.selected) return n;
        const patch: Partial<FD> = {...styleClip};
        if (n.type === 'sticky' && patch.fill && !isHex(patch.fill) && !STICKY_COLORS[patch.fill]) patch.fill = paint({fill: patch.fill, look: patch.look}).flat;
        if (n.type === 'mind' || n.type === 'draw' || n.type === 'image') {
          delete patch.fill;
          delete patch.look;
        }
        return {...n, data: {...n.data, ...patch}};
      }),
    );
    setLayoutNonce(n => n + 1);
  };
  /** Wraps the selected items in a new section so they move together. */
  const groupSelection = () => {
    if (isMind || readOnly) return;
    const sel = rf.getNodes().filter(n => n.selected && n.type !== 'frame' && !n.parentId);
    if (!sel.length) return setToast('Select the items to group first');
    const b = rf.getNodesBounds(sel);
    const pad = 28;
    const top = 54;
    const f = frameNode(Math.round(b.x - pad), Math.round(b.y - top), 'Group', 'gray', Math.round(b.width + pad * 2), Math.round(b.height + top + pad));
    const ids = new Set(sel.map(n => n.id));
    snapshot();
    setNodes(ns =>
      framesFirst([
        {...f, selected: true},
        ...ns.map(n => (ids.has(n.id) ? {...n, selected: false, parentId: f.id, position: {x: n.position.x - f.position.x, y: n.position.y - f.position.y}} : n.selected ? {...n, selected: false} : n)),
      ]),
    );
    setToast('Grouped. Drag the section to move everything; delete the section to ungroup');
  };
  const reverseEdges = () => {
    snapshot();
    setEdges(es => es.map(e => (e.selected ? {...e, source: e.target, target: e.source, sourceHandle: e.targetHandle, targetHandle: e.sourceHandle} : e)));
  };

  // ── Creating things ──────────────────────────────────────────────────────
  const createAt = (t: Tool, p: {x: number; y: number}, shape: ShapeKind = shapeKind) => {
    let n: Node | null = null;
    const snapV = (v: number) => (settings.snap ? Math.round(v / 20) * 20 : Math.round(v));
    if (t === 'shape') {
      const [w, h] = SHAPE_SIZE[shape] || [200, 72];
      const fills: Partial<Record<ShapeKind, string>> = {diamond: 'purple', pill: 'dark', cylinder: 'teal', star: 'yellow', heart: 'pink', cloud: 'sky', octagon: 'red', callout: 'white', chevron: 'indigo', arrow: 'orange', shield: 'green'};
      n = shapeNode(snapV(p.x - w / 2), snapV(p.y - h / 2), '', {shape, fill: fills[shape] || 'blue', ...(shape === 'callout' ? {border: 'solid' as const} : {})}, w, h);
    } else if (t === 'stamp') {
      // Stickers keep the tool, so you can drop several in a row
      addNodes([{...textNode(snapV(p.x - 30), snapV(p.y - 32), stamp, '2xl'), width: 66}]);
      return;
    } else if (t === 'sticky') n = stickyNode(snapV(p.x - 90), snapV(p.y - 85), '', stickyColor);
    else if (t === 'text') n = textNode(snapV(p.x - 10), snapV(p.y - 20), '');
    else if (t === 'card') n = cardNode(snapV(p.x - 125), snapV(p.y - 50), '');
    else if (t === 'frame') n = frameNode(snapV(p.x - 320), snapV(p.y - 210), `Section ${rf.getNodes().filter(x => x.type === 'frame').length + 1}`);
    if (!n) return;
    if (n.type !== 'frame') {
      const f = frameAt(p);
      if (f) {
        const a = absOf(f.id);
        n = {...n, parentId: f.id, position: {x: n.position.x - a.x, y: n.position.y - a.y}};
      }
    }
    addNodes([n], {edit: n.id});
    setTool('select');
    setFlyout(null);
  };

  /** Adds a timeline, chart, table or diagram and opens its details so the entries can be filled in. */
  const insertBlock = (key: string, p: {x: number; y: number} = centerOfView(), extra: Partial<FD> = {}) => {
    if (isMind || readOnly) return;
    let n = blockNode(key, p.x, p.y, extra);
    const f = frameAt(p);
    if (f) {
      const a = absOf(f.id);
      n = {...n, parentId: f.id, position: {x: n.position.x - a.x, y: n.position.y - a.y}};
    }
    addNodes([n]);
    setTool('select');
    setFlyout(null);
    if (!inspector) {
      setInspector(true);
      write('FS_INSPECTOR', true);
    }
  };
  /** Turns the selected boxes, cards and notes into one block (left to right, or top to bottom). */
  const selectionToBlock = (key: 'timeline-line' | 'gantt' | 'checklist' | 'diagram-process') => {
    const sel = rf.getNodes().filter(n => n.selected && (n.data as FD).label && !BLOCK_TYPES.has(n.type || '') && n.type !== 'frame');
    if (sel.length < 2) return setToast('Select two or more items that have text');
    const b = rf.getNodesBounds(sel);
    const across = b.width >= b.height;
    const sorted = [...sel].sort((x, y) => (across ? absOf(x.id).x - absOf(y.id).x : absOf(x.id).y - absOf(y.id).y));
    const items = sorted.map(n => {
      const d = n.data as FD;
      const due = d.due && toDate(d.due) ? d.due : undefined;
      return {id: uid('b'), label: String(d.label).split('\n')[0].slice(0, 80), note: String(d.label).split('\n').slice(1).join(' ').slice(0, 120) || undefined, date: due, ...(key === 'checklist' ? {done: d.status === 'done'} : {}), ...(key === 'gantt' && due ? {end: due} : {})};
    });
    const spec = BLOCK_BY_KEY[key];
    const dated = items.filter(i => i.date).length >= 2;
    insertBlock(key, {x: b.x + Math.max(b.width, spec.w) / 2, y: b.y + b.height + 60 + (spec.h || 200) / 2}, {items, label: '', ...(key === 'timeline-line' ? {spacing: dated ? 'date' : 'even', today: dated} : {})});
    setToast(`Made a ${BLOCK_NAMES[spec.type].toLowerCase()} from ${items.length} items. The originals are still there`);
  };

  const insertImage = async (file: File, at?: {x: number; y: number}) => {
    try {
      const {src, w, h} = await imageToDataUrl(file);
      const width = Math.min(420, w);
      const height = Math.round((h / w) * width);
      const p = at || centerOfView();
      addNodes([{id: uid('i'), type: 'image', position: {x: p.x - width / 2, y: p.y - height / 2}, width, height, data: {src, label: file.name}}]);
    } catch {
      setToast('That picture could not be added');
    }
  };

  // Quick add: a connected box in a direction (the arrows around a selected shape)
  const quickAdd = (fromId: string, side: Side) => {
    const from = rf.getNode(fromId);
    if (!from) return;
    const a = absOf(fromId);
    const s = sizeOf(from);
    const d = from.data as FD;
    const w = (from.width as number) || s.w || 200;
    const h = (from.height as number) || s.h || 72;
    const gap = 90;
    const pos = {t: {x: a.x, y: a.y - h - gap}, b: {x: a.x, y: a.y + s.h + gap}, l: {x: a.x - w - gap, y: a.y}, r: {x: a.x + s.w + gap, y: a.y}}[side];
    const n = from.type === 'shape' ? shapeNode(pos.x, pos.y, '', {shape: d.shape === 'diamond' || d.shape === 'pill' ? 'rounded' : d.shape, fill: d.shape === 'diamond' || d.shape === 'pill' ? 'blue' : d.fill, border: d.border}, w, h) : from.type === 'sticky' ? stickyNode(pos.x, pos.y, '', d.fill) : from.type === 'card' ? cardNode(pos.x, pos.y, '', {fill: d.fill}) : shapeNode(pos.x, pos.y, '');
    addNodes([n], {edit: n.id, edges: [flowEdge(fromId, n.id, {...settingsRef.current.edge, label: ''}, side, OPPOSITE[side])]});
  };

  // ── Mind map actions ─────────────────────────────────────────────────────
  const addMindChild = (pid: string) => {
    if (!mind || readOnly) return;
    const kids = mind.kids[pid] || [];
    const maxOrder = kids.reduce((m, k) => Math.max(m, Number((rf.getNode(k)?.data as FD)?.order ?? 0)), -1);
    const extra: Partial<FD> = pid === mind.rootId ? {color: BRANCH_COLORS[kids.length % BRANCH_COLORS.length]} : {};
    const n = mindNode('', pid, maxOrder + 1, extra);
    if ((rf.getNode(pid)?.data as FD)?.collapsed) setNodes(ns => ns.map(x => (x.id === pid ? {...x, data: {...x.data, collapsed: false}} : x)));
    addNodes([n], {edit: n.id});
  };
  const addMindSibling = (id: string) => {
    if (!mind) return;
    const p = mind.parent[id];
    if (!p) return addMindChild(id);
    const order = Number((rf.getNode(id)?.data as FD)?.order ?? 0);
    const kids = mind.kids[p] || [];
    const extra: Partial<FD> = p === mind.rootId ? {color: BRANCH_COLORS[kids.length % BRANCH_COLORS.length]} : {};
    const n = mindNode('', p, order + 0.5, extra);
    snapshot();
    setNodes(ns => {
      const next = [...ns.map(x => (x.selected ? {...x, selected: false} : x)), {...n, selected: true}];
      // Renumber the siblings so the order stays whole numbers
      const sibs = next.filter(x => (x.data as FD).parent === p).sort((a, b) => Number((a.data as FD).order ?? 0) - Number((b.data as FD).order ?? 0));
      const ord = new Map(sibs.map((x, i) => [x.id, i]));
      return next.map(x => (ord.has(x.id) ? {...x, data: {...x.data, order: ord.get(x.id)}} : x));
    });
    setEditingId(n.id);
  };
  const toggleCollapse = (id: string) => {
    const n = rf.getNode(id);
    if (!n) return;
    updateNodes([id], {collapsed: !(n.data as FD).collapsed});
  };
  const setAllCollapsed = (collapsed: boolean) => {
    if (!mind) return;
    snapshot();
    setNodes(ns => ns.map(n => (mind.kids[n.id]?.length && n.id !== mind.rootId ? {...n, data: {...n.data, collapsed}} : collapsed ? n : {...n, data: {...n.data, collapsed: false}})));
  };
  const descendantsOf = (id: string) => {
    const out = new Set<string>();
    const walk = (x: string): void =>
      (mind?.kids[x] || []).forEach(k => {
        out.add(k);
        walk(k);
      });
    walk(id);
    return out;
  };

  // ── Arrange, align, order ────────────────────────────────────────────────
  const autoArrange = (dir: 'TB' | 'LR') => {
    const all = rf.getNodes();
    const sel = all.filter(n => n.selected && !n.parentId && n.type !== 'frame' && n.type !== 'draw');
    const targets = sel.length > 1 ? sel : all.filter(n => !n.parentId && n.type !== 'frame' && n.type !== 'draw' && n.type !== 'image');
    if (targets.length < 2) return setToast('Add a few boxes first');
    const minX = Math.min(...targets.map(n => n.position.x));
    const minY = Math.min(...targets.map(n => n.position.y));
    const pos = layeredLayout(targets, rf.getEdges(), dir, {x: minX, y: minY});
    const ids = new Set(targets.map(n => n.id));
    snapshot();
    setNodes(ns => ns.map(n => (pos.has(n.id) ? {...n, position: pos.get(n.id)!} : n)));
    setEdges(es =>
      es.map(e => {
        if (!ids.has(e.source) || !ids.has(e.target)) return e;
        const a = pos.get(e.source)!;
        const b = pos.get(e.target)!;
        const forward = dir === 'TB' ? b.y > a.y + 10 : b.x > a.x + 10;
        const [s, t]: [Side, Side] = forward ? (dir === 'TB' ? ['b', 't'] : ['r', 'l']) : dir === 'TB' ? ['r', 'r'] : ['b', 'b'];
        return {...e, sourceHandle: s, targetHandle: t};
      }),
    );
    setTimeout(() => rf.fitView({padding: 0.2, duration: 400, maxZoom: 1.1}), 60);
  };

  const align = (how: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom' | 'dist-h' | 'dist-v') => {
    const sel = rf.getNodes().filter(n => n.selected);
    if (sel.length < 2) return;
    const parent = sel[0].parentId;
    const group = sel.filter(n => n.parentId === parent);
    const box = group.map(n => ({n, x: n.position.x, y: n.position.y, ...sizeOf(n)}));
    const minX = Math.min(...box.map(b => b.x));
    const maxX = Math.max(...box.map(b => b.x + b.w));
    const minY = Math.min(...box.map(b => b.y));
    const maxY = Math.max(...box.map(b => b.y + b.h));
    const pos = new Map<string, {x: number; y: number}>();
    if (how === 'dist-h' || how === 'dist-v') {
      const h = how === 'dist-h';
      const sorted = [...box].sort((a, b) => (h ? a.x - b.x : a.y - b.y));
      const total = sorted.reduce((s, b) => s + (h ? b.w : b.h), 0);
      const gap = ((h ? maxX - minX : maxY - minY) - total) / Math.max(1, sorted.length - 1);
      let cur = h ? minX : minY;
      sorted.forEach(b => {
        pos.set(b.n.id, h ? {x: cur, y: b.y} : {x: b.x, y: cur});
        cur += (h ? b.w : b.h) + gap;
      });
    } else
      box.forEach(b =>
        pos.set(b.n.id, {
          x: how === 'left' ? minX : how === 'right' ? maxX - b.w : how === 'hcenter' ? (minX + maxX) / 2 - b.w / 2 : b.x,
          y: how === 'top' ? minY : how === 'bottom' ? maxY - b.h : how === 'vcenter' ? (minY + maxY) / 2 - b.h / 2 : b.y,
        }),
      );
    snapshot();
    setNodes(ns => ns.map(n => (pos.has(n.id) ? {...n, position: pos.get(n.id)!} : n)));
  };

  const reorder = (front: boolean) => {
    snapshot();
    setNodes(ns => {
      const sel = ns.filter(n => n.selected);
      const rest = ns.filter(n => !n.selected);
      return framesFirst(front ? [...rest, ...sel] : [...sel, ...rest]);
    });
  };

  const duplicate = () => {
    if (isMind) return;
    const sel = rf.getNodes().filter(n => n.selected);
    if (!sel.length) return;
    const ids = new Set(sel.map(n => n.id));
    // Duplicating a section brings its contents along
    rf.getNodes().forEach(n => n.parentId && ids.has(n.parentId) && (sel.push(n), ids.add(n.id)));
    pasteNodes(cleanNodes(sel), cleanEdges(rf.getEdges().filter(e => ids.has(e.source) && ids.has(e.target))), {x: 36, y: 36});
  };

  const pasteNodes = (list: Node[], es: Edge[], offset: {x: number; y: number} | 'center') => {
    if (!list.length) return;
    const map = new Map(list.map(n => [n.id, uid(n.type === 'frame' ? 'f' : 'n')]));
    let dx = 0;
    let dy = 0;
    if (offset === 'center') {
      const tops = list.filter(n => !n.parentId || !map.has(n.parentId));
      const c = centerOfView();
      const minX = Math.min(...tops.map(n => n.position.x));
      const minY = Math.min(...tops.map(n => n.position.y));
      dx = c.x - minX - 100;
      dy = c.y - minY - 60;
    } else {
      dx = offset.x;
      dy = offset.y;
    }
    const existing = new Set(rf.getNodes().map(n => n.id));
    const copies = list.map(n => {
      const inside = n.parentId && map.has(n.parentId);
      const keepParent = n.parentId && !inside && existing.has(n.parentId);
      const {parentId: _p, ...rest} = n;
      return {
        ...rest,
        id: map.get(n.id)!,
        ...(inside ? {parentId: map.get(n.parentId!)} : keepParent ? {parentId: n.parentId} : {}),
        position: inside ? n.position : {x: n.position.x + dx, y: n.position.y + dy},
        data: {...n.data, taskId: undefined},
      } as Node;
    });
    const edgeCopies = es.filter(e => map.has(e.source) && map.has(e.target)).map(e => ({...e, id: uid('e'), source: map.get(e.source)!, target: map.get(e.target)!, selected: false}));
    addNodes(copies, {edges: edgeCopies});
  };

  // ── Building from AI ─────────────────────────────────────────────────────
  const outlineText = () => {
    const ns = rf.getNodes();
    if (isMind && mind?.rootId) {
      const lines: string[] = [];
      const walk = (id: string, d: number) => {
        lines.push(`${'  '.repeat(d)}- ${(rf.getNode(id)?.data as FD)?.label || ''}`);
        (mind.kids[id] || []).forEach(k => walk(k, d + 1));
      };
      walk(mind.rootId, 0);
      return lines.join('\n');
    }
    return ns
      .filter(n => (n.data as FD).label)
      .map(n => `- ${(n.data as FD).label}`)
      .join('\n');
  };
  const applyAi = (r: AiResult, built: {nodes: Node[]; edges: Edge[]}, mode: 'add' | 'replace') => {
    if (r.kind !== kind) throw new Error('That draft is a different kind of board.');
    snapshot();
    if (isMind) {
      if (mode === 'replace' || !mind?.rootId) {
        const rootPos = root?.position || {x: 0, y: 0};
        setNodes(built.nodes.map(n => (n.data as FD).parent ? n : {...n, position: rootPos}));
      } else {
        // New branches under the selected idea (or the centre)
        const target = rf.getNodes().find(n => n.selected)?.id || mind.rootId;
        const aiRoot = built.nodes.find(n => !(n.data as FD).parent)!;
        const kidsBase = (mind.kids[target] || []).length;
        const toRoot = target === mind.rootId;
        const firstLevel = built.nodes.filter(n => (n.data as FD).parent === aiRoot.id);
        const add = built.nodes
          .filter(n => n.id !== aiRoot.id)
          .map(n => {
            const isFirst = (n.data as FD).parent === aiRoot.id;
            const i = firstLevel.indexOf(n);
            const data: FD = {...(n.data as FD), ...(isFirst ? {parent: target, order: kidsBase + i} : {})};
            if (isFirst && toRoot) data.color = BRANCH_COLORS[(kidsBase + i) % BRANCH_COLORS.length];
            else if (!toRoot || !isFirst) delete data.color;
            return {...n, data};
          });
        setNodes(ns => [...ns.map(n => (n.id === target ? {...n, data: {...n.data, collapsed: false}} : n)), ...add]);
      }
    } else if (mode === 'replace') {
      setNodes(built.nodes);
      setEdges(built.edges);
    } else {
      const ns = rf.getNodes();
      const right = ns.length ? Math.max(...ns.map(n => absOf(n.id).x + sizeOf(n).w)) + 160 : 0;
      const top = ns.length ? Math.min(...ns.map(n => absOf(n.id).y)) : 0;
      const moved = built.nodes.map(n => (n.parentId ? n : {...n, position: {x: n.position.x + right, y: n.position.y + top}}));
      setNodes(cur => framesFirst([...cur.map(n => (n.selected ? {...n, selected: false} : n)), ...moved]));
      setEdges(cur => [...cur, ...built.edges]);
    }
    setPanel(null);
    setToast(`Built “${r.title}”`);
    // New boxes need a moment to be measured before the view can fit them
    [300, 800].forEach(ms => setTimeout(() => rf.fitView({padding: 0.18, duration: 450, maxZoom: 1.1}), ms));
  };

  // ── Export / import ──────────────────────────────────────────────────────
  const download = (href: string, file: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = file;
    a.click();
  };
  const safeName = () => (name || 'board').replace(/[^\w\- ]+/g, '').trim() || 'board';
  const exportImage = async (fmt: 'png' | 'svg' | 'copy') => {
    setPanel(null);
    const ns = rf.getNodes().filter(n => !n.hidden);
    if (!ns.length) return setToast('Nothing to export yet');
    const prevSel = ns.filter(n => n.selected).map(n => n.id);
    setNodes(all => all.map(n => (n.selected ? {...n, selected: false} : n)));
    setEdges(all => all.map(e => (e.selected ? {...e, selected: false} : e)));
    await new Promise(r => setTimeout(r, 60));
    const b = rf.getNodesBounds(ns);
    const pad = 56;
    const W = Math.ceil(b.width + pad * 2);
    const H = Math.ceil(b.height + pad * 2);
    const el = wrapRef.current?.querySelector('.react-flow__viewport') as HTMLElement | null;
    if (!el) return;
    const opts = {
      backgroundColor: settings.canvas && settings.canvas !== 'light' ? canvasOf(settings.canvas).bg : '#ffffff',
      width: W,
      height: H,
      pixelRatio: Math.max(1, Math.min(2, 7000 / Math.max(W, H))),
      style: {width: `${W}px`, height: `${H}px`, transform: `translate(${pad - b.x}px, ${pad - b.y}px) scale(1)`},
      filter: (node: HTMLElement) => !node.classList || !['react-flow__handle', 'react-flow__resize-control', 'fs-mind-add', 'fs-quick'].some(c => node.classList.contains(c)),
    };
    try {
      if (fmt === 'svg') download(await toSvg(el, opts), `${safeName()}.svg`);
      else {
        const blob = await toBlob(el, opts);
        if (!blob) throw new Error('empty');
        if (fmt === 'copy') {
          await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
          setToast('Image copied. Paste it into an email or doc');
        } else {
          const url = URL.createObjectURL(blob);
          download(url, `${safeName()}.png`);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        }
      }
    } catch {
      setToast('Export failed. Try PNG instead');
    } finally {
      if (prevSel.length) setNodes(all => all.map(n => (prevSel.includes(n.id) ? {...n, selected: true} : n)));
    }
  };
  const exportJson = () => {
    setPanel(null);
    const data: BoardData = {version: 2, kind, nodes: cleanNodes(rf.getNodes()), edges: isMind ? [] : cleanEdges(rf.getEdges()), settings};
    const url = URL.createObjectURL(new Blob([JSON.stringify({name, ...data}, null, 2)], {type: 'application/json'}));
    download(url, `${safeName()}.json`);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const importJson = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text());
      const b = toBoard(raw, isBoardData(raw) ? raw.kind : 'whiteboard');
      if (b.kind !== kind) return setToast(`That file is a ${b.kind === 'mindmap' ? 'mind map' : 'whiteboard'}. Import it from the boards page`);
      snapshot();
      setNodes(isMind ? b.nodes : framesFirst(b.nodes));
      if (!isMind) setEdges(b.edges);
      setTimeout(() => rf.fitView({padding: 0.2, duration: 400}), 80);
      setToast('Imported');
    } catch {
      setToast('That file could not be read');
    }
  };

  // ── Presenting (walk through the sections) ───────────────────────────────
  const slides = useMemo(() => {
    const frames = nodes.filter(n => n.type === 'frame');
    return frames.sort((a, b) => Math.round(a.position.y / 250) - Math.round(b.position.y / 250) || a.position.x - b.position.x).map(f => f.id);
  }, [nodes.length, presenting]);
  useEffect(() => {
    if (presenting === null) return;
    if (slides.length) rf.fitView({nodes: [{id: slides[presenting]}], padding: 0.08, duration: 550});
    else rf.fitView({padding: 0.12, duration: 550});
  }, [presenting]);
  const present = () => {
    setPanel(null);
    setEditingId(null);
    setNodes(ns => ns.map(n => (n.selected ? {...n, selected: false} : n)));
    setPresenting(0);
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  };
  const stopPresenting = () => {
    setPresenting(null);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
  };

  // ── Search ───────────────────────────────────────────────────────────────
  const focusNode = (id: string) => {
    if (isMind && mind) {
      const anc: string[] = [];
      let p = mind.parent[id];
      while (p) {
        anc.push(p);
        p = mind.parent[p];
      }
      if (anc.some(a => (rf.getNode(a)?.data as FD)?.collapsed)) setNodes(ns => ns.map(n => (anc.includes(n.id) ? {...n, data: {...n.data, collapsed: false}} : n)));
    }
    selectOnly(id);
    setTimeout(() => rf.fitView({nodes: [{id}], duration: 450, maxZoom: 1.25, padding: 0.8}), 60);
  };

  // ── Keyboard, clipboard ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (presenting !== null) {
        if (['arrowright', 'arrowdown', ' ', 'pagedown'].includes(k)) setPresenting(i => Math.min((i ?? 0) + 1, Math.max(0, slides.length - 1)));
        else if (['arrowleft', 'arrowup', 'pageup'].includes(k)) setPresenting(i => Math.max(0, (i ?? 0) - 1));
        else if (k === 'escape') stopPresenting();
        e.preventDefault();
        return;
      }
      if (panel === 'ai') return;
      if (mod && k === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && k === 'y') return e.preventDefault(), redo();
      if (mod && k === 's') return e.preventDefault(), void persist();
      if (mod && k === 'f') return e.preventDefault(), setPanel('search');
      if (mod && k === 'd') return e.preventDefault(), duplicate();
      if (mod && k === 'g') return e.preventDefault(), groupSelection();
      if (mod && e.altKey && k === 'c') return e.preventDefault(), copyStyle();
      if (mod && e.altKey && k === 'v') return e.preventDefault(), pasteStyle();
      if (mod && k === 'a') {
        e.preventDefault();
        return setNodes(ns => ns.map(n => (n.hidden || n.selected ? n : {...n, selected: true})));
      }
      if (mod && (k === '=' || k === '+')) return e.preventDefault(), rf.zoomIn({duration: 150});
      if (mod && k === '-') return e.preventDefault(), rf.zoomOut({duration: 150});
      if (mod && k === '0') return e.preventDefault(), rf.zoomTo(1, {duration: 150});
      if (mod || e.altKey) return;
      if (k === 'escape') {
        setTool('select');
        setFlyout(null);
        setPanel(null);
        setMenu(null);
        setNodes(ns => ns.map(n => (n.selected ? {...n, selected: false} : n)));
        setEdges(es => es.map(x => (x.selected ? {...x, selected: false} : x)));
        return;
      }
      if (e.key === '!' || (e.shiftKey && k === '1')) return rf.fitView({padding: 0.15, duration: 300});
      if (e.key === '?') return setPanel(p => (p === 'keys' ? null : 'keys'));
      const sel = rf.getNodes().filter(n => n.selected);
      const one = sel.length === 1 ? sel[0] : null;
      if (readOnly) return;

      if (isMind && mind) {
        if (one) {
          if (k === 'tab') return e.preventDefault(), addMindChild(one.id);
          if (k === 'enter') return e.preventDefault(), addMindSibling(one.id);
          if (k === 'f2' || k === ' ') return e.preventDefault(), startEdit(one.id);
          const side = mind.side[one.id];
          const down = settings.layout === 'down';
          const toChild = () => {
            const kids = mind.kids[one.id] || [];
            if (!kids.length) return;
            if ((one.data as FD).collapsed) toggleCollapse(one.id);
            selectOnly(kids[Math.floor((kids.length - 1) / 2)]);
          };
          const toParent = () => mind.parent[one.id] && selectOnly(mind.parent[one.id]!);
          const toSibling = (dir: 1 | -1) => {
            const p = mind.parent[one.id];
            if (!p) {
              // From the centre, step into a branch on that side
              return;
            }
            const sibs = mind.kids[p] || [];
            const i = sibs.indexOf(one.id) + dir;
            if (i >= 0 && i < sibs.length) selectOnly(sibs[i]);
          };
          const map: Record<string, () => void> = down
            ? {arrowdown: toChild, arrowup: toParent, arrowleft: () => toSibling(-1), arrowright: () => toSibling(1)}
            : side === 'l' && one.id !== mind.rootId
            ? {arrowleft: toChild, arrowright: toParent, arrowup: () => toSibling(-1), arrowdown: () => toSibling(1)}
            : {arrowright: toChild, arrowleft: one.id === mind.rootId ? () => {
                const l = (mind.kids[one.id] || []).find(x => mind.side[x] === 'l');
                if (l) selectOnly(l);
              } : toParent, arrowup: () => toSibling(-1), arrowdown: () => toSibling(1)};
          if (map[k]) return e.preventDefault(), map[k]();
          if (e.key.length === 1 && !e.repeat) {
            e.preventDefault();
            setEditSeed(e.key);
            return startEdit(one.id);
          }
        } else if (k === 'tab' && mind.rootId) return e.preventDefault(), selectOnly(mind.rootId);
        return;
      }

      if (one && (k === 'enter' || k === 'f2') && TEXT_TYPES.has(one.type || '')) return e.preventDefault(), startEdit(one.id);
      if (sel.length && (k === ']' || k === '[')) return e.preventDefault(), reorder(k === ']');
      if (sel.length && k.startsWith('arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 20 : 2;
        const d = {arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step]}[k] || [0, 0];
        snapshot();
        return setNodes(ns => ns.map(n => (n.selected && !(n.data as FD).locked ? {...n, position: {x: n.position.x + d[0], y: n.position.y + d[1]}} : n)));
      }
      const tools: Record<string, () => void> = {
        v: () => setTool('select'),
        h: () => setTool('hand'),
        r: () => (setShapeKind('rounded'), setTool('shape')),
        o: () => (setShapeKind('ellipse'), setTool('shape')),
        d: () => (setShapeKind('diamond'), setTool('shape')),
        s: () => setTool('sticky'),
        t: () => setTool('text'),
        c: () => setTool('card'),
        f: () => setTool('frame'),
        p: () => setTool('pen'),
        b: () => setFlyout(f => (f === 'blocks' ? null : 'blocks')),
      };
      if (tools[k]) {
        e.preventDefault();
        tools[k]();
      } else if (one && e.key.length === 1 && TEXT_TYPES.has(one.type || '') && !e.repeat) {
        e.preventDefault();
        setEditSeed(e.key);
        startEdit(one.id);
      }
    };
    const onCopy = (e: ClipboardEvent) => {
      if (isTyping(e.target) || isTyping(document.activeElement)) return;
      const sel = rf.getNodes().filter(n => n.selected);
      if (!sel.length) return;
      const ids = new Set(sel.map(n => n.id));
      rf.getNodes().forEach(n => n.parentId && ids.has(n.parentId) && !ids.has(n.id) && (sel.push(n), ids.add(n.id)));
      if (isMind) sel.forEach(n => descendantsOf(n.id).forEach(d => !ids.has(d) && (ids.add(d), sel.push(rf.getNode(d)!))));
      const payload = {kind, nodes: cleanNodes(sel), edges: isMind ? [] : cleanEdges(rf.getEdges().filter(x => ids.has(x.source) && ids.has(x.target)))};
      e.clipboardData?.setData('text/plain', CLIP_PREFIX + JSON.stringify(payload));
      e.preventDefault();
      if (e.type === 'cut' && !readOnly) void rf.deleteElements({nodes: sel.filter(n => !isMind || n.id !== mind?.rootId)});
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target) || isTyping(document.activeElement) || readOnly || presenting !== null) return;
      const file = [...(e.clipboardData?.files || [])].find(f => f.type.startsWith('image/'));
      if (file && !isMind) {
        e.preventDefault();
        return void insertImage(file);
      }
      const text = e.clipboardData?.getData('text/plain') || '';
      if (!text.trim()) return;
      e.preventDefault();
      if (text.startsWith(CLIP_PREFIX)) {
        try {
          const p = JSON.parse(text.slice(CLIP_PREFIX.length)) as {kind: BoardKind; nodes: Node[]; edges: Edge[]};
          if (isMind) {
            if (p.kind !== 'mindmap' || !mind?.rootId) return;
            const target = rf.getNodes().find(n => n.selected)?.id || mind.rootId;
            const map = new Map(p.nodes.map(n => [n.id, uid('m')]));
            const tops = p.nodes.filter(n => !map.has(String((n.data as FD).parent)));
            const base = (mind.kids[target] || []).length;
            const copies = p.nodes.map(n => {
              const top = tops.includes(n);
              const data = {...(n.data as FD), parent: top ? target : map.get(String((n.data as FD).parent))!, ...(top ? {order: base + tops.indexOf(n)} : {})};
              if (top && target !== mind.rootId) delete data.color;
              if (top && target === mind.rootId) data.color = BRANCH_COLORS[(base + tops.indexOf(n)) % BRANCH_COLORS.length];
              return {...n, id: map.get(n.id)!, data, position: {x: 0, y: 0}};
            });
            return addNodes(copies);
          }
          if (p.kind === 'mindmap') return setToast('Mind map ideas can only be pasted into a mind map');
          return pasteNodes(p.nodes, p.edges, 'center');
        } catch {
          return;
        }
      }
      // Plain text: lists become branches in a mind map, notes on a whiteboard
      if (isMind && mind?.rootId) {
        const target = rf.getNodes().find(n => n.selected)?.id || mind.rootId;
        const tree = parseIndented(text);
        const base = (mind.kids[target] || []).length;
        const out: Node[] = [];
        const walk = (t: {label: string; children: unknown[]}, parent: string, order: number, color?: string) => {
          const n = mindNode(t.label, parent, order, color ? {color} : {});
          out.push(n);
          t.children.forEach((c, i) => walk(c as typeof t, n.id, i));
        };
        tree.forEach((t, i) => walk(t, target, base + i, target === mind.rootId ? BRANCH_COLORS[(base + i) % BRANCH_COLORS.length] : undefined));
        return addNodes(out);
      }
      const lines = text.split(/\r?\n/).map(l => l.trim().replace(/^([-*•·]|\d+[.)])\s+/, '')).filter(Boolean);
      const c = centerOfView();
      if (lines.length > 1 && lines.length <= 30 && lines.every(l => l.length <= 90)) {
        const cols = Math.min(5, Math.ceil(Math.sqrt(lines.length)));
        return addNodes(lines.map((l, i) => stickyNode(c.x - (cols * 200) / 2 + (i % cols) * 200, c.y - 100 + Math.floor(i / cols) * 190, l, stickyColor)));
      }
      const n = text.length > 140 ? textNode(c.x - 160, c.y - 40, text.slice(0, 4000), 'md') : stickyNode(c.x - 90, c.y - 85, text, stickyColor);
      if (n.type === 'text') n.width = 360;
      addNodes([n]);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('copy', onCopy);
    window.addEventListener('cut', onCopy);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('copy', onCopy);
      window.removeEventListener('cut', onCopy);
      window.removeEventListener('paste', onPaste);
    };
  });

  const [editSeed, setEditSeed] = useState<string | null>(null);
  useEffect(() => {
    if (!editingId || editSeed === null) return;
    // Typing on a selected item starts editing with that letter
    const t = setTimeout(() => {
      const el = document.querySelector('.fs-editing') as HTMLElement | null;
      if (el) {
        el.innerText = editSeed;
        const r = document.createRange();
        r.selectNodeContents(el);
        r.collapse(false);
        const s = window.getSelection();
        s?.removeAllRanges();
        s?.addRange(r);
      }
      setEditSeed(null);
    }, 0);
    return () => clearTimeout(t);
  }, [editingId, editSeed]);

  // ── React Flow handlers ──────────────────────────────────────────────────
  const onNodesChange = (changes: NodeChange[]) => {
    let list = changes;
    if (readOnly || presenting !== null) list = list.filter(c => c.type === 'select' || c.type === 'dimensions');
    if (isMind && mind?.rootId) {
      const extra: NodeChange[] = [];
      for (const c of list) {
        if (c.type === 'position' && c.id === mind.rootId && c.position && c.dragging) {
          const cur = rf.getNode(c.id);
          if (!cur) continue;
          const dx = c.position.x - cur.position.x;
          const dy = c.position.y - cur.position.y;
          if (dx || dy) rf.getNodes().forEach(n => n.id !== c.id && extra.push({type: 'position', id: n.id, position: {x: n.position.x + dx, y: n.position.y + dy}}));
        }
      }
      list = [...list, ...extra];
    } else if (list.length === 1 && list[0].type === 'position' && list[0].dragging && list[0].position) {
      const c = list[0];
      const n = rf.getNode(c.id);
      if (n && !n.parentId) {
        const {w, h} = sizeOf(n);
        const th = 6 / rf.getZoom();
        let bx = {d: th, line: undefined as number | undefined, pos: 0};
        let by = {d: th, line: undefined as number | undefined, pos: 0};
        const p = c.position!;
        for (const o of rf.getNodes()) {
          if (o.id === c.id || o.parentId || o.hidden || o.type === 'draw' || o.selected) continue;
          const s = sizeOf(o);
          for (const [v, off] of [[p.x, 0], [p.x + w / 2, w / 2], [p.x + w, w]] as const)
            for (const t of [o.position.x, o.position.x + s.w / 2, o.position.x + s.w]) if (Math.abs(v - t) < bx.d) bx = {d: Math.abs(v - t), line: t, pos: t - off};
          for (const [v, off] of [[p.y, 0], [p.y + h / 2, h / 2], [p.y + h, h]] as const)
            for (const t of [o.position.y, o.position.y + s.h / 2, o.position.y + s.h]) if (Math.abs(v - t) < by.d) by = {d: Math.abs(v - t), line: t, pos: t - off};
        }
        if (bx.line !== undefined) p.x = bx.pos;
        if (by.line !== undefined) p.y = by.pos;
        if (helper.x !== bx.line || helper.y !== by.line) setHelper({x: bx.line, y: by.line});
      }
    }
    onNodesChangeBase(list);
  };

  const onNodeDragStop = (_: unknown, node: Node, dragged: Node[]) => {
    setHelper({});
    if (isMind && mind) {
      const target = dropTarget;
      setDropTarget(null);
      if (target && target !== node.id && node.id !== mind.rootId) {
        const kids = mind.kids[target] || [];
        setNodes(ns =>
          ns.map(n => {
            if (n.id !== node.id) return n;
            const data: FD = {...(n.data as FD), parent: target, order: kids.length};
            if (target === mind.rootId) data.color = BRANCH_COLORS[kids.length % BRANCH_COLORS.length];
            else delete data.color;
            return {...n, data};
          }),
        );
      } else if (node.id !== mind.rootId && mind.parent[node.id]) {
        // Dropped among its siblings: take the new place in the order
        const p = mind.parent[node.id]!;
        const axis = settings.layout === 'down' ? 'x' : 'y';
        const sibs = (mind.kids[p] || []).map(id => (id === node.id ? node : rf.getNode(id)!)).filter(Boolean);
        const sorted = [...sibs].sort((a, b) => a.position[axis] + sizeOf(a)[axis === 'x' ? 'w' : 'h'] / 2 - (b.position[axis] + sizeOf(b)[axis === 'x' ? 'w' : 'h'] / 2));
        const ord = new Map(sorted.map((n, i) => [n.id, i]));
        setNodes(ns => ns.map(n => (ord.has(n.id) && (n.data as FD).order !== ord.get(n.id) ? {...n, data: {...n.data, order: ord.get(n.id)}} : n)));
      }
      setLayoutNonce(x => x + 1);
      touch();
      return;
    }
    // Moving things into or out of a section
    const updates = new Map<string, {parentId?: string; position: {x: number; y: number}}>();
    for (const m of dragged) {
      if (m.type === 'frame') continue;
      const a = absOf(m.id);
      const s = sizeOf(m);
      const f = frameAt({x: a.x + s.w / 2, y: a.y + s.h / 2});
      if (f && m.parentId !== f.id) {
        if (dragged.some(d => d.id === f.id)) continue;
        const fa = absOf(f.id);
        updates.set(m.id, {parentId: f.id, position: {x: a.x - fa.x, y: a.y - fa.y}});
      } else if (!f && m.parentId && !dragged.some(d => d.id === m.parentId)) updates.set(m.id, {position: {x: a.x, y: a.y}});
    }
    if (updates.size)
      setNodes(ns =>
        framesFirst(
          ns.map(n => {
            const u = updates.get(n.id);
            if (!u) return n;
            const {parentId: _p, ...rest} = n;
            return u.parentId ? {...rest, parentId: u.parentId, position: u.position} : {...rest, position: u.position};
          }),
        ),
      );
    touch();
  };

  const onNodeDrag = (_: unknown, node: Node) => {
    if (!isMind || !mind || node.id === mind.rootId) return;
    const banned = descendantsOf(node.id);
    const hit = rf.getIntersectingNodes(node).find(n => n.type === 'mind' && n.id !== node.id && !banned.has(n.id) && n.id !== mind.parent[node.id]);
    const id = hit?.id || null;
    if (id !== dropTarget) setDropTarget(id);
  };

  const onBeforeDelete = async ({nodes: del, edges: delE}: {nodes: Node[]; edges: Edge[]}) => {
    if (readOnly || editingId || presenting !== null) return false;
    if (isMind && mind) {
      const ids = new Set<string>();
      del.forEach(n => {
        if (n.id === mind.rootId) return;
        ids.add(n.id);
        descendantsOf(n.id).forEach(d => ids.add(d));
      });
      if (!ids.size) return false;
      snapshot();
      return {nodes: rf.getNodes().filter(n => ids.has(n.id)), edges: []};
    }
    snapshot();
    const delIds = new Set(del.map(n => n.id));
    const frames = new Set(del.filter(n => n.type === 'frame').map(n => n.id));
    // Deleting a section keeps what was inside it
    const keep = rf.getNodes().filter(n => n.parentId && frames.has(n.parentId) && !n.selected);
    if (!keep.length) return true;
    const keepIds = new Set(keep.map(n => n.id));
    const pos = new Map(keep.map(n => [n.id, absOf(n.id)]));
    setNodes(ns =>
      ns.map(n => {
        if (!keepIds.has(n.id)) return n;
        const {parentId: _p, ...rest} = n;
        return {...rest, position: {...pos.get(n.id)!}};
      }),
    );
    return {nodes: del.filter(n => !keepIds.has(n.id) && delIds.has(n.id)), edges: delE.filter(e => !keepIds.has(e.source) && !keepIds.has(e.target))};
  };

  const onConnect = (c: Connection) => {
    if (c.source === c.target && c.sourceHandle === c.targetHandle) return;
    snapshot();
    setEdges(es => addEdge({...c, id: uid('e'), type: 'flow', data: {...settingsRef.current.edge, label: ''}}, es));
  };
  const onConnectEnd = (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
    if (state.isValid || !state.fromNode || readOnly || isMind) return;
    const pt = 'changedTouches' in event ? event.changedTouches[0] : event;
    const p = rf.screenToFlowPosition({x: pt.clientX, y: pt.clientY});
    const from = rf.getNode(state.fromNode.id);
    const side = (state.fromHandle?.id || 'r') as Side;
    const d = (from?.data || {}) as FD;
    const w = from?.type === 'shape' && d.shape !== 'diamond' && d.shape !== 'pill' ? ((from.width as number) || 200) : 200;
    const h = from?.type === 'shape' && d.shape !== 'diamond' && d.shape !== 'pill' ? ((from.height as number) || 72) : 72;
    const at = {t: {x: p.x - w / 2, y: p.y - h}, b: {x: p.x - w / 2, y: p.y}, l: {x: p.x - w, y: p.y - h / 2}, r: {x: p.x, y: p.y - h / 2}}[side];
    const n = shapeNode(at.x, at.y, '', from?.type === 'shape' && d.shape !== 'diamond' && d.shape !== 'pill' ? {shape: d.shape, fill: d.fill, border: d.border} : {}, w, h);
    addNodes([n], {edit: n.id, edges: [flowEdge(state.fromNode.id, n.id, {...settingsRef.current.edge, label: ''}, side, OPPOSITE[side])]});
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const p = rf.screenToFlowPosition({x: e.clientX, y: e.clientY});
    const file = [...e.dataTransfer.files].find(f => f.type.startsWith('image/'));
    if (file && !isMind) return void insertImage(file, p);
    if (file?.name.endsWith('.json')) return void importJson(file);
    const raw = e.dataTransfer.getData('application/x-flowstudio');
    if (!raw) return;
    try {
      const {tool: t, shape, block} = JSON.parse(raw) as {tool: Tool | 'block'; shape?: ShapeKind; block?: string};
      if (t === 'block') return block && insertBlock(block, p);
      createAt(t, p, shape || shapeKind);
    } catch {
      // ignore
    }
  };

  // ── Pen ──────────────────────────────────────────────────────────────────
  const [stroke, setStroke] = useState<number[] | null>(null);
  const penPts = useRef<number[]>([]);
  const penDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const r = wrapRef.current!.getBoundingClientRect();
    penPts.current = [e.clientX - r.left, e.clientY - r.top];
    setStroke([...penPts.current]);
  };
  const penMove = (e: React.PointerEvent) => {
    if (!stroke) return;
    const r = wrapRef.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const n = penPts.current.length;
    if (Math.hypot(x - penPts.current[n - 2], y - penPts.current[n - 1]) < 2.5) return;
    penPts.current.push(x, y);
    setStroke([...penPts.current]);
  };
  const penUp = () => {
    const pts = penPts.current;
    setStroke(null);
    penPts.current = [];
    if (pts.length < 6) return;
    const r = wrapRef.current!.getBoundingClientRect();
    const flow: number[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      const p = rf.screenToFlowPosition({x: pts[i] + r.left, y: pts[i + 1] + r.top});
      flow.push(p.x, p.y);
    }
    const xs = flow.filter((_, i) => i % 2 === 0);
    const ys = flow.filter((_, i) => i % 2 === 1);
    const pad = penWidth * 2;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const w = Math.max(12, Math.max(...xs) + pad - minX);
    const h = Math.max(12, Math.max(...ys) + pad - minY);
    const rel = flow.map((v, i) => Math.round((i % 2 === 0 ? v - minX : v - minY) * 10) / 10);
    snapshot();
    setNodes(ns => [...ns, {id: uid('d'), type: 'draw', position: {x: minX, y: minY}, width: w, height: h, data: {points: rel, w0: w, h0: h, stroke: penColor, strokeWidth: penWidth}}]);
  };

  // ── Context for the nodes ────────────────────────────────────────────────
  const ctx: StudioCtx = {
    patchData: (id, patch) => updateNodes([id], patch),
    fitHeight: id => setNodes(ns => ns.map(n => (n.id === id && n.height !== undefined ? {...n, height: undefined, style: {...n.style, height: undefined}} : n))),
    editingId,
    startEdit,
    commitText,
    cancelEdit: () => setEditingId(null),
    snapshot,
    touch,
    mind,
    layout: settings.layout,
    toggleCollapse,
    addMindChild,
    dropTarget,
    taskDone,
    editingEdgeId,
    commitEdgeLabel: (id, label) => {
      setEditingEdgeId(null);
      const e = rf.getEdge(id);
      if (!e || ((e.data as ED)?.label || '') === label) return;
      snapshot();
      setEdges(es => es.map(x => (x.id === id ? {...x, data: {...x.data, label}} : x)));
    },
    readOnly: readOnly || presenting !== null,
    dark: !!canvasOf(settings.canvas).dark,
    mindLine: settings.mindLine || 'curve',
  };
  const canvas = canvasOf(settings.canvas);

  // Right-click menus
  const openMenu = (e: React.MouseEvent | MouseEvent, on: Menu['on'], edgeId?: string) => {
    e.preventDefault();
    if (presenting !== null) return;
    const r = wrapRef.current?.getBoundingClientRect();
    const x = e.clientX - (r?.left || 0);
    const y = e.clientY - (r?.top || 0);
    setFlyout(null);
    setMenu({x: Math.min(x, (r?.width || 800) - 230), y: Math.min(y, (r?.height || 600) - 330), flow: rf.screenToFlowPosition({x: e.clientX, y: e.clientY}), on, edgeId});
  };
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('pointerdown', close);
    window.addEventListener('wheel', close, {passive: true});
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('wheel', close);
    };
  }, [menu]);

  const saveLabel = {saved: 'Saved', saving: 'Saving…', unsaved: 'Unsaved', error: 'Not saved, retrying on next change'}[save];
  const placing = tool !== 'select' && tool !== 'hand' && tool !== 'pen';
  const one = selectedNodes.length === 1 ? selectedNodes[0] : null;

  return (
    <Studio.Provider value={ctx}>
      <div className={`fs-root fs-editor ${presenting !== null ? 'is-presenting' : ''}`}>
        {/* ── Top bar ── */}
        <header className="fs-header">
          <button className="fs-btn fs-btn-ghost" onClick={() => void persist().then(onBack)} title="All boards" type="button">
            <ArrowLeft /> <span className="fs-hide-sm">Boards</span>
          </button>
          <span className={`fs-kind-chip ${isMind ? 'is-mind' : ''}`}>{isMind ? <GitBranch /> : <Frame />}</span>
          <input
            aria-label="Board name"
            className="fs-title-input"
            onBlur={e => {
              const v = e.target.value.trim() || 'Untitled board';
              setName(v);
              if (v !== initialName) touch();
            }}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            value={name}
          />
          <span className={`fs-save is-${save}`} title={save === 'error' ? 'Could not reach the server' : undefined}>
            {save === 'saving' ? <Loader2 className="fs-spin" /> : save === 'saved' ? <Check /> : null}
            <span className="fs-hide-sm">{saveLabel}</span>
          </span>
          <div className="fs-header-mid">
            <button aria-label="Undo" className="fs-icon-btn" disabled={!past.current.length} onClick={undo} title="Undo (Ctrl+Z)" type="button">
              <Undo2 />
            </button>
            <button aria-label="Redo" className="fs-icon-btn" disabled={!future.current.length} onClick={redo} title="Redo (Ctrl+Shift+Z)" type="button">
              <Redo2 />
            </button>
          </div>
          <div className="fs-header-right">
            {!readOnly && (
              <button className="fs-btn fs-btn-opg" onClick={applyOpg} title="Apply the OPG colours to the selection, or the whole board if nothing is selected" type="button">
                <span className="fs-opg-dots">
                  <i style={{background: OPG.dark}} />
                  <i style={{background: OPG.green}} />
                  <i style={{background: OPG.light}} />
                </span>
                <span className="fs-hide-sm">OPG theme</span>
              </button>
            )}
            {!readOnly && (
              <div className="fs-pop-anchor">
                <button className={`fs-btn ${panel === 'style' ? 'is-on' : ''}`} onClick={() => setPanel(p => (p === 'style' ? null : 'style'))} title="Backgrounds, colour themes, looks and fonts" type="button">
                  <Palette /> <span className="fs-hide-sm">Style</span>
                </button>
                {panel === 'style' && (
                  <StylePanel
                    isMind={isMind}
                    onClose={() => setPanel(null)}
                    onEdges={edgesAll}
                    onOpg={applyOpg}
                    onSettings={setSettings}
                    onStyle={styleAll}
                    onTheme={applyBoardTheme}
                    scoped={selectedNodes.length > 0}
                    settings={settings}
                  />
                )}
              </div>
            )}
            <button className="fs-btn fs-btn-ai" onClick={() => setPanel('ai')} title="Describe it and let AI build it" type="button">
              <Sparkles /> <span className="fs-hide-sm">Build with AI</span>
            </button>
            <button aria-label="Search" className="fs-icon-btn" onClick={() => setPanel(p => (p === 'search' ? null : 'search'))} title="Find (Ctrl+F)" type="button">
              <Search />
            </button>
            <div className="fs-pop-anchor">
              <button aria-label="Export" className="fs-icon-btn" onClick={() => setPanel(p => (p === 'export' ? null : 'export'))} title="Export and import" type="button">
                <Download />
              </button>
              {panel === 'export' && (
                <div className="fs-menu fs-menu-right">
                  <button onClick={() => void exportImage('png')} type="button">
                    <ImageIcon /> Download PNG
                  </button>
                  <button onClick={() => void exportImage('svg')} type="button">
                    <Download /> Download SVG
                  </button>
                  <button onClick={() => void exportImage('copy')} type="button">
                    <Copy /> Copy as image
                  </button>
                  <hr />
                  <button onClick={exportJson} type="button">
                    <Download /> Download JSON
                  </button>
                  <button onClick={() => importRef.current?.click()} type="button">
                    <Upload /> Import JSON…
                  </button>
                </div>
              )}
            </div>
            <button className="fs-btn fs-btn-ghost" onClick={present} title="Present: walk through the sections" type="button">
              <Play /> <span className="fs-hide-sm">Present</span>
            </button>
            <button aria-label="Lock board" className={`fs-icon-btn ${readOnly ? 'is-on' : ''}`} onClick={() => setReadOnly(v => !v)} title={readOnly ? 'Unlock editing' : 'Lock editing (view only)'} type="button">
              {readOnly ? <Lock /> : <Unlock />}
            </button>
            <button aria-label="Shortcuts" className="fs-icon-btn fs-hide-sm" onClick={() => setPanel(p => (p === 'keys' ? null : 'keys'))} title="Keyboard shortcuts (?)" type="button">
              <Keyboard />
            </button>
            <button
              aria-label="Details panel"
              className={`fs-icon-btn ${inspector ? 'is-on' : ''}`}
              onClick={() => setInspector(v => (write('FS_INSPECTOR', !v), !v))}
              title="Details panel"
              type="button">
              <PanelRight />
            </button>
          </div>
        </header>

        <div className="fs-main">
          <div
            className={`fs-canvas tool-${tool} ${readOnly ? 'is-readonly' : ''} ${canvas.dark ? 'is-dark' : ''} mind-${settings.mindStyle || 'card'}`}
            onDoubleClick={e => {
              // Double-click an empty spot: a new box, ready to type in
              if (isMind || readOnly || presenting !== null || tool !== 'select') return;
              if (!(e.target as HTMLElement).classList?.contains('react-flow__pane')) return;
              createAt('shape', rf.screenToFlowPosition({x: e.clientX, y: e.clientY}), 'rounded');
            }}
            ref={wrapRef}
            style={{background: canvas.bg}}>
            <ReactFlow
              nodes={nodes}
              edges={isMind ? mindEdges : edges}
              onNodesChange={onNodesChange}
              onEdgesChange={isMind ? undefined : changes => onEdgesChange(readOnly ? changes.filter(c => c.type === 'select') : changes)}
              nodeTypes={NODE_TYPES}
              edgeTypes={edgeTypes}
              onConnect={onConnect}
              onConnectEnd={onConnectEnd}
              connectionMode={ConnectionMode.Loose}
              connectionLineType={ConnectionLineType.SmoothStep}
              connectionLineStyle={{stroke: '#7b68ee', strokeWidth: 2}}
              connectionRadius={28}
              onNodeDoubleClick={(_, n) => TEXT_TYPES.has(n.type || '') && startEdit(n.id)}
              onEdgeDoubleClick={(_, e) => !readOnly && setEditingEdgeId(e.id)}
              style={{['--xy-background-color' as string]: canvas.bg}}
              onNodeContextMenu={(e, n) => {
                if (!n.selected) selectOnly(n.id);
                openMenu(e, 'node');
              }}
              onSelectionContextMenu={e => openMenu(e, 'node')}
              onEdgeContextMenu={(e, edge) => {
                if (isMind) return e.preventDefault();
                setNodes(ns => ns.map(n => (n.selected ? {...n, selected: false} : n)));
                setEdges(es => es.map(x => (x.selected === (x.id === edge.id) ? x : {...x, selected: x.id === edge.id})));
                openMenu(e, 'edge', edge.id);
              }}
              onPaneContextMenu={e => openMenu(e, 'pane')}
              onPaneClick={e => {
                setFlyout(null);
                if (panel === 'export' || panel === 'style') setPanel(null);
                if (placing && !readOnly) createAt(tool, rf.screenToFlowPosition({x: e.clientX, y: e.clientY}));
              }}
              onNodeDragStart={() => snapshot()}
              onNodeDrag={onNodeDrag}
              onNodeDragStop={onNodeDragStop}
              onSelectionDragStart={() => snapshot()}
              onSelectionDragStop={(_, ns) => onNodeDragStop(null, ns[0], ns)}
              onBeforeDelete={onBeforeDelete}
              onDelete={() => setLayoutNonce(n => n + 1)}
              onDragOver={e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={onDrop}
              selectionOnDrag={tool === 'select'}
              panOnDrag={tool === 'hand' ? true : [1, 2]}
              selectionMode={SelectionMode.Partial}
              panOnScroll={!settings.scrollZoom}
              zoomOnScroll={settings.scrollZoom}
              zoomOnDoubleClick={false}
              snapToGrid={settings.snap}
              snapGrid={[20, 20]}
              nodesDraggable={!readOnly && tool !== 'hand' && presenting === null}
              nodesConnectable={!readOnly && !isMind && presenting === null}
              elementsSelectable={presenting === null}
              elevateNodesOnSelect={false}
              deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
              multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
              minZoom={0.08}
              maxZoom={4}
              defaultViewport={initial.viewport}
              proOptions={{hideAttribution: true}}>
              {settings.grid !== 'none' && (
                <Background variant={settings.grid === 'dots' ? BackgroundVariant.Dots : BackgroundVariant.Lines} gap={settings.grid === 'dots' ? 22 : 40} size={settings.grid === 'dots' ? 1.7 : 1} color={settings.grid === 'dots' ? canvas.dot : canvas.line} />
              )}
              {settings.minimap && presenting === null && (
                <MiniMap
                  pannable
                  zoomable
                  className="fs-minimap"
                  nodeBorderRadius={6}
                  nodeColor={n => (BLOCK_TYPES.has(n.type || '') ? '#ffffff' : n.type === 'sticky' ? stickyPaint(n.data as FD).bg : n.type === 'mind' ? '#e4e7ec' : n.type === 'draw' ? 'transparent' : paint(n.data as FD, n.type === 'frame' ? 'gray' : 'blue').flat)}
                  maskColor={canvas.dark ? 'rgba(15,20,36,0.6)' : 'rgba(240,242,246,0.7)'}
                />
              )}
              <HelperLines x={helper.x} y={helper.y} />
              {!dragging && !editingId && presenting === null && !readOnly && selectedNodes.length > 0 && (
                <SelectionToolbar
                  isMind={isMind}
                  nodes={selectedNodes}
                  mindRoot={mind?.rootId || null}
                  onUpdate={updateSelected}
                  onAlign={align}
                  onReorder={reorder}
                  onDuplicate={duplicate}
                  onCopyStyle={copyStyle}
                  onPasteStyle={styleClip ? pasteStyle : undefined}
                  onGroup={groupSelection}
                  onDelete={() => void rf.deleteElements({nodes: rf.getNodes().filter(n => n.selected)})}
                  onLock={locked => updateSelected({locked}, {draggable: !locked})}
                  onAddChild={() => one && addMindChild(one.id)}
                  onCollapse={() => one && toggleCollapse(one.id)}
                  onDetails={() => setInspector(v => (v ? v : (write('FS_INSPECTOR', true), true)))}
                  onQuickAdd={quickAdd}
                />
              )}
            </ReactFlow>

            {/* Pen: draw straight onto the board */}
            {tool === 'pen' && !readOnly && (
              <div className="fs-pen-layer" onPointerDown={penDown} onPointerMove={penMove} onPointerUp={penUp} onPointerCancel={penUp}>
                {stroke && (
                  <svg>
                    <path d={smoothPath(stroke)} fill="none" stroke={penColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth={penWidth * rf.getZoom()} />
                  </svg>
                )}
              </div>
            )}

            {/* ── Tools ── */}
            {presenting === null && !readOnly && (
              <nav className="fs-palette" aria-label="Tools">
                <ToolBtn active={tool === 'select'} icon={<MousePointer2 />} label="Select (V)" onClick={() => setTool('select')} />
                <ToolBtn active={tool === 'hand'} icon={<Hand />} label="Pan (H, or hold Space)" onClick={() => setTool('hand')} />
                <span className="fs-palette-sep" />
                {isMind ? (
                  <>
                    <ToolBtn icon={<Plus />} label="Add a branch (Tab)" onClick={() => addMindChild(one?.id || mind?.rootId || '')} />
                    <ToolBtn icon={<ListTree />} label="Collapse all branches" onClick={() => setAllCollapsed(true)} />
                    <ToolBtn icon={<GitBranch />} label="Expand everything" onClick={() => setAllCollapsed(false)} />
                    <span className="fs-palette-sep" />
                    {(['right', 'both', 'down'] as const).map(l => (
                      <button className={`fs-tool fs-tool-text ${settings.layout === l ? 'is-active' : ''}`} key={l} onClick={() => setSettings({layout: l})} title={{right: 'Branches to the right', both: 'Branches on both sides', down: 'Top-down (org chart)'}[l]} type="button">
                        {{right: '→', both: '↔', down: '↓'}[l]}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="fs-tool-wrap">
                      <ToolBtn
                        active={tool === 'shape'}
                        drag={{tool: 'shape', shape: shapeKind}}
                        icon={shapeKind === 'diamond' ? <Diamond /> : shapeKind === 'ellipse' ? <Circle /> : <Square />}
                        label="Shapes (R, O, D)"
                        onClick={() => {
                          setTool('shape');
                          setFlyout(f => (f === 'shape' ? null : 'shape'));
                        }}
                      />
                      {flyout === 'shape' && (
                        <div className="fs-flyout fs-shape-grid">
                          {SHAPES.map(s => (
                            <button
                              className={shapeKind === s.kind ? 'on' : ''}
                              draggable
                              key={s.kind}
                              onClick={() => {
                                setShapeKind(s.kind);
                                setTool('shape');
                                setFlyout(null);
                              }}
                              onDragStart={e => e.dataTransfer.setData('application/x-flowstudio', JSON.stringify({tool: 'shape', shape: s.kind}))}
                              title={s.name}
                              type="button">
                              <ShapeGlyph kind={s.kind} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="fs-tool-wrap">
                      <ToolBtn
                        active={tool === 'sticky'}
                        drag={{tool: 'sticky'}}
                        icon={<StickyNote />}
                        label="Sticky note (S)"
                        onClick={() => {
                          setTool('sticky');
                          setFlyout(f => (f === 'sticky' ? null : 'sticky'));
                        }}
                      />
                      {flyout === 'sticky' && (
                        <div className="fs-flyout fs-swatch-row">
                          {Object.entries(STICKY_COLORS).map(([k, c]) => (
                            <button aria-label={k} className={`fs-swatch ${stickyColor === k ? 'on' : ''}`} key={k} onClick={() => (setStickyColor(k), setFlyout(null))} style={{background: c}} type="button" />
                          ))}
                        </div>
                      )}
                    </div>
                    <ToolBtn active={tool === 'text'} drag={{tool: 'text'}} icon={<Type />} label="Text (T)" onClick={() => setTool('text')} />
                    <div className="fs-tool-wrap">
                      <ToolBtn
                        active={tool === 'stamp'}
                        icon={tool === 'stamp' ? <span className="fs-emoji">{stamp}</span> : <Smile />}
                        label="Stickers and reactions"
                        onClick={() => {
                          setTool('stamp');
                          setFlyout(f => (f === 'stamp' ? null : 'stamp'));
                        }}
                      />
                      {flyout === 'stamp' && (
                        <div className="fs-flyout fs-icon-grid fs-stamp-grid">
                          {STAMPS.map(x => (
                            <button className={stamp === x ? 'on' : ''} key={x} onClick={() => (setStamp(x), setTool('stamp'), setFlyout(null))} type="button">
                              <span className="fs-emoji">{x}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <ToolBtn active={tool === 'card'} drag={{tool: 'card'}} icon={<CardGlyph />} label="Card: owner, status, due date (C)" onClick={() => setTool('card')} />
                    <ToolBtn active={tool === 'frame'} drag={{tool: 'frame'}} icon={<Frame />} label="Section / swimlane (F)" onClick={() => setTool('frame')} />
                    <div className="fs-tool-wrap">
                      <ToolBtn
                        active={tool === 'pen'}
                        icon={<PenLine />}
                        label="Pen (P)"
                        onClick={() => {
                          setTool('pen');
                          setFlyout(f => (f === 'pen' ? null : 'pen'));
                        }}
                      />
                      {flyout === 'pen' && (
                        <div className="fs-flyout fs-swatch-row">
                          {PEN_COLORS.map(c => (
                            <button aria-label={c} className={`fs-swatch ${penColor === c ? 'on' : ''}`} key={c} onClick={() => setPenColor(c)} style={{background: c}} type="button" />
                          ))}
                          <span className="fs-flyout-sep" />
                          {[2, 3, 6].map(w => (
                            <button className={`fs-pen-w ${penWidth === w ? 'on' : ''}`} key={w} onClick={() => setPenWidth(w)} title={`${w}px`} type="button">
                              <span style={{height: w, background: penColor}} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="fs-tool-wrap">
                      <ToolBtn active={flyout === 'blocks'} icon={<Blocks />} label="Timelines, charts, tables and diagrams (B)" onClick={() => setFlyout(f => (f === 'blocks' ? null : 'blocks'))} className="fs-tool-blocks" />
                      {flyout === 'blocks' && (
                        <div className="fs-flyout fs-blocks-menu">
                          {(['Timelines', 'Data', 'Diagrams'] as const).map(g => (
                            <React.Fragment key={g}>
                              <h6>{g === 'Data' ? 'Data and lists' : g}</h6>
                              <div className="fs-blocks-grid">
                                {BLOCKS.filter(b => b.group === g).map(b => (
                                  <button
                                    draggable
                                    key={b.key}
                                    onClick={() => insertBlock(b.key)}
                                    onDragStart={e => e.dataTransfer.setData('application/x-flowstudio', JSON.stringify({tool: 'block', block: b.key}))}
                                    title={`${b.name}: click to add, or drag onto the board`}
                                    type="button">
                                    <BlockGlyph k={b.key} />
                                    {b.name}
                                  </button>
                                ))}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>
                    <ToolBtn icon={<ImageIcon />} label="Picture (or paste / drop one)" onClick={() => fileRef.current?.click()} />
                    <span className="fs-palette-sep" />
                    <ToolBtn icon={<span className="fs-glyph">⇣</span>} label="Auto-arrange top to bottom" onClick={() => autoArrange('TB')} />
                    <ToolBtn icon={<span className="fs-glyph">⇢</span>} label="Auto-arrange left to right" onClick={() => autoArrange('LR')} />
                  </>
                )}
                <span className="fs-palette-sep" />
                <ToolBtn icon={<Sparkles />} label="Build with AI" onClick={() => setPanel('ai')} className="fs-tool-ai" />
              </nav>
            )}
            {placing && <div className="fs-hint">{tool === 'stamp' ? 'Click to place stickers · Esc when done' : 'Click on the board to place it · Esc to cancel'}</div>}
            {tool === 'pen' && <div className="fs-hint">Draw on the board · V to stop drawing</div>}
            {readOnly && presenting === null && <div className="fs-hint">View only. Unlock to edit</div>}

            {/* Connector styling */}
            {selectedEdges.length > 0 && !selectedNodes.length && !readOnly && presenting === null && (
              <EdgeBar
                edges={selectedEdges}
                onUpdate={updateEdges}
                onLabel={() => setEditingEdgeId(selectedEdges[0].id)}
                onReverse={reverseEdges}
                onDelete={() => void rf.deleteElements({edges: selectedEdges})}
              />
            )}

            {/* Empty board: a nudge on how to begin */}
            {!isMind && nodes.length === 0 && presenting === null && !readOnly && tool === 'select' && panel !== 'ai' && (
              <div className="fs-empty-board">
                <b>A fresh board</b>
                <span>Double-click anywhere to add a box, pick a tool on the left, or start with one of these.</span>
                <div>
                  <button className="fs-btn" onClick={() => createAt('shape', centerOfView(), 'rounded')} type="button">
                    <Square /> Box
                  </button>
                  <button className="fs-btn" onClick={() => createAt('sticky', centerOfView())} type="button">
                    <StickyNote /> Sticky note
                  </button>
                  <button className="fs-btn" onClick={() => insertBlock('timeline-line')} type="button">
                    <GanttChart /> Timeline
                  </button>
                  <button className="fs-btn" onClick={() => setFlyout('blocks')} type="button">
                    <Blocks /> Charts and more
                  </button>
                  <button className="fs-btn fs-btn-ai" onClick={() => setPanel('ai')} type="button">
                    <Sparkles /> Build with AI
                  </button>
                </div>
              </div>
            )}

            {menu && (
              <div className="fs-menu fs-ctx" onContextMenu={e => e.preventDefault()} onPointerDown={e => e.stopPropagation()} style={{left: menu.x, top: menu.y}}>
                {menu.on === 'pane' && (
                  <>
                    {!isMind && !readOnly && (
                      <>
                        <button onClick={() => (createAt('shape', menu.flow, 'rounded'), setMenu(null))} type="button">
                          <Square /> Add a box here
                        </button>
                        <button onClick={() => (createAt('sticky', menu.flow), setMenu(null))} type="button">
                          <StickyNote /> Add a sticky note here
                        </button>
                        <button onClick={() => (createAt('text', menu.flow), setMenu(null))} type="button">
                          <Type /> Add text here
                        </button>
                        <button onClick={() => (createAt('frame', menu.flow), setMenu(null))} type="button">
                          <Frame /> Add a section here
                        </button>
                        <button onClick={() => (insertBlock('timeline-line', menu.flow), setMenu(null))} type="button">
                          <GanttChart /> Add a timeline here
                        </button>
                        <button onClick={() => (insertBlock('table', menu.flow), setMenu(null))} type="button">
                          <BlockGlyph k="table" /> Add a table here
                        </button>
                        <button onClick={() => (insertBlock('checklist', menu.flow), setMenu(null))} type="button">
                          <ListChecks /> Add a checklist here
                        </button>
                        <hr />
                      </>
                    )}
                    <button onClick={() => (setNodes(ns => ns.map(n => (n.hidden || n.selected ? n : {...n, selected: true}))), setMenu(null))} type="button">
                      <MousePointer2 /> Select everything <kbd>Ctrl+A</kbd>
                    </button>
                    <button onClick={() => (rf.fitView({padding: 0.15, duration: 300}), setMenu(null))} type="button">
                      <Maximize /> Fit to screen <kbd>Shift+1</kbd>
                    </button>
                    {!readOnly && (
                      <button onClick={() => (setPanel('style'), setMenu(null))} type="button">
                        <Palette /> Board style…
                      </button>
                    )}
                  </>
                )}
                {menu.on === 'node' && (
                  <>
                    {one && TEXT_TYPES.has(one.type || '') && !readOnly && (
                      <button onClick={() => (startEdit(one.id), setMenu(null))} type="button">
                        <Type /> Edit text <kbd>Enter</kbd>
                      </button>
                    )}
                    {isMind && one && !readOnly && (
                      <>
                        <button onClick={() => (addMindChild(one.id), setMenu(null))} type="button">
                          <Plus /> Add a branch <kbd>Tab</kbd>
                        </button>
                        {one.id !== mind?.rootId && (
                          <button onClick={() => (toggleCollapse(one.id), setMenu(null))} type="button">
                            <ListTree /> {(one.data as FD).collapsed ? 'Expand' : 'Collapse'}
                          </button>
                        )}
                      </>
                    )}
                    {!readOnly && (
                      <>
                        {!isMind && (
                          <button onClick={() => (duplicate(), setMenu(null))} type="button">
                            <CopyPlus /> Duplicate <kbd>Ctrl+D</kbd>
                          </button>
                        )}
                        <button onClick={() => (copyStyle(), setMenu(null))} type="button">
                          <Paintbrush /> Copy style <kbd>Ctrl+Alt+C</kbd>
                        </button>
                        {styleClip && (
                          <button onClick={() => (pasteStyle(), setMenu(null))} type="button">
                            <Paintbrush /> Paste style <kbd>Ctrl+Alt+V</kbd>
                          </button>
                        )}
                        {!isMind && selectedNodes.filter(n => (n.data as FD).label && !BLOCK_TYPES.has(n.type || '') && n.type !== 'frame').length > 1 && (
                          <>
                            <hr />
                            <button onClick={() => (selectionToBlock('timeline-line'), setMenu(null))} type="button">
                              <GanttChart /> Make a timeline from these
                            </button>
                            <button onClick={() => (selectionToBlock('diagram-process'), setMenu(null))} type="button">
                              <BlockGlyph k="diagram-process" /> Make numbered steps from these
                            </button>
                            <button onClick={() => (selectionToBlock('checklist'), setMenu(null))} type="button">
                              <ListChecks /> Make a checklist from these
                            </button>
                          </>
                        )}
                        {!isMind && (
                          <>
                            <hr />
                            <button onClick={() => (reorder(true), setMenu(null))} type="button">
                              <ArrowUpToLine /> Bring to front <kbd>]</kbd>
                            </button>
                            <button onClick={() => (reorder(false), setMenu(null))} type="button">
                              <ArrowDownToLine /> Send to back <kbd>[</kbd>
                            </button>
                            <button onClick={() => (groupSelection(), setMenu(null))} type="button">
                              <Group /> Group in a section <kbd>Ctrl+G</kbd>
                            </button>
                            <button
                              onClick={() => {
                                const locked = selectedNodes.every(n => (n.data as FD).locked);
                                updateSelected({locked: !locked}, {draggable: locked});
                                setMenu(null);
                              }}
                              type="button">
                              {selectedNodes.every(n => (n.data as FD).locked) ? <Unlock /> : <Lock />} {selectedNodes.every(n => (n.data as FD).locked) ? 'Unlock position' : 'Lock position'}
                            </button>
                          </>
                        )}
                        <hr />
                        <button className="danger" onClick={() => (void rf.deleteElements({nodes: rf.getNodes().filter(n => n.selected)}), setMenu(null))} type="button">
                          <Trash2 /> Delete <kbd>Del</kbd>
                        </button>
                      </>
                    )}
                  </>
                )}
                {menu.on === 'edge' && !readOnly && (
                  <>
                    <button onClick={() => (menu.edgeId && setEditingEdgeId(menu.edgeId), setMenu(null))} type="button">
                      <Type /> Add or edit the label
                    </button>
                    <button onClick={() => (reverseEdges(), setMenu(null))} type="button">
                      <ArrowLeftRight /> Reverse direction
                    </button>
                    <hr />
                    <button className="danger" onClick={() => (void rf.deleteElements({edges: rf.getEdges().filter(x => x.selected)}), setMenu(null))} type="button">
                      <Trash2 /> Delete <kbd>Del</kbd>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Zoom */}
            {presenting === null && <ZoomBar minimap={settings.minimap} onMinimap={() => setSettings({minimap: !settings.minimap})} />}

            {panel === 'search' && <SearchBox nodes={nodes} onClose={() => setPanel(null)} onPick={focusNode} />}
            {panel === 'keys' && <Shortcuts isMind={isMind} onClose={() => setPanel(null)} />}

            {presenting !== null && (
              <div className="fs-present-bar">
                <button aria-label="Previous" className="fs-icon-btn" disabled={presenting === 0} onClick={() => setPresenting(i => Math.max(0, (i ?? 0) - 1))} type="button">
                  <ChevronLeft />
                </button>
                <span>{slides.length ? `${presenting + 1} / ${slides.length} · ${(rf.getNode(slides[presenting])?.data as FD)?.label || 'Section'}` : 'Whole board'}</span>
                <button aria-label="Next" className="fs-icon-btn" disabled={presenting >= slides.length - 1} onClick={() => setPresenting(i => Math.min((i ?? 0) + 1, slides.length - 1))} type="button">
                  <ChevronRight />
                </button>
                <button className="fs-btn" onClick={stopPresenting} type="button">
                  Exit
                </button>
              </div>
            )}
            {toast && <div className="fs-toast">{toast}</div>}
          </div>

          {inspector && presenting === null && (
            <Inspector
              boardName={name}
              isMind={isMind}
              node={one}
              nodes={nodes}
              edgesCount={isMind ? mindEdges.length : edges.length}
              settings={settings}
              onSettings={setSettings}
              onUpdate={(id, patch, extra) => updateNodes([id], patch, extra)}
              onFocus={focusNode}
              onClose={() => setInspector(v => (write('FS_INSPECTOR', !v), !v))}
              onTaskLinked={(id, done) => setTaskDone(m => ({...m, [id]: done}))}
              mindKids={mind?.kids || null}
              mindRoot={mind?.rootId || null}
            />
          )}
        </div>

        <input accept="image/*" hidden onChange={e => (e.target.files?.[0] && void insertImage(e.target.files[0]), (e.target.value = ''))} ref={fileRef} type="file" />
        <input accept="application/json,.json" hidden onChange={e => (e.target.files?.[0] && void importJson(e.target.files[0]), (e.target.value = ''))} ref={importRef} type="file" />

        {panel === 'ai' && (
          <AiBuilder
            addLabel={isMind ? `Add as branches under “${(one?.data as FD)?.label || (root?.data as FD)?.label || 'the centre'}”` : 'Add next to what is on the board'}
            canAdd={nodes.length > (isMind ? 1 : 0)}
            context={outlineText()}
            kind={kind}
            onBuild={applyAi}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
    </Studio.Provider>
  );
}

// ── Small pieces ───────────────────────────────────────────────────────────
function ToolBtn({icon, label, onClick, active, drag, className}: {icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; drag?: {tool: Tool; shape?: ShapeKind}; className?: string}) {
  return (
    <button
      aria-label={label}
      className={`fs-tool ${active ? 'is-active' : ''} ${className || ''}`}
      draggable={!!drag}
      onClick={onClick}
      onDragStart={drag ? e => e.dataTransfer.setData('application/x-flowstudio', JSON.stringify(drag)) : undefined}
      type="button">
      {icon}
    </button>
  );
}

function CardGlyph() {
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
      <rect height="14" rx="3" width="18" x="3" y="5" />
      <path d="M7 10h7M7 14h4" />
      <circle cx="16.5" cy="14" fill="currentColor" r="1.5" stroke="none" />
    </svg>
  );
}

export function ShapeGlyph({kind}: {kind: ShapeKind}) {
  const p: Partial<Record<ShapeKind, React.ReactNode>> = {
    rect: <rect height="14" rx="1.5" width="20" x="2" y="5" />,
    rounded: <rect height="14" rx="4" width="20" x="2" y="5" />,
    pill: <rect height="12" rx="6" width="20" x="2" y="6" />,
    diamond: <path d="M12 3 L21 12 L12 21 L3 12 Z" />,
    ellipse: <circle cx="12" cy="12" r="8.5" />,
    parallelogram: <path d="M7 5 H22 L17 19 H2 Z" />,
    hexagon: <path d="M6 5 H18 L22 12 L18 19 H6 L2 12 Z" />,
    cylinder: (
      <>
        <path d="M4 6 C4 3 20 3 20 6 V18 C20 21 4 21 4 18 Z" />
        <path d="M4 6 C4 9 20 9 20 6" />
      </>
    ),
    triangle: <path d="M12 4 L21 20 H3 Z" />,
    document: <path d="M3 4 H21 V17 C16 14 9 21 3 17 Z" />,
  };
  return (
    <svg fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
      {p[kind] || <path d={SHAPE_PATHS[kind]} transform="translate(2 3.5) scale(0.2 0.17)" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

/** A colour well that opens the system colour picker; reports once, when a colour is chosen. */
function ColorInput({value, onPick, title}: {value?: string; onPick: (hex: string) => void; title: string}) {
  const ref = useRef<HTMLInputElement>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // The native "change" fires when the picker closes, so one pick is one undo step
    const done = () => pick.current(el.value);
    el.addEventListener('change', done);
    return () => el.removeEventListener('change', done);
  }, []);
  return (
    <label className={`fs-swatch fs-swatch-custom ${isHex(value) ? 'on' : ''}`} style={isHex(value) ? {background: value} : undefined} title={title}>
      <input aria-label={title} defaultValue={isHex(value) ? value : '#7b68ee'} ref={ref} type="color" />
    </label>
  );
}

/** Board-wide look: background, colour themes, shape look, font, connector and mind map line styles. */
function StylePanel({
  isMind,
  settings,
  scoped,
  onSettings,
  onTheme,
  onOpg,
  onStyle,
  onEdges,
  onClose,
}: {
  isMind: boolean;
  settings: Settings;
  scoped: boolean;
  onSettings: (p: Partial<Settings>) => void;
  onTheme: (t: BoardTheme) => void;
  onOpg: () => void;
  onStyle: (patch: Partial<FD>, types?: string[]) => void;
  onEdges: (patch: ED) => void;
  onClose: () => void;
}) {
  const target = scoped ? 'the selection' : 'the whole board';
  return (
    <div className="fs-style-panel">
      <header>
        <b>Style</b>
        <span>{scoped ? 'Changes apply to what you have selected' : 'Changes apply to the whole board'}</span>
        <button aria-label="Close" className="fs-icon-btn" onClick={onClose} type="button">
          <X />
        </button>
      </header>
      <h5>Background</h5>
      <div className="fs-canvas-row">
        {Object.entries(CANVASES).map(([k, c]) => (
          <button className={(settings.canvas || 'light') === k ? 'on' : ''} key={k} onClick={() => onSettings({canvas: k})} title={c.name} type="button">
            <i style={{background: c.bg, backgroundImage: `radial-gradient(${c.dot} 1.2px, transparent 1.2px)`}} />
            <span>{c.name}</span>
          </button>
        ))}
      </div>
      <div className="fs-style-row">
        <span>Pattern</span>
        <div className="fs-seg">
          {(['dots', 'lines', 'none'] as const).map(g => (
            <button className={settings.grid === g ? 'on' : ''} key={g} onClick={() => onSettings({grid: g})} type="button">
              {{dots: 'Dots', lines: 'Grid', none: 'Plain'}[g]}
            </button>
          ))}
        </div>
      </div>
      <h5>Colour theme</h5>
      <div className="fs-theme-grid">
        {THEMES.map(t => (
          <button key={t.key} onClick={() => onTheme(t)} title={`Recolour ${target} in ${t.name}`} type="button">
            <span className="fs-theme-dots">
              {t.dots.map((c, i) => (
                <i key={i} style={{background: c}} />
              ))}
            </span>
            {t.name}
          </button>
        ))}
        <button onClick={onOpg} title={`Recolour ${target} in the OPG greens`} type="button">
          <span className="fs-theme-dots">
            {[OPG.dark, OPG.green, OPG.light, '#3F8F1E'].map(c => (
              <i key={c} style={{background: c}} />
            ))}
          </span>
          OPG
        </button>
      </div>
      {!isMind && (
        <>
          <h5>Shapes</h5>
          <div className="fs-style-row">
            <span>Look</span>
            <div className="fs-seg">
              {(['soft', 'solid', 'outline'] as const).map(l => (
                <button key={l} onClick={() => onStyle({look: l}, ['shape'])} title={{soft: 'Soft tint', solid: 'Full colour', outline: 'Outline only'}[l]} type="button">
                  {{soft: 'Soft', solid: 'Solid', outline: 'Outline'}[l]}
                </button>
              ))}
            </div>
          </div>
          <div className="fs-style-row">
            <span>Shadow</span>
            <div className="fs-seg">
              <button onClick={() => onStyle({shadow: true}, ['shape', 'card', 'image'])} type="button">
                Lifted
              </button>
              <button onClick={() => onStyle({shadow: false}, ['shape', 'card', 'image'])} type="button">
                Flat
              </button>
            </div>
          </div>
          <div className="fs-style-row">
            <span>Connectors</span>
            <div className="fs-seg">
              {(
                [
                  ['smooth', 'Elbow'],
                  ['bezier', 'Curved'],
                  ['straight', 'Straight'],
                ] as const
              ).map(([k, l]) => (
                <button className={(settings.edge.path || 'smooth') === k ? 'on' : ''} key={k} onClick={() => onEdges({path: k})} type="button">
                  {l}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {isMind && (
        <>
          <h5>Mind map</h5>
          <div className="fs-style-row">
            <span>Ideas</span>
            <div className="fs-seg">
              {(
                [
                  ['card', 'Cards'],
                  ['pill', 'Pills'],
                  ['line', 'Underlined'],
                ] as const
              ).map(([k, l]) => (
                <button className={(settings.mindStyle || 'card') === k ? 'on' : ''} key={k} onClick={() => onSettings({mindStyle: k})} type="button">
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="fs-style-row">
            <span>Branches</span>
            <div className="fs-seg">
              {(
                [
                  ['curve', 'Curved'],
                  ['elbow', 'Elbow'],
                  ['straight', 'Straight'],
                ] as const
              ).map(([k, l]) => (
                <button className={(settings.mindLine || 'curve') === k ? 'on' : ''} key={k} onClick={() => onSettings({mindLine: k})} type="button">
                  {l}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <div className="fs-style-row">
        <span>Font</span>
        <div className="fs-seg">
          {(
            [
              ['sans', 'Clean'],
              ['serif', 'Serif'],
              ['mono', 'Mono'],
              ['hand', 'Handwritten'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} onClick={() => onStyle({font: k})} style={{fontFamily: FONT_CSS[k]}} type="button">
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HelperLines({x, y}: {x?: number; y?: number}) {
  const {zoom} = useViewport();
  if (x === undefined && y === undefined) return null;
  return (
    <ViewportPortal>
      {x !== undefined && <div className="fs-guide fs-guide-v" style={{left: x, width: 1 / zoom}} />}
      {y !== undefined && <div className="fs-guide fs-guide-h" style={{top: y, height: 1 / zoom}} />}
    </ViewportPortal>
  );
}

function ZoomBar({minimap, onMinimap}: {minimap: boolean; onMinimap: () => void}) {
  const rf = useReactFlow();
  const {zoom} = useViewport();
  return (
    <div className="fs-zoom">
      <button aria-label="Zoom out" onClick={() => rf.zoomOut({duration: 150})} type="button">
        <Minus />
      </button>
      <button className="fs-zoom-val" onClick={() => rf.zoomTo(1, {duration: 200})} title="Zoom to 100%" type="button">
        {Math.round(zoom * 100)}%
      </button>
      <button aria-label="Zoom in" onClick={() => rf.zoomIn({duration: 150})} type="button">
        <Plus />
      </button>
      <span className="fs-zoom-sep" />
      <button aria-label="Fit to screen" onClick={() => rf.fitView({padding: 0.15, duration: 300})} title="Fit everything (Shift+1)" type="button">
        <Maximize />
      </button>
      <button aria-label="Mini map" className={minimap ? 'on' : ''} onClick={onMinimap} title="Mini map" type="button">
        <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <rect height="14" rx="2" width="18" x="3" y="5" />
          <rect fill="currentColor" height="5" rx="1" stroke="none" width="7" x="12" y="12" />
        </svg>
      </button>
    </div>
  );
}

/** The Insert-menu picture that matches a block's current style. */
const blockKeyOf = (type: BlockType, variant?: string) => {
  const k = type === 'gantt' || type === 'table' || type === 'checklist' ? type : `${type}-${variant || ''}`;
  return BLOCK_BY_KEY[k] ? k : type === 'timeline' ? 'timeline-line' : type === 'chart' ? (variant === 'rings' ? 'chart-rings' : 'chart-bar') : type === 'diagram' ? (variant === 'stairs' ? 'diagram-stairs' : 'diagram-process') : 'table';
};
type Pop = null | 'fill' | 'shape' | 'icon' | 'badge' | 'align' | 'link' | 'size' | 'fx' | 'block';
function SelectionToolbar({
  nodes,
  isMind,
  mindRoot,
  onUpdate,
  onAlign,
  onReorder,
  onDuplicate,
  onCopyStyle,
  onPasteStyle,
  onGroup,
  onDelete,
  onLock,
  onAddChild,
  onCollapse,
  onDetails,
  onQuickAdd,
}: {
  nodes: Node[];
  isMind: boolean;
  mindRoot: string | null;
  onUpdate: (p: Partial<FD>, extra?: Partial<Node>) => void;
  onAlign: (how: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom' | 'dist-h' | 'dist-v') => void;
  onReorder: (front: boolean) => void;
  onDuplicate: () => void;
  onCopyStyle: () => void;
  onPasteStyle?: () => void;
  onGroup: () => void;
  onDelete: () => void;
  onLock: (locked: boolean) => void;
  onAddChild: () => void;
  onCollapse: () => void;
  onDetails: () => void;
  onQuickAdd: (id: string, side: Side) => void;
}) {
  const [pop, setPop] = useState<Pop>(null);
  const ids = nodes.map(n => n.id);
  useEffect(() => setPop(null), [ids.join(',')]);
  const types = new Set(nodes.map(n => n.type));
  const only = (t: string) => types.size === 1 && types.has(t);
  const d = nodes[0].data as FD;
  const locked = nodes.every(n => (n.data as FD).locked);
  const fills = only('sticky') ? Object.keys(STICKY_COLORS) : only('draw') ? PEN_COLORS : PALETTE_KEYS;
  const look = only('shape') ? d.look || 'soft' : 'soft';
  const swatch = (k: string) => (only('sticky') ? STICKY_COLORS[k] : only('draw') ? k : paint({fill: k, look}).flat);
  const hasText = [...types].every(t => ['shape', 'sticky', 'text', 'card'].includes(t || ''));
  // What the colour button shows for the first selected item
  const dot = only('draw') ? d.stroke || '#232838' : only('sticky') ? stickyPaint(d).bg : only('text') ? d.ink || '#1f2430' : paint(d, only('frame') ? 'gray' : only('card') ? 'purple' : 'blue').bg;
  const canGradient = only('shape') || only('frame');
  const custom = only('draw') ? d.stroke : d.fill;
  const toggle = (p: Pop) => setPop(cur => (cur === p ? null : p));
  const single = nodes.length === 1 ? nodes[0] : null;
  const canQuick = single && !isMind && ['shape', 'sticky', 'card'].includes(single.type || '');
  const anyBlock = nodes.some(n => BLOCK_TYPES.has(n.type || ''));
  const blockType = types.size === 1 && anyBlock ? (nodes[0].type as BlockType) : null;
  // Keep the toolbar on screen: near an edge it lines up with that side of the selection instead of its middle
  const rf = useReactFlow();
  useViewport();
  const bounds = rf.getNodesBounds(nodes);
  const mid = rf.flowToScreenPosition({x: bounds.x + bounds.width / 2, y: bounds.y}).x;
  const wrap = typeof document !== 'undefined' ? document.querySelector('.fs-canvas')?.getBoundingClientRect() : null;
  const half = isMind ? 170 : 280;
  const side = !wrap ? 'center' : mid - half < wrap.left + 62 ? 'start' : mid + half > wrap.right - 10 ? 'end' : 'center';
  // Low on the screen, pop-ups open upwards so they are never cut off
  const popUp = !!wrap && rf.flowToScreenPosition({x: 0, y: bounds.y}).y - wrap.top > wrap.height * 0.56;
  return (
    <>
      <NodeToolbar align={side} className={`fs-toolbar nodrag fs-toolbar-${side}`} isVisible nodeId={ids} offset={16} position={Position.Top}>
        {isMind ? (
          <>
            <ToolbarBtn label="Branch colour" onClick={() => toggle('fill')}>
              <span className="fs-dot" style={{background: d.color || '#7b68ee'}} />
            </ToolbarBtn>
            <ToolbarBtn label="Icon" onClick={() => toggle('icon')}>
              {d.icon && ICONS[d.icon] ? React.createElement(ICONS[d.icon]) : <Smile />}
            </ToolbarBtn>
            <ToolbarBtn label="Sticker" onClick={() => toggle('badge')}>
              <span className="fs-emoji">{d.badge || '★'}</span>
            </ToolbarBtn>
            <ToolbarBtn label="Font and emphasis" onClick={() => toggle('size')}>
              <Type />
            </ToolbarBtn>
            <span className="fs-tb-sep" />
            {single && (
              <ToolbarBtn label="Add a branch (Tab)" onClick={onAddChild}>
                <Plus />
              </ToolbarBtn>
            )}
            {single && single.id !== mindRoot && (
              <ToolbarBtn label={d.collapsed ? 'Expand' : 'Collapse'} onClick={onCollapse}>
                <ListTree />
              </ToolbarBtn>
            )}
          </>
        ) : (
          <>
            {blockType && (
              <ToolbarBtn active={pop === 'block'} label="Style and colours" onClick={() => toggle('block')}>
                <span className="fs-tb-block">
                  <BlockGlyph k={blockKeyOf(blockType, d.variant)} />
                </span>
              </ToolbarBtn>
            )}
            {!only('image') && !anyBlock && (
              <ToolbarBtn label={only('text') ? 'Text colour' : 'Colour and look'} onClick={() => toggle('fill')}>
                <span className="fs-dot" style={{background: dot}} />
              </ToolbarBtn>
            )}
            {only('shape') && (
              <ToolbarBtn label="Shape" onClick={() => toggle('shape')}>
                <ShapeGlyph kind={d.shape || 'rounded'} />
              </ToolbarBtn>
            )}
            {hasText && (
              <>
                <ToolbarBtn label="Text size and font" onClick={() => toggle('size')}>
                  <span className="fs-tb-text">{{sm: 'S', md: 'M', lg: 'L', xl: 'XL', '2xl': 'XXL'}[d.textSize || (only('sticky') || only('text') ? 'lg' : 'md')]}</span>
                </ToolbarBtn>
                <ToolbarBtn active={!!d.bold} label="Bold" onClick={() => onUpdate({bold: !d.bold})}>
                  <Bold />
                </ToolbarBtn>
                <ToolbarBtn label="Align text" onClick={() => onUpdate({align: d.align === 'left' ? 'center' : d.align === 'center' || !d.align ? (only('text') || only('sticky') ? 'right' : 'right') : 'left'})}>
                  {d.align === 'left' ? <AlignStartVertical /> : d.align === 'right' ? <AlignEndVertical /> : <AlignCenterVertical />}
                </ToolbarBtn>
              </>
            )}
            {only('sticky') && (
              <ToolbarBtn label="Tilt" onClick={() => onUpdate({rotate: d.rotate === -4 ? 0 : d.rotate === 0 || !d.rotate ? 3 : -4})}>
                <RotateCw />
              </ToolbarBtn>
            )}
            {(only('shape') || only('card') || only('sticky')) && (
              <>
                {only('shape') && (
                  <ToolbarBtn label="Icon" onClick={() => toggle('icon')}>
                    {d.icon && ICONS[d.icon] ? React.createElement(ICONS[d.icon]) : <Smile />}
                  </ToolbarBtn>
                )}
                <ToolbarBtn label="Sticker" onClick={() => toggle('badge')}>
                  <span className="fs-emoji">{d.badge || '★'}</span>
                </ToolbarBtn>
              </>
            )}
            {!only('frame') && (
              <ToolbarBtn active={!!d.shadow || (!!d.opacity && d.opacity < 1)} label="Shadow, see-through, front and back" onClick={() => toggle('fx')}>
                <Blend />
              </ToolbarBtn>
            )}
            {single && (
              <ToolbarBtn active={!!d.link} label="Link" onClick={() => toggle('link')}>
                <Link2 />
              </ToolbarBtn>
            )}
            {nodes.length > 1 && (
              <ToolbarBtn label="Align & distribute" onClick={() => toggle('align')}>
                <AlignStartHorizontal />
              </ToolbarBtn>
            )}
            <span className="fs-tb-sep" />
            <ToolbarBtn label="Copy style (Ctrl+Alt+C)" onClick={onCopyStyle}>
              <Paintbrush />
            </ToolbarBtn>
            {onPasteStyle && (
              <ToolbarBtn label="Paste style (Ctrl+Alt+V)" onClick={onPasteStyle}>
                <span className="fs-paste-style">
                  <Paintbrush />
                </span>
              </ToolbarBtn>
            )}
            {nodes.length > 1 && !nodes.some(n => n.type === 'frame' || n.parentId) && (
              <ToolbarBtn label="Group in a section (Ctrl+G)" onClick={onGroup}>
                <Group />
              </ToolbarBtn>
            )}
            <ToolbarBtn active={locked} label={locked ? 'Unlock position' : 'Lock position'} onClick={() => onLock(!locked)}>
              {locked ? <Lock /> : <Unlock />}
            </ToolbarBtn>
            <ToolbarBtn label="Duplicate (Ctrl+D)" onClick={onDuplicate}>
              <CopyPlus />
            </ToolbarBtn>
          </>
        )}
        <ToolbarBtn label="Details" onClick={onDetails}>
          <PanelRight />
        </ToolbarBtn>
        <ToolbarBtn danger label="Delete" onClick={onDelete}>
          <Trash2 />
        </ToolbarBtn>

        {pop && (
          <div className={`fs-tb-pop ${popUp ? 'fs-tb-pop-up' : ''}`}>
            {pop === 'block' && blockType && <BlockQuickStyle d={d} onDetails={onDetails} onUpdate={p => onUpdate(p)} type={blockType} />}
            {pop === 'fill' &&
              (isMind ? (
                <div className="fs-color-panel">
                  <h6>Branch colour</h6>
                  <div className="fs-swatch-row">
                    {[...BRANCH_COLORS, ...OPG_BRANCHES.filter(c => !BRANCH_COLORS.includes(c))].map(c => (
                      <button aria-label={c} className={`fs-swatch ${d.color === c ? 'on' : ''}`} key={c} onClick={() => onUpdate({color: c})} style={{background: c}} type="button" />
                    ))}
                    <ColorInput onPick={c => onUpdate({color: c})} title="Any colour" value={d.color && !BRANCH_COLORS.includes(d.color) && !OPG_BRANCHES.includes(d.color) ? d.color : undefined} />
                  </div>
                  <h6>Fill this idea</h6>
                  <div className="fs-swatch-row">
                    {['blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'teal', 'dark'].map(k => (
                      <button aria-label={PALETTE[k].name} className={`fs-swatch ${d.fill === k ? 'on' : ''}`} key={k} onClick={() => onUpdate({fill: k, look: 'solid'})} style={{background: PALETTE[k].solid}} title={PALETTE[k].name} type="button" />
                    ))}
                    {GRADIENT_KEYS.slice(0, 5).map(k => (
                      <button aria-label={GRADIENTS[k].name} className={`fs-swatch ${d.fill === `g:${k}` ? 'on' : ''}`} key={k} onClick={() => onUpdate({fill: `g:${k}`, look: 'solid'})} style={{background: `linear-gradient(135deg, ${GRADIENTS[k].from}, ${GRADIENTS[k].to})`}} title={GRADIENTS[k].name} type="button" />
                    ))}
                  </div>
                  <button className="fs-link-btn" onClick={() => onUpdate({color: undefined, fill: undefined, look: undefined, ink: undefined})} type="button">
                    Reset to the branch colour
                  </button>
                </div>
              ) : (
                <div className="fs-color-panel">
                  {!only('text') && (
                    <>
                      <h6>{only('draw') ? 'Line colour' : 'Colour'}</h6>
                      <div className="fs-swatch-row">
                        {fills.map(k => (
                          <button
                            aria-label={k}
                            className={`fs-swatch ${custom === k ? 'on' : ''}`}
                            key={k}
                            onClick={() => onUpdate(only('draw') ? {stroke: k} : {fill: k})}
                            style={{background: swatch(k), borderColor: k === 'white' ? '#d5dae1' : undefined}}
                            title={only('sticky') || only('draw') ? k : PALETTE[k].name}
                            type="button"
                          />
                        ))}
                        <ColorInput onPick={c => onUpdate(only('draw') ? {stroke: c} : {fill: c})} title="Any colour" value={isHex(custom) && !fills.includes(custom) ? custom : undefined} />
                      </div>
                    </>
                  )}
                  {canGradient && (
                    <>
                      <h6>Gradients</h6>
                      <div className="fs-swatch-row">
                        {GRADIENT_KEYS.map(k => (
                          <button
                            aria-label={GRADIENTS[k].name}
                            className={`fs-swatch ${d.fill === `g:${k}` ? 'on' : ''}`}
                            key={k}
                            onClick={() => onUpdate({fill: `g:${k}`, ...(d.look === 'outline' ? {look: 'soft' as const} : {})})}
                            style={{background: `linear-gradient(135deg, ${GRADIENTS[k].from}, ${GRADIENTS[k].to})`}}
                            title={GRADIENTS[k].name}
                            type="button"
                          />
                        ))}
                      </div>
                    </>
                  )}
                  {only('shape') && (
                    <div className="fs-panel-row">
                      <h6>Look</h6>
                      <div className="fs-seg">
                        {(['soft', 'solid', 'outline'] as const).map(l => (
                          <button className={look === l ? 'on' : ''} key={l} onClick={() => onUpdate({look: l})} type="button">
                            {{soft: 'Soft', solid: 'Solid', outline: 'Outline'}[l]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {only('shape') && (
                    <div className="fs-panel-row">
                      <h6>Border</h6>
                      <div className="fs-seg">
                        {(['none', 'solid', 'dashed'] as const).map(b => (
                          <button className={(d.border || 'none') === b ? 'on' : ''} key={b} onClick={() => onUpdate({border: b})} type="button">
                            {{none: 'None', solid: 'Line', dashed: 'Dashed'}[b]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {(hasText || only('frame')) && (
                    <>
                      <h6>Text colour</h6>
                      <div className="fs-swatch-row">
                        <button className={`fs-swatch fs-swatch-auto ${!d.ink ? 'on' : ''}`} onClick={() => onUpdate({ink: undefined})} title="Automatic" type="button">
                          A
                        </button>
                        {TEXT_INKS.map(c => (
                          <button aria-label={c} className={`fs-swatch ${d.ink === c ? 'on' : ''}`} key={c} onClick={() => onUpdate({ink: c})} style={{background: c, borderColor: c === '#ffffff' ? '#d5dae1' : undefined}} type="button" />
                        ))}
                        <ColorInput onPick={c => onUpdate({ink: c})} title="Any text colour" value={d.ink && !TEXT_INKS.includes(d.ink) ? d.ink : undefined} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            {pop === 'shape' && (
              <div className="fs-shape-grid">
                {SHAPES.map(s => (
                  <button className={d.shape === s.kind ? 'on' : ''} key={s.kind} onClick={() => onUpdate({shape: s.kind})} title={s.name} type="button">
                    <ShapeGlyph kind={s.kind} />
                  </button>
                ))}
              </div>
            )}
            {pop === 'size' && (
              <div className="fs-color-panel">
                {!isMind && (
                  <div className="fs-seg">
                    {(['sm', 'md', 'lg', 'xl', '2xl'] as const).map(z => (
                      <button className={d.textSize === z ? 'on' : ''} key={z} onClick={() => onUpdate({textSize: z})} type="button">
                        {{sm: 'Small', md: 'Medium', lg: 'Large', xl: 'Huge', '2xl': 'Giant'}[z]}
                      </button>
                    ))}
                  </div>
                )}
                <div className="fs-seg">
                  {(
                    [
                      ['sans', 'Clean'],
                      ['serif', 'Serif'],
                      ['mono', 'Mono'],
                      ['hand', 'Handwritten'],
                    ] as const
                  ).map(([k, l]) => (
                    <button className={(d.font || 'sans') === k ? 'on' : ''} key={k} onClick={() => onUpdate({font: k})} style={{fontFamily: FONT_CSS[k]}} type="button">
                      {l}
                    </button>
                  ))}
                </div>
                <div className="fs-seg">
                  <button className={d.bold ? 'on' : ''} onClick={() => onUpdate({bold: !d.bold})} title="Bold" type="button">
                    <Bold />
                  </button>
                  <button className={d.italic ? 'on' : ''} onClick={() => onUpdate({italic: !d.italic})} title="Italic" type="button">
                    <Italic />
                  </button>
                  <button className={d.underline ? 'on' : ''} onClick={() => onUpdate({underline: !d.underline})} title="Underline" type="button">
                    <Underline />
                  </button>
                </div>
              </div>
            )}
            {pop === 'fx' && (
              <div className="fs-color-panel">
                {(only('shape') || only('card') || only('image')) && (
                  <div className="fs-panel-row">
                    <h6>Shadow</h6>
                    <div className="fs-seg">
                      <button className={d.shadow ? 'on' : ''} onClick={() => onUpdate({shadow: true})} type="button">
                        Lifted
                      </button>
                      <button className={!d.shadow ? 'on' : ''} onClick={() => onUpdate({shadow: false})} type="button">
                        Flat
                      </button>
                    </div>
                  </div>
                )}
                <div className="fs-panel-row">
                  <h6>See-through</h6>
                  <div className="fs-seg">
                    {[1, 0.75, 0.5, 0.25].map(o => (
                      <button className={(d.opacity || 1) === o ? 'on' : ''} key={o} onClick={() => onUpdate({opacity: o === 1 ? undefined : o})} type="button">
                        {o * 100}%
                      </button>
                    ))}
                  </div>
                </div>
                <div className="fs-panel-row">
                  <h6>Order</h6>
                  <div className="fs-seg">
                    <button onClick={() => onReorder(true)} title="Bring to front ( ] )" type="button">
                      <ArrowUpToLine /> Front
                    </button>
                    <button onClick={() => onReorder(false)} title="Send to back ( [ )" type="button">
                      <ArrowDownToLine /> Back
                    </button>
                  </div>
                </div>
              </div>
            )}
            {pop === 'icon' && (
              <div className="fs-icon-grid">
                <button onClick={() => onUpdate({icon: undefined})} title="No icon" type="button">
                  <X />
                </button>
                {ICON_KEYS.map(k => (
                  <button className={d.icon === k ? 'on' : ''} key={k} onClick={() => onUpdate({icon: k})} title={k} type="button">
                    {React.createElement(ICONS[k])}
                  </button>
                ))}
              </div>
            )}
            {pop === 'badge' && (
              <div className="fs-icon-grid">
                <button onClick={() => onUpdate({badge: undefined})} title="No sticker" type="button">
                  <X />
                </button>
                {BADGES.map(b => (
                  <button className={d.badge === b ? 'on' : ''} key={b} onClick={() => onUpdate({badge: b})} type="button">
                    <span className="fs-emoji">{b}</span>
                  </button>
                ))}
              </div>
            )}
            {pop === 'align' && (
              <div className="fs-icon-grid fs-align-grid">
                {(
                  [
                    ['left', AlignStartVertical, 'Align left'],
                    ['hcenter', AlignCenterVertical, 'Align centres'],
                    ['right', AlignEndVertical, 'Align right'],
                    ['top', AlignStartHorizontal, 'Align top'],
                    ['vcenter', AlignCenterHorizontal, 'Align middles'],
                    ['bottom', AlignEndHorizontal, 'Align bottom'],
                    ['dist-h', AlignHorizontalDistributeCenter, 'Space evenly across'],
                    ['dist-v', AlignVerticalDistributeCenter, 'Space evenly down'],
                  ] as const
                ).map(([k, I, t]) => (
                  <button key={k} onClick={() => onAlign(k)} title={t} type="button">
                    <I />
                  </button>
                ))}
              </div>
            )}
            {pop === 'link' && (
              <form
                className="fs-link-form"
                onSubmit={e => {
                  e.preventDefault();
                  const v = String(new FormData(e.currentTarget).get('link') || '').trim();
                  onUpdate({link: v ? (/^[a-z]+:/i.test(v) || v.startsWith('/') ? v : `https://${v}`) : undefined});
                  setPop(null);
                }}>
                <input autoFocus defaultValue={d.link || ''} name="link" placeholder="Paste a link (web page, note, file…)" />
                <button className="fs-btn fs-btn-primary" type="submit">
                  Save
                </button>
              </form>
            )}
          </div>
        )}
      </NodeToolbar>
      {canQuick &&
        !pop &&
        (['r', 'b', 'l'] as Side[]).map(s => (
          <NodeToolbar className={`fs-quick fs-quick-${s}`} isVisible key={s} nodeId={single!.id} offset={24} position={{t: Position.Top, r: Position.Right, b: Position.Bottom, l: Position.Left}[s]}>
            <button aria-label="Add a connected box" onClick={() => onQuickAdd(single!.id, s)} title="Add a connected box" type="button">
              <Plus />
            </button>
          </NodeToolbar>
        ))}
    </>
  );
}

function ToolbarBtn({children, label, onClick, active, danger}: {children: React.ReactNode; label: string; onClick: () => void; active?: boolean; danger?: boolean}) {
  return (
    <button aria-label={label} className={`fs-tb-btn ${active ? 'on' : ''} ${danger ? 'danger' : ''}`} onClick={onClick} title={label} type="button">
      {children}
    </button>
  );
}

function EdgeBar({edges, onUpdate, onLabel, onReverse, onDelete}: {edges: Edge[]; onUpdate: (p: ED, extra?: Partial<Edge>) => void; onLabel: () => void; onReverse: () => void; onDelete: () => void}) {
  const d = (edges[0].data || {}) as ED;
  const animated = edges.every(e => e.animated);
  return (
    <div className="fs-edgebar">
      <div className="fs-seg">
        {(
          [
            ['smooth', 'Elbow'],
            ['bezier', 'Curved'],
            ['straight', 'Straight'],
          ] as const
        ).map(([k, l]) => (
          <button className={(d.path || 'smooth') === k ? 'on' : ''} key={k} onClick={() => onUpdate({path: k})} type="button">
            {l}
          </button>
        ))}
      </div>
      <span className="fs-tb-sep" />
      <div className="fs-swatch-row">
        {LINE_COLORS.map(c => (
          <button aria-label={c} className={`fs-swatch fs-swatch-sm ${d.color === c ? 'on' : ''}`} key={c} onClick={() => onUpdate({color: c})} style={{background: c}} type="button" />
        ))}
        <ColorInput onPick={c => onUpdate({color: c})} title="Any colour" value={d.color && !LINE_COLORS.includes(d.color) ? d.color : undefined} />
      </div>
      <span className="fs-tb-sep" />
      <div className="fs-seg">
        {(['solid', 'dashed', 'dotted'] as const).map(k => (
          <button className={(d.dash || 'solid') === k ? 'on' : ''} key={k} onClick={() => onUpdate({dash: k})} title={k} type="button">
            <span className={`fs-line-glyph l-${k}`} />
          </button>
        ))}
      </div>
      <div className="fs-seg">
        {(
          [
            ['none', '—'],
            ['end', '→'],
            ['both', '↔'],
          ] as const
        ).map(([k, l]) => (
          <button className={(d.arrow || 'end') === k ? 'on' : ''} key={k} onClick={() => onUpdate({arrow: k})} title={`Arrows: ${k}`} type="button">
            {l}
          </button>
        ))}
      </div>
      <div className="fs-seg">
        {(
          [
            ['triangle', '▶', 'Solid arrow'],
            ['open', '›', 'Open arrow'],
            ['dot', '●', 'Dot'],
            ['diamond', '◆', 'Diamond'],
          ] as const
        ).map(([k, l, t]) => (
          <button className={(d.head || 'triangle') === k ? 'on' : ''} key={k} onClick={() => onUpdate({head: k})} title={`Arrowhead: ${t}`} type="button">
            {l}
          </button>
        ))}
      </div>
      <div className="fs-seg">
        {[2, 3, 4].map(w => (
          <button className={(d.width || 2) === w ? 'on' : ''} key={w} onClick={() => onUpdate({width: w})} title={`${w}px`} type="button">
            <span className="fs-line-glyph" style={{borderTopWidth: w}} />
          </button>
        ))}
      </div>
      <button className={`fs-tb-btn ${animated ? 'on' : ''}`} onClick={() => onUpdate({}, {animated: !animated})} title="Animate the flow" type="button">
        <Play />
      </button>
      {edges.length === 1 && (
        <button className="fs-tb-btn" onClick={onLabel} title="Add a label (or double-click the line)" type="button">
          <Type />
        </button>
      )}
      <button className="fs-tb-btn" onClick={onReverse} title="Reverse direction" type="button">
        <ArrowLeftRight />
      </button>
      <button className="fs-tb-btn danger" onClick={onDelete} title="Delete" type="button">
        <Trash2 />
      </button>
    </div>
  );
}

function SearchBox({nodes, onPick, onClose}: {nodes: Node[]; onPick: (id: string) => void; onClose: () => void}) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const hits = q.trim()
    ? nodes
        .filter(n => String((n.data as FD).label || '').toLowerCase().includes(q.trim().toLowerCase()) || String((n.data as FD).notes || '').toLowerCase().includes(q.trim().toLowerCase()))
        .slice(0, 12)
    : [];
  return (
    <div className="fs-search">
      <div className="fs-search-row">
        <Search />
        <input
          autoFocus
          onChange={e => (setQ(e.target.value), setI(0))}
          onKeyDown={e => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') (e.preventDefault(), setI(x => Math.min(x + 1, hits.length - 1)));
            if (e.key === 'ArrowUp') (e.preventDefault(), setI(x => Math.max(x - 1, 0)));
            if (e.key === 'Enter' && hits[i]) onPick(hits[i].id);
          }}
          placeholder="Find on this board…"
          value={q}
        />
        <span className="fs-muted">{q ? `${hits.length} found` : ''}</span>
        <button aria-label="Close search" className="fs-icon-btn" onClick={onClose} type="button">
          <X />
        </button>
      </div>
      {hits.length > 0 && (
        <ul>
          {hits.map((n, j) => (
            <li key={n.id}>
              <button className={j === i ? 'on' : ''} onClick={() => onPick(n.id)} type="button">
                <span className="fs-search-type">{n.type === 'mind' ? 'idea' : n.type === 'frame' ? 'section' : n.type}</span>
                {(n.data as FD).label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Shortcuts({isMind, onClose}: {isMind: boolean; onClose: () => void}) {
  const rows: [string, string][] = isMind
    ? [
        ['Tab', 'Add a branch to the selected idea'],
        ['Enter', 'Add an idea next to it'],
        ['Type / F2 / Space', 'Rename the selected idea'],
        ['Arrow keys', 'Move between ideas'],
        ['Delete', 'Remove the idea and its branches'],
        ['Drag onto another idea', 'Move it (and its branches) there'],
        ['Paste a list', 'Indented lines become branches'],
      ]
    : [
        ['V / H', 'Select / pan (or hold Space)'],
        ['R  O  D', 'Box, circle, decision'],
        ['S  T  C  F  P', 'Sticky, text, card, section, pen'],
        ['Double-click / type', 'Edit text'],
        ['Drag from a dot', 'Connect (drop on empty space to add a box)'],
        ['Arrow keys', 'Nudge (Shift for more)'],
        ['Double-click empty space', 'Add a box there'],
        ['Right-click', 'Menu for the item, connector or board'],
        ['Ctrl+D', 'Duplicate'],
        ['Ctrl+G', 'Group the selection in a section'],
        ['Ctrl+Alt+C / V', 'Copy / paste style'],
        ['[  ]', 'Send to back / bring to front'],
        ['Paste', 'Pictures, copied boxes, or text as notes'],
      ];
  const common: [string, string][] = [
    ['Ctrl+Z / Ctrl+Shift+Z', 'Undo / redo'],
    ['Ctrl+C / X / V', 'Copy / cut / paste'],
    ['Ctrl+F', 'Find'],
    ['Ctrl+ + / - / 0', 'Zoom in / out / 100%'],
    ['Shift+1', 'Fit everything'],
    ['Esc', 'Deselect'],
  ];
  return (
    <div className="fs-keys">
      <header>
        <Keyboard /> Keyboard shortcuts
        <button aria-label="Close" className="fs-icon-btn" onClick={onClose} type="button">
          <X />
        </button>
      </header>
      <dl>
        {[...rows, ...common].map(([k, v]) => (
          <React.Fragment key={k}>
            <dt>
              <kbd>{k}</kbd>
            </dt>
            <dd>{v}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}

function Inspector({
  boardName,
  isMind,
  node,
  nodes,
  edgesCount,
  settings,
  onSettings,
  onUpdate,
  onFocus,
  onClose,
  onTaskLinked,
  mindKids,
  mindRoot,
}: {
  boardName: string;
  isMind: boolean;
  node: Node | null;
  nodes: Node[];
  edgesCount: number;
  settings: Settings;
  onSettings: (p: Partial<Settings>) => void;
  onUpdate: (id: string, patch: Partial<FD>, extra?: Partial<Node>) => void;
  onFocus: (id: string) => void;
  onClose: () => void;
  onTaskLinked: (taskId: string, done: boolean) => void;
  mindKids: Record<string, string[]> | null;
  mindRoot: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setErr(null), [node?.id]);
  const d = (node?.data || {}) as FD;
  const field = (key: keyof FD, label: string, multiline = false, placeholder = '') => (
    <label className="fs-field">
      <span>{label}</span>
      {multiline ? (
        <textarea defaultValue={String(d[key] ?? '')} key={`${node!.id}-${String(key)}-${String(d[key] ?? '')}`} onBlur={e => e.target.value !== String(d[key] ?? '') && onUpdate(node!.id, {[key]: e.target.value})} placeholder={placeholder} rows={key === 'notes' ? 5 : 2} />
      ) : (
        <input defaultValue={String(d[key] ?? '')} key={`${node!.id}-${String(key)}-${String(d[key] ?? '')}`} onBlur={e => e.target.value !== String(d[key] ?? '') && onUpdate(node!.id, {[key]: e.target.value})} placeholder={placeholder} />
      )}
    </label>
  );
  const makeTask = async () => {
    if (!node) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          title: (d.label || 'Untitled step').slice(0, 200),
          notes: [d.notes, `From process flow “${boardName}”`].filter(Boolean).join('\n\n'),
          priority: 'None',
          status: d.status === 'doing' ? 'in-progress' : 'todo',
          isCompleted: false,
          bucket: 'work',
          dueDate: d.due ? new Date(`${d.due}T17:00:00`).toISOString() : null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Could not create the task');
      onUpdate(node.id, {taskId: json.data._id});
      onTaskLinked(json.data._id, false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create the task');
    } finally {
      setBusy(false);
    }
  };

  const outline = useMemo(() => {
    if (isMind && mindKids && mindRoot) {
      const rows: {id: string; label: string; depth: number}[] = [];
      const byId = new Map(nodes.map(n => [n.id, n]));
      const walk = (id: string, depth: number) => {
        rows.push({id, label: String((byId.get(id)?.data as FD)?.label || 'Idea'), depth});
        (mindKids[id] || []).forEach(k => walk(k, depth + 1));
      };
      walk(mindRoot, 0);
      return rows;
    }
    return nodes
      .filter(n => n.type !== 'draw' && n.type !== 'image')
      .map(n => ({id: n.id, label: String((n.data as FD).label || ''), depth: n.parentId ? 1 : 0, type: n.type}))
      .filter(r => r.label);
  }, [nodes, isMind, mindKids, mindRoot]);

  return (
    <aside className="fs-inspector">
      <header>
        <span>{node ? ({shape: 'Shape', sticky: 'Sticky note', text: 'Text', card: 'Card', frame: 'Section', draw: 'Drawing', image: 'Picture', mind: 'Idea', ...BLOCK_NAMES}[node.type || 'shape'] || 'Item') : 'Board'}</span>
        <button aria-label="Close details" className="fs-icon-btn" onClick={onClose} type="button">
          <X />
        </button>
      </header>
      {node ? (
        <div className="fs-inspector-body">
          {BLOCK_TYPES.has(node.type || '') && <BlockEditor node={node} onUpdate={(patch, extra) => onUpdate(node.id, patch, extra)} />}
          {node.type !== 'draw' && node.type !== 'image' && !BLOCK_TYPES.has(node.type || '') && field('label', node.type === 'frame' ? 'Section name' : 'Text', node.type !== 'frame' && node.type !== 'mind')}
          {node.type === 'card' && (
            <>
              <div className="fs-field-row">
                <label className="fs-field">
                  <span>Status</span>
                  <select onChange={e => onUpdate(node.id, {status: e.target.value as FD['status']})} value={d.status || 'todo'}>
                    {Object.entries(CARD_STATUS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="fs-field">
                  <span>Due</span>
                  <input onChange={e => onUpdate(node.id, {due: e.target.value})} type="date" value={d.due || ''} />
                </label>
              </div>
              {field('owner', 'Owner', false, 'Who is on it?')}
            </>
          )}
          {node.type !== 'draw' && field('notes', node.type === 'card' ? 'Description' : 'Notes', true, 'Details, decisions, links… (searchable)')}
          {field('link', 'Link', false, 'https://…')}
          {['shape', 'sticky', 'card', 'mind'].includes(node.type || '') && (
            <div className="fs-task-link">
              {d.taskId ? (
                <>
                  <span>
                    <Check /> Linked to a task
                  </span>
                  <a href="/notes?view=tasks" rel="noreferrer" target="_blank">
                    Open tasks
                  </a>
                  <button onClick={() => onUpdate(node.id, {taskId: undefined})} type="button">
                    Unlink
                  </button>
                </>
              ) : (
                <button className="fs-btn" disabled={busy || !d.label} onClick={() => void makeTask()} title={d.label ? 'Creates a Work task with this text' : 'Add some text first'} type="button">
                  {busy ? <Loader2 className="fs-spin" /> : <Check />} Make it a task
                </button>
              )}
              {err && <p className="fs-error">{err}</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="fs-inspector-body">
          <div className="fs-stats">
            <div>
              <b>{nodes.filter(n => n.type !== 'frame').length}</b>
              <span>{isMind ? 'ideas' : 'items'}</span>
            </div>
            <div>
              <b>{edgesCount}</b>
              <span>{isMind ? 'branches' : 'connectors'}</span>
            </div>
            {!isMind && (
              <div>
                <b>{nodes.filter(n => n.type === 'frame').length}</b>
                <span>sections</span>
              </div>
            )}
          </div>
          <h4>Board</h4>
          <div className="fs-setting">
            <span>Background</span>
            <div className="fs-seg">
              {(['dots', 'lines', 'none'] as const).map(g => (
                <button className={settings.grid === g ? 'on' : ''} key={g} onClick={() => onSettings({grid: g})} type="button">
                  {{dots: 'Dots', lines: 'Grid', none: 'Plain'}[g]}
                </button>
              ))}
            </div>
          </div>
          {isMind ? (
            <div className="fs-setting">
              <span>Layout</span>
              <div className="fs-seg">
                {(['right', 'both', 'down'] as const).map(l => (
                  <button className={settings.layout === l ? 'on' : ''} key={l} onClick={() => onSettings({layout: l})} type="button">
                    {{right: 'Right', both: 'Both sides', down: 'Top-down'}[l]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <label className="fs-check">
              <input checked={settings.snap} onChange={e => onSettings({snap: e.target.checked})} type="checkbox" /> Snap to grid
            </label>
          )}
          <label className="fs-check">
            <input checked={settings.minimap} onChange={e => onSettings({minimap: e.target.checked})} type="checkbox" /> Mini map
          </label>
          <label className="fs-check">
            <input checked={settings.scrollZoom} onChange={e => onSettings({scrollZoom: e.target.checked})} type="checkbox" /> Mouse wheel zooms (off: scrolls)
          </label>
          <h4>Outline</h4>
          {outline.length ? (
            <ul className="fs-outline">
              {outline.map(r => (
                <li key={r.id} style={{paddingLeft: 6 + r.depth * 14}}>
                  <button onClick={() => onFocus(r.id)} type="button">
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fs-muted">Everything you write on the board is listed here. Click to jump to it.</p>
          )}
        </div>
      )}
    </aside>
  );
}
