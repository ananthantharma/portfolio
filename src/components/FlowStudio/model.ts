// Flow Studio: board data, palettes, templates and conversion of boards saved by the old builder.
import type {Edge, Node} from '@xyflow/react';

export type BoardKind = 'whiteboard' | 'mindmap';
export type ShapeKind = 'rect' | 'rounded' | 'pill' | 'diamond' | 'ellipse' | 'parallelogram' | 'hexagon' | 'cylinder' | 'triangle' | 'document';
export type MindLayout = 'right' | 'both' | 'down';
export type GridKind = 'dots' | 'lines' | 'none';
export type Side = 't' | 'r' | 'b' | 'l';

/** Everything a node can carry. Each node type uses the fields it needs. */
export interface FD {
  [key: string]: unknown;
  label?: string;
  fill?: string; // palette key
  shape?: ShapeKind;
  border?: 'none' | 'solid' | 'dashed';
  textSize?: 'sm' | 'md' | 'lg' | 'xl';
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  icon?: string;
  badge?: string; // emoji sticker
  link?: string;
  notes?: string;
  taskId?: string;
  locked?: boolean;
  rotate?: number;
  // cards
  status?: 'todo' | 'doing' | 'done' | 'blocked';
  owner?: string;
  due?: string;
  // drawings
  points?: number[];
  w0?: number;
  h0?: number;
  stroke?: string;
  strokeWidth?: number;
  // images
  src?: string;
  // mind maps
  parent?: string | null;
  order?: number;
  color?: string; // branch colour (set on first-level branches)
  collapsed?: boolean;
}

export interface ED {
  [key: string]: unknown;
  path?: 'smooth' | 'bezier' | 'straight';
  color?: string;
  dash?: 'solid' | 'dashed' | 'dotted';
  arrow?: 'end' | 'start' | 'both' | 'none';
  width?: number;
  label?: string;
}

export interface Settings {
  grid: GridKind;
  snap: boolean;
  minimap: boolean;
  scrollZoom: boolean;
  layout: MindLayout;
  edge: ED;
}

export interface BoardData {
  version: 2;
  kind: BoardKind;
  nodes: Node[];
  edges: Edge[];
  settings: Settings;
  viewport?: {x: number; y: number; zoom: number};
}

export const DEFAULT_SETTINGS: Settings = {
  grid: 'dots',
  snap: false,
  minimap: false,
  scrollZoom: true,
  layout: 'right',
  edge: {path: 'smooth', color: '#3a4250', dash: 'solid', arrow: 'end', width: 2},
};

/** Fills for shapes, frames and cards: soft colours with a matching outline and text colour. */
export const PALETTE: Record<string, {name: string; fill: string; stroke: string; ink: string}> = {
  white: {name: 'White', fill: '#ffffff', stroke: '#d5dae1', ink: '#1f2430'},
  blue: {name: 'Blue', fill: '#c9e3ff', stroke: '#82b5ee', ink: '#14385f'},
  purple: {name: 'Purple', fill: '#d6d1ff', stroke: '#a59cf3', ink: '#2f2683'},
  green: {name: 'Green', fill: '#cbf3cd', stroke: '#86d28c', ink: '#175b20'},
  yellow: {name: 'Yellow', fill: '#fff0a6', stroke: '#e6cc4f', ink: '#574500'},
  orange: {name: 'Orange', fill: '#ffdab3', stroke: '#efa65e', ink: '#673300'},
  red: {name: 'Pink', fill: '#ffcfcf', stroke: '#ee9797', ink: '#761d1d'},
  teal: {name: 'Teal', fill: '#c4efea', stroke: '#74ccc2', ink: '#0c4c46'},
  gray: {name: 'Gray', fill: '#e8eaee', stroke: '#bcc3cc', ink: '#2e343c'},
  dark: {name: 'Dark', fill: '#232838', stroke: '#232838', ink: '#ffffff'},
  opgDark: {name: 'OPG Dark Green', fill: '#0C2721', stroke: '#0C2721', ink: '#ffffff'},
  opgGreen: {name: 'OPG Green', fill: '#66CC00', stroke: '#4f9e00', ink: '#0C2721'},
  opgLight: {name: 'OPG Light Green', fill: '#C7E995', stroke: '#66CC00', ink: '#0C2721'},
};
export const PALETTE_KEYS = Object.keys(PALETTE);

export const STICKY_COLORS: Record<string, string> = {
  yellow: '#fff2a1',
  pink: '#ffd1dc',
  blue: '#cde8ff',
  green: '#d3f5c9',
  purple: '#e2d9ff',
  orange: '#ffdcb5',
  opg: '#C7E995',
};

export const LINE_COLORS = ['#3a4250', '#0C2721', '#66CC00', '#7b68ee', '#3b82f6', '#16a37a', '#e5484d', '#f08c2e', '#d946ef', '#94a3b8'];
export const BRANCH_COLORS = ['#7b68ee', '#40b37c', '#e5484d', '#f08c2e', '#2b2d33', '#3b82f6', '#d946ef', '#0ea5a4'];
export const PEN_COLORS = ['#232838', '#0C2721', '#66CC00', '#7b68ee', '#3b82f6', '#16a37a', '#e5484d', '#f08c2e'];
/** OPG brand colours. */
export const OPG = {dark: '#0C2721', green: '#66CC00', light: '#C7E995', mid: '#3F8F1E'};
export const OPG_BRANCHES = [OPG.dark, OPG.green, OPG.mid, '#8CC63F'];

/**
 * Recolours nodes and edges in the OPG theme. Only the given ids change when a list is passed.
 * Start/end shapes go dark green, decisions and cards OPG green, other boxes, stickies and sections light green,
 * connectors dark green, and mind map branches take turns through the greens.
 */
export function opgTheme(nodes: Node[], edges: Edge[], only?: Set<string>): {nodes: Node[]; edges: Edge[]} {
  const hit = (id: string) => !only || only.has(id);
  const kids: Record<string, Node[]> = {};
  let rootId = '';
  for (const n of nodes) {
    if (n.type !== 'mind') continue;
    const p = (n.data as FD).parent;
    if (p) (kids[p] = kids[p] || []).push(n);
    else rootId = n.id;
  }
  const branchColor: Record<string, string> = {};
  (kids[rootId] || [])
    .sort((a, b) => ((a.data as FD).order ?? 0) - ((b.data as FD).order ?? 0))
    .forEach((n, i) => (branchColor[n.id] = OPG_BRANCHES[i % OPG_BRANCHES.length]));

  const next = nodes.map(n => {
    if (!hit(n.id)) return n;
    const d = n.data as FD;
    let patch: Partial<FD> = {};
    switch (n.type) {
      case 'shape': {
        const s = d.shape || 'rounded';
        const fill = s === 'ellipse' || s === 'pill' ? 'opgDark' : s === 'diamond' ? 'opgGreen' : 'opgLight';
        patch = {fill, border: fill === 'opgLight' ? d.border && d.border !== 'none' ? d.border : 'solid' : d.border};
        break;
      }
      case 'sticky':
        patch = {fill: 'opg'};
        break;
      case 'card':
        patch = {fill: 'opgGreen'};
        break;
      case 'frame':
        patch = {fill: 'opgLight'};
        break;
      case 'draw':
        patch = {stroke: OPG.dark};
        break;
      case 'mind':
        patch = n.id === rootId ? {fill: 'opgDark', color: OPG.dark} : branchColor[n.id] ? {color: branchColor[n.id]} : {color: undefined};
        break;
      default:
        return n;
    }
    return {...n, data: {...d, ...patch}};
  });
  const nextEdges = edges.map(e => {
    if (only && !only.has(e.id) && !(only.has(e.source) && only.has(e.target))) return e;
    if (e.type === 'mind') return e;
    return {...e, data: {...e.data, color: OPG.dark}};
  });
  return {nodes: next, edges: nextEdges};
}

export const BADGES = ['⭐', '🚩', '⚠️', '✅', '🔴', '⏱️', '💲', '📌', '❗', '🔒', '💡', '🎯'];

export const SHAPES: {kind: ShapeKind; name: string}[] = [
  {kind: 'rounded', name: 'Rounded box'},
  {kind: 'rect', name: 'Box'},
  {kind: 'pill', name: 'Start / end'},
  {kind: 'diamond', name: 'Decision'},
  {kind: 'ellipse', name: 'Circle'},
  {kind: 'parallelogram', name: 'Input / output'},
  {kind: 'document', name: 'Document'},
  {kind: 'cylinder', name: 'Database'},
  {kind: 'hexagon', name: 'Preparation'},
  {kind: 'triangle', name: 'Triangle'},
];

export const CARD_STATUS: Record<NonNullable<FD['status']>, {label: string; color: string}> = {
  todo: {label: 'To do', color: '#94a3b8'},
  doing: {label: 'In progress', color: '#3b82f6'},
  done: {label: 'Done', color: '#16a37a'},
  blocked: {label: 'Blocked', color: '#e5484d'},
};

export const uid = (p = 'n') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ── Node factories ─────────────────────────────────────────────────────────
export function shapeNode(x: number, y: number, label = '', extra: Partial<FD> = {}, w = 200, h = 72): Node {
  return {id: uid(), type: 'shape', position: {x, y}, width: w, height: h, data: {label, shape: 'rounded', fill: 'blue', border: 'none', textSize: 'md', ...extra}};
}
export function stickyNode(x: number, y: number, label = '', fill = 'yellow', rotate = 0): Node {
  return {id: uid(), type: 'sticky', position: {x, y}, width: 180, height: 170, data: {label, fill, rotate}};
}
export function textNode(x: number, y: number, label = '', textSize: FD['textSize'] = 'lg'): Node {
  return {id: uid(), type: 'text', position: {x, y}, width: 240, data: {label, textSize, align: 'left'}};
}
export function cardNode(x: number, y: number, label = '', extra: Partial<FD> = {}): Node {
  return {id: uid(), type: 'card', position: {x, y}, width: 250, data: {label, fill: 'purple', status: 'todo', ...extra}};
}
export function frameNode(x: number, y: number, label = 'Section', fill = 'gray', w = 640, h = 420): Node {
  return {id: uid('f'), type: 'frame', position: {x, y}, width: w, height: h, data: {label, fill}, zIndex: -1};
}
export function mindNode(label: string, parent: string | null, order: number, extra: Partial<FD> = {}): Node {
  return {id: uid('m'), type: 'mind', position: {x: 0, y: 0}, data: {label, parent, order, ...extra}};
}
export function flowEdge(source: string, target: string, data: ED = {}, sourceHandle?: Side, targetHandle?: Side): Edge {
  return {id: uid('e'), type: 'flow', source, target, sourceHandle: sourceHandle ?? null, targetHandle: targetHandle ?? null, data: {...DEFAULT_SETTINGS.edge, ...data}};
}

/** Frames first so the nodes inside them always come after their parent. */
export const framesFirst = (nodes: Node[]) => [...nodes.filter(n => n.type === 'frame'), ...nodes.filter(n => n.type !== 'frame')];

/** Best sides to join two boxes (used for old boards and AI builds). */
export function autoSides(a: {x: number; y: number; w: number; h: number}, b: {x: number; y: number; w: number; h: number}): [Side, Side] {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  const dy = b.y + b.h / 2 - (a.y + a.h / 2);
  if (Math.abs(dy) >= Math.abs(dx)) return dy >= 0 ? ['b', 't'] : ['t', 'b'];
  return dx >= 0 ? ['r', 'l'] : ['l', 'r'];
}

// ── Saving ─────────────────────────────────────────────────────────────────
const TRANSIENT = ['selected', 'dragging', 'resizing', 'measured'];
export function cleanNodes(nodes: Node[]): Node[] {
  return nodes.map(n => {
    const copy: Record<string, unknown> = {...n};
    TRANSIENT.forEach(k => delete copy[k]);
    if (n.type === 'mind') {
      delete copy.hidden;
    }
    return copy as unknown as Node;
  });
}
export function cleanEdges(edges: Edge[]): Edge[] {
  return edges.map(e => {
    const copy: Record<string, unknown> = {...e};
    delete copy.selected;
    return copy as unknown as Edge;
  });
}

/** A tiny sketch of the board for the gallery cards (boxes and lines in a 0-100 space). */
export interface Preview {
  r: [number, number, number, number, string, number][]; // x, y, w, h, colour, kind (0 box, 1 round, 2 frame, 3 sticky)
  l: [number, number, number, number, string][];
  ratio: number;
}
export function makePreview(nodes: Node[], edges: Edge[], kind: BoardKind, layoutOf?: (nodes: Node[]) => Map<string, {x: number; y: number; w: number; h: number}>): Preview {
  const abs = new Map<string, {x: number; y: number; w: number; h: number}>();
  const byId = new Map(nodes.map(n => [n.id, n]));
  const placed = layoutOf ? layoutOf(nodes) : null;
  for (const n of nodes) {
    if (n.hidden) continue;
    let x = n.position.x;
    let y = n.position.y;
    if (n.parentId) {
      const p = byId.get(n.parentId);
      if (p) {
        x += p.position.x;
        y += p.position.y;
      }
    }
    const w = (n.width ?? n.measured?.width ?? 160) as number;
    const h = (n.height ?? n.measured?.height ?? 44) as number;
    abs.set(n.id, placed?.get(n.id) || {x, y, w, h});
  }
  if (!abs.size) return {r: [], l: [], ratio: 1.6};
  const xs = [...abs.values()];
  const minX = Math.min(...xs.map(b => b.x));
  const minY = Math.min(...xs.map(b => b.y));
  const maxX = Math.max(...xs.map(b => b.x + b.w));
  const maxY = Math.max(...xs.map(b => b.y + b.h));
  const span = Math.max(maxX - minX, maxY - minY, 1);
  const s = (v: number) => Math.round((v / span) * 1000) / 10;
  const colorOf = (n: Node) => {
    const d = n.data as FD;
    if (n.type === 'sticky') return STICKY_COLORS[d.fill || 'yellow'] || '#fff2a1';
    if (n.type === 'mind') return '#ffffff';
    if (n.type === 'draw') return 'none';
    return PALETTE[d.fill || 'blue']?.fill || '#c9e3ff';
  };
  const r: Preview['r'] = [];
  for (const n of nodes) {
    const b = abs.get(n.id);
    if (!b || n.type === 'draw' || n.type === 'image') continue;
    r.push([s(b.x - minX), s(b.y - minY), Math.max(s(b.w), 1.5), Math.max(s(b.h), 1.5), colorOf(n), n.type === 'frame' ? 2 : n.type === 'sticky' ? 3 : (n.data as FD).shape === 'pill' || n.type === 'mind' ? 1 : 0]);
    if (r.length > 90) break;
  }
  const l: Preview['l'] = [];
  const lines: [string, string, string][] =
    kind === 'mindmap'
      ? nodes.filter(n => (n.data as FD).parent && abs.has(n.id) && abs.has((n.data as FD).parent!)).map(n => [(n.data as FD).parent!, n.id, '#b5bcc8'])
      : edges.map(e => [e.source, e.target, ((e.data as ED)?.color as string) || '#8892a2']);
  for (const [a, b, c] of lines) {
    const p = abs.get(a);
    const q = abs.get(b);
    if (!p || !q) continue;
    l.push([s(p.x + p.w / 2 - minX), s(p.y + p.h / 2 - minY), s(q.x + q.w / 2 - minX), s(q.y + q.h / 2 - minY), c]);
    if (l.length > 120) break;
  }
  return {r, l, ratio: (maxX - minX || 1) / (maxY - minY || 1)};
}

// ── Old boards (the original builder) ──────────────────────────────────────
type LegacyNode = {id: string; x: number; y: number; w: number; h: number; title?: string; sub?: string; theme?: string; shape?: string; badge?: string};
type LegacyEdge = {id: string; from: string; to: string; fromSide?: string | null; toSide?: string | null; label?: string; color?: string; style?: string};
const THEME_FILL: Record<string, string> = {start: 'dark', blue: 'blue', green: 'green', grey: 'gray', amber: 'yellow', purple: 'purple', red: 'red'};

export function isBoardData(v: unknown): v is BoardData {
  return !!v && typeof v === 'object' && (v as BoardData).version === 2 && Array.isArray((v as BoardData).nodes);
}

/** Opens anything we might have saved: a new board, an old-builder board, or nothing. */
export function toBoard(raw: unknown, kindHint: BoardKind = 'whiteboard'): BoardData {
  if (isBoardData(raw)) return {...raw, settings: {...DEFAULT_SETTINGS, ...raw.settings, edge: {...DEFAULT_SETTINGS.edge, ...(raw.settings?.edge || {})}}};
  const old = (raw || {}) as {nodes?: LegacyNode[]; edges?: LegacyEdge[]; canvasBg?: string};
  const nodes: Node[] = (old.nodes || []).map(n => ({
    id: String(n.id),
    type: 'shape',
    position: {x: n.x || 0, y: n.y || 0},
    width: n.w || 200,
    height: n.h || 72,
    data: {
      label: [n.title, n.sub].filter(Boolean).join('\n'),
      shape: n.shape === 'pill' ? 'pill' : 'rounded',
      fill: THEME_FILL[n.theme || 'blue'] || 'blue',
      border: 'none',
      textSize: 'md',
      ...(n.badge ? {badge: n.badge} : {}),
    } as FD,
  }));
  const box = new Map((old.nodes || []).map(n => [String(n.id), {x: n.x, y: n.y, w: n.w || 200, h: n.h || 72}]));
  const sideOf = (s?: string | null): Side | null => (s && ['t', 'r', 'b', 'l'].includes(s) ? (s as Side) : null);
  const edges: Edge[] = (old.edges || [])
    .filter(e => box.has(String(e.from)) && box.has(String(e.to)))
    .map(e => {
      const [fs, ts] = autoSides(box.get(String(e.from))!, box.get(String(e.to))!);
      return {
        id: String(e.id),
        type: 'flow',
        source: String(e.from),
        target: String(e.to),
        sourceHandle: sideOf(e.fromSide) || fs,
        targetHandle: sideOf(e.toSide) || ts,
        data: {...DEFAULT_SETTINGS.edge, label: e.label || '', ...(e.color ? {color: e.color} : {}), dash: e.style === 'dashed' ? 'dashed' : e.style === 'dotted' ? 'dotted' : 'solid'},
      };
    });
  return {version: 2, kind: kindHint, nodes, edges, settings: {...DEFAULT_SETTINGS}};
}

// ── Templates ──────────────────────────────────────────────────────────────
export interface Template {
  key: string;
  name: string;
  kind: BoardKind;
  blurb: string;
  build: () => BoardData;
}

const board = (kind: BoardKind, nodes: Node[], edges: Edge[] = [], settings: Partial<Settings> = {}): BoardData => ({version: 2, kind, nodes: framesFirst(nodes), edges, settings: {...DEFAULT_SETTINGS, ...settings}});

function tree(spec: {label: string; icon?: string; children?: unknown[]}, layout: MindLayout = 'right'): BoardData {
  const nodes: Node[] = [];
  const walk = (s: {label: string; icon?: string; children?: unknown[]}, parent: string | null, order: number, depth: number, color?: string) => {
    const n = mindNode(s.label, parent, order, {...(s.icon ? {icon: s.icon} : {}), ...(depth === 1 && color ? {color} : {})});
    nodes.push(n);
    (s.children || []).forEach((c, i) => walk(c as typeof s, n.id, i, depth + 1, depth === 0 ? BRANCH_COLORS[i % BRANCH_COLORS.length] : color));
  };
  walk(spec, null, 0, 0);
  return board('mindmap', nodes, [], {layout});
}

export function connect(a: Node, b: Node, data: ED = {}): Edge {
  const box = (n: Node) => ({x: n.position.x, y: n.position.y, w: (n.width as number) || 200, h: (n.height as number) || 72});
  const [s, t] = autoSides(box(a), box(b));
  return flowEdge(a.id, b.id, data, s, t);
}

export const TEMPLATES: Template[] = [
  {key: 'blank', name: 'Blank whiteboard', kind: 'whiteboard', blurb: 'An empty canvas', build: () => board('whiteboard', [])},
  {
    key: 'flowchart',
    name: 'Flowchart',
    kind: 'whiteboard',
    blurb: 'Steps, a decision and a loop back',
    build: () => {
      const start = shapeNode(260, 0, 'Request received', {shape: 'pill', fill: 'dark'}, 200, 56);
      const review = shapeNode(260, 120, 'Review the request', {fill: 'blue'});
      const ok = shapeNode(250, 250, 'Approved?', {shape: 'diamond', fill: 'purple'}, 220, 120);
      const work = shapeNode(260, 430, 'Do the work', {fill: 'green'});
      const back = shapeNode(580, 274, 'Send back with notes', {fill: 'red'});
      const end = shapeNode(260, 560, 'Done', {shape: 'pill', fill: 'dark'}, 200, 56);
      return board('whiteboard', [start, review, ok, work, back, end], [
        connect(start, review),
        connect(review, ok),
        flowEdge(ok.id, work.id, {label: 'Yes'}, 'b', 't'),
        flowEdge(ok.id, back.id, {label: 'No'}, 'r', 'l'),
        flowEdge(back.id, review.id, {dash: 'dashed'}, 't', 'r'),
        connect(work, end),
      ]);
    },
  },
  {
    key: 'journey',
    name: 'Customer journey',
    kind: 'whiteboard',
    blurb: 'Awareness to action, with content and a persona',
    build: () => {
      const aw = shapeNode(0, 0, 'Awareness', {shape: 'rect'}, 210, 64);
      const int = shapeNode(80, 150, 'Interest', {shape: 'rect'}, 210, 60);
      const dec = shapeNode(80, 250, 'Decision', {shape: 'rect'}, 210, 60);
      const act = shapeNode(80, 350, 'Action', {shape: 'rect'}, 210, 60);
      const web = shapeNode(450, 60, 'Website', {shape: 'rect', fill: 'purple'}, 210, 64);
      const offer = shapeNode(560, 200, 'Offer', {shape: 'rect', fill: 'purple'}, 210, 60);
      const dl = shapeNode(560, 290, 'Download', {shape: 'rect', fill: 'purple'}, 210, 60);
      const home = shapeNode(780, 60, 'Homepage', {shape: 'rect', fill: 'green'}, 210, 64);
      const blog = shapeNode(700, 420, 'Blog', {shape: 'rect', fill: 'green'}, 210, 64);
      const persona = cardNode(330, 420, 'Persona', {fill: 'green', owner: 'Claire', status: 'doing'});
      const note = stickyNode(60, 500, 'Audience research', 'yellow', -6);
      const publish = shapeNode(1040, 520, 'Publish!', {shape: 'rect', fill: 'red'}, 150, 56);
      return board('whiteboard', [aw, int, dec, act, web, offer, dl, home, blog, persona, note, publish], [
        flowEdge(aw.id, int.id, {}, 'b', 't'),
        flowEdge(int.id, dec.id, {}, 'b', 't'),
        flowEdge(dec.id, act.id, {}, 'b', 't'),
        flowEdge(dec.id, web.id, {}, 'r', 'l'),
        flowEdge(web.id, home.id, {}, 'r', 'l'),
        flowEdge(web.id, offer.id, {}, 'b', 'l'),
        flowEdge(web.id, dl.id, {}, 'b', 'l'),
        flowEdge(home.id, blog.id, {}, 'r', 't'),
        flowEdge(persona.id, int.id, {}, 'l', 'l'),
        flowEdge(blog.id, publish.id, {}, 'r', 't'),
      ]);
    },
  },
  {
    key: 'swimlane',
    name: 'Swimlane process',
    kind: 'whiteboard',
    blurb: 'Who does what, lane by lane',
    build: () => {
      const lanes = ['Requester', 'Manager', 'Finance'].map((l, i) => frameNode(0, i * 230, l, ['blue', 'purple', 'green'][i], 1180, 210));
      const step = (lane: number, x: number, label: string, extra: Partial<FD> = {}, w = 190, h = 64) => ({...shapeNode(x, 0, label, {fill: 'white', border: 'solid', ...extra}, w, h), parentId: lanes[lane].id, position: {x, y: (210 - h) / 2 + 12}});
      const a = step(0, 60, 'Submit request', {shape: 'pill', fill: 'dark'});
      const b = step(1, 300, 'Review', {});
      const c = step(1, 540, 'Approve?', {shape: 'diamond', fill: 'purple', border: 'none'}, 190, 100);
      const d = step(2, 780, 'Raise PO', {});
      const e = step(0, 980, 'Notified', {shape: 'pill', fill: 'dark'}, 160);
      return board('whiteboard', [...lanes, a, b, c, d, e], [
        flowEdge(a.id, b.id, {}, 'r', 'l'),
        flowEdge(b.id, c.id, {}, 'r', 'l'),
        flowEdge(c.id, d.id, {label: 'Yes'}, 'r', 'l'),
        flowEdge(c.id, a.id, {label: 'No', dash: 'dashed'}, 't', 't'),
        flowEdge(d.id, e.id, {}, 'r', 'b'),
      ]);
    },
  },
  {
    key: 'brainstorm',
    name: 'Brainstorm',
    kind: 'whiteboard',
    blurb: 'Sticky notes, then pick the best',
    build: () => {
      const ideas = frameNode(0, 0, 'Ideas', 'yellow', 640, 420);
      const top = frameNode(700, 0, 'Top picks', 'green', 400, 420);
      const colors = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange'];
      const notes = colors.map((c, i) => ({...stickyNode(0, 0, i === 0 ? 'Write an idea' : '', c, [-2, 1, 3, -1, 2, -3][i]), parentId: ideas.id, position: {x: 30 + (i % 3) * 200, y: 50 + Math.floor(i / 3) * 180}}));
      return board('whiteboard', [ideas, top, ...notes]);
    },
  },
  {
    key: 'retro',
    name: 'Retrospective',
    kind: 'whiteboard',
    blurb: 'Went well, to improve, actions',
    build: () => {
      const cols = [
        ['Went well', 'green', 'green'],
        ['To improve', 'red', 'pink'],
        ['Actions', 'blue', 'blue'],
      ].map(([l, f], i) => frameNode(i * 420, 0, l, f, 390, 560));
      const notes = cols.map((f, i) => ({...stickyNode(0, 0, '', ['green', 'pink', 'blue'][i]), parentId: f.id, position: {x: 105, y: 60}}));
      return board('whiteboard', [...cols, ...notes]);
    },
  },
  {
    key: 'swot',
    name: 'SWOT analysis',
    kind: 'whiteboard',
    blurb: 'Strengths, weaknesses, opportunities, threats',
    build: () => {
      const q = [
        ['Strengths', 'green'],
        ['Weaknesses', 'red'],
        ['Opportunities', 'blue'],
        ['Threats', 'orange'],
      ].map(([l, f], i) => frameNode((i % 2) * 520, Math.floor(i / 2) * 400, l, f, 500, 380));
      return board('whiteboard', [...q, textNode(0, -80, 'SWOT: ', 'xl')]);
    },
  },
  {
    key: 'mind-blank',
    name: 'Mind map',
    kind: 'mindmap',
    blurb: 'A central idea and three branches',
    build: () => tree({label: 'Central idea', children: [{label: 'Branch one', icon: 'lightbulb'}, {label: 'Branch two', icon: 'target'}, {label: 'Branch three', icon: 'star'}]}),
  },
  {
    key: 'mind-project',
    name: 'Project plan map',
    kind: 'mindmap',
    blurb: 'Everything, broken into workstreams',
    build: () =>
      tree({
        label: 'Everything',
        children: [
          {label: 'Product', icon: 'bag'},
          {
            label: 'Development',
            icon: 'hammer',
            children: ['Roadmap', 'Automation', 'Sprints', 'Tooling', 'QA', 'Analytics', 'iOS', 'Android'].map(l => ({label: l, icon: 'folder'})).concat([{label: 'Notes', icon: 'list'}]),
          },
          {label: 'Sales', icon: 'banknote'},
          {label: 'Marketing', icon: 'wifi'},
          {label: 'Content', icon: 'text'},
        ],
      }),
  },
  {
    key: 'org',
    name: 'Org chart',
    kind: 'mindmap',
    blurb: 'A team, top-down',
    build: () =>
      tree(
        {
          label: 'Director',
          icon: 'user',
          children: [
            {label: 'Manager, Delivery', icon: 'users', children: [{label: 'Analyst'}, {label: 'Analyst'}]},
            {label: 'Manager, Vendors', icon: 'users', children: [{label: 'Coordinator'}]},
            {label: 'Manager, Finance', icon: 'users', children: [{label: 'Accountant'}]},
          ],
        },
        'down',
      ),
  },
];

// ── AI builds ──────────────────────────────────────────────────────────────
export interface AiStep {
  id: string;
  label: string;
  type?: 'start' | 'end' | 'step' | 'decision' | 'data' | 'document' | 'note';
  lane?: string;
}
export interface AiFlow {
  title?: string;
  lanes?: string[];
  steps: AiStep[];
  links: {from: string; to: string; label?: string}[];
}
export interface AiTree {
  label: string;
  icon?: string;
  children?: AiTree[];
}

const STEP_STYLE: Record<NonNullable<AiStep['type']>, {shape: ShapeKind; fill: string; w: number; h: number}> = {
  start: {shape: 'pill', fill: 'dark', w: 190, h: 56},
  end: {shape: 'pill', fill: 'dark', w: 190, h: 56},
  step: {shape: 'rounded', fill: 'blue', w: 200, h: 68},
  decision: {shape: 'diamond', fill: 'purple', w: 210, h: 110},
  data: {shape: 'parallelogram', fill: 'teal', w: 210, h: 68},
  document: {shape: 'document', fill: 'yellow', w: 200, h: 76},
  note: {shape: 'rounded', fill: 'gray', w: 200, h: 68},
};

/** Turns the AI's steps and links into boxes and arrows (laid out by the caller). */
export function nodesFromAiFlow(flow: AiFlow): {nodes: Node[]; edges: Edge[]; idMap: Map<string, string>} {
  const idMap = new Map<string, string>();
  const nodes: Node[] = [];
  for (const s of flow.steps || []) {
    if (!s || !s.id || idMap.has(String(s.id))) continue;
    const type = s.type && STEP_STYLE[s.type] ? s.type : 'step';
    if (type === 'note') {
      const n = stickyNode(0, 0, String(s.label || ''), 'yellow');
      idMap.set(String(s.id), n.id);
      nodes.push({...n, data: {...n.data, lane: s.lane || ''}});
      continue;
    }
    const st = STEP_STYLE[type];
    const n = shapeNode(0, 0, String(s.label || ''), {shape: st.shape, fill: st.fill}, st.w, st.h);
    n.data = {...n.data, lane: s.lane || ''};
    idMap.set(String(s.id), n.id);
    nodes.push(n);
  }
  const edges: Edge[] = [];
  for (const l of flow.links || []) {
    const a = idMap.get(String(l.from));
    const b = idMap.get(String(l.to));
    if (a && b && a !== b) edges.push(flowEdge(a, b, l.label ? {label: String(l.label)} : {}));
  }
  return {nodes, edges, idMap};
}

export function nodesFromAiTree(root: AiTree, parent: string | null = null, startOrder = 0, inheritColor?: string, depthBase = 0): Node[] {
  const nodes: Node[] = [];
  const walk = (t: AiTree, p: string | null, order: number, depth: number, color?: string) => {
    if (!t || typeof t.label !== 'string') return;
    const n = mindNode(t.label.slice(0, 120), p, order, {...(t.icon ? {icon: t.icon} : {}), ...(depth === 1 && color ? {color} : {})});
    nodes.push(n);
    (t.children || []).slice(0, 40).forEach((c, i) => walk(c, n.id, i, depth + 1, depth === 0 ? BRANCH_COLORS[i % BRANCH_COLORS.length] : color));
  };
  walk(root, parent, startOrder, depthBase, inheritColor);
  return nodes;
}
