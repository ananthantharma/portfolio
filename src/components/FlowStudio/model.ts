// Flow Studio: board data, palettes, templates and conversion of boards saved by the old builder.
import type {Edge, Node} from '@xyflow/react';

export type BoardKind = 'whiteboard' | 'mindmap';
export type ShapeKind =
  | 'rect'
  | 'rounded'
  | 'pill'
  | 'diamond'
  | 'ellipse'
  | 'parallelogram'
  | 'hexagon'
  | 'cylinder'
  | 'triangle'
  | 'document'
  | 'chevron'
  | 'arrow'
  | 'callout'
  | 'star'
  | 'cloud'
  | 'octagon'
  | 'pentagon'
  | 'trapezoid'
  | 'cross'
  | 'heart'
  | 'shield';
/** How a colour is applied: a soft tint, the full colour, or just an outline. */
export type Look = 'soft' | 'solid' | 'outline';
export type FontKind = 'sans' | 'serif' | 'mono' | 'hand';
export type TextSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type MindLayout = 'right' | 'both' | 'down';
export type GridKind = 'dots' | 'lines' | 'none';
export type Side = 't' | 'r' | 'b' | 'l';

/** Everything a node can carry. Each node type uses the fields it needs. */
export interface FD {
  [key: string]: unknown;
  label?: string;
  fill?: string; // palette key, any "#rrggbb", or "g:<gradient>"
  look?: Look;
  ink?: string; // text colour override ("#rrggbb")
  shape?: ShapeKind;
  border?: 'none' | 'solid' | 'dashed';
  textSize?: TextSize;
  font?: FontKind;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  shadow?: boolean;
  opacity?: number; // 0.25 - 1
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
  head?: 'triangle' | 'open' | 'dot' | 'diamond';
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
  canvas: string; // key of CANVASES
  mindLine: 'curve' | 'elbow' | 'straight';
  mindStyle: 'card' | 'pill' | 'line';
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
  canvas: 'light',
  mindLine: 'curve',
  mindStyle: 'card',
};

/** Fills for shapes, frames and cards: a soft tint with a matching outline and text colour, plus the full-strength colour. */
export const PALETTE: Record<string, {name: string; fill: string; stroke: string; ink: string; solid: string}> = {
  white: {name: 'White', fill: '#ffffff', stroke: '#d5dae1', ink: '#1f2430', solid: '#ffffff'},
  blue: {name: 'Blue', fill: '#c9e3ff', stroke: '#82b5ee', ink: '#14385f', solid: '#3b82f6'},
  sky: {name: 'Sky', fill: '#cdeefd', stroke: '#7cc8ee', ink: '#0f4a66', solid: '#0ea5e9'},
  indigo: {name: 'Indigo', fill: '#d9dcff', stroke: '#9aa2f2', ink: '#262d80', solid: '#4f46e5'},
  purple: {name: 'Purple', fill: '#d6d1ff', stroke: '#a59cf3', ink: '#2f2683', solid: '#7b68ee'},
  pink: {name: 'Pink', fill: '#ffd6ec', stroke: '#f08fc0', ink: '#7a1f52', solid: '#ec4899'},
  red: {name: 'Red', fill: '#ffcfcf', stroke: '#ee9797', ink: '#761d1d', solid: '#e5484d'},
  orange: {name: 'Orange', fill: '#ffdab3', stroke: '#efa65e', ink: '#673300', solid: '#f97316'},
  yellow: {name: 'Yellow', fill: '#fff0a6', stroke: '#e6cc4f', ink: '#574500', solid: '#facc15'},
  lime: {name: 'Lime', fill: '#e3f6b5', stroke: '#b3d95c', ink: '#3f5606', solid: '#84cc16'},
  green: {name: 'Green', fill: '#cbf3cd', stroke: '#86d28c', ink: '#175b20', solid: '#16a34a'},
  teal: {name: 'Teal', fill: '#c4efea', stroke: '#74ccc2', ink: '#0c4c46', solid: '#0d9488'},
  gray: {name: 'Gray', fill: '#e8eaee', stroke: '#bcc3cc', ink: '#2e343c', solid: '#64748b'},
  dark: {name: 'Dark', fill: '#232838', stroke: '#232838', ink: '#ffffff', solid: '#232838'},
  opgDark: {name: 'OPG Dark Green', fill: '#0C2721', stroke: '#0C2721', ink: '#ffffff', solid: '#0C2721'},
  opgGreen: {name: 'OPG Green', fill: '#66CC00', stroke: '#4f9e00', ink: '#0C2721', solid: '#66CC00'},
  opgLight: {name: 'OPG Light Green', fill: '#C7E995', stroke: '#66CC00', ink: '#0C2721', solid: '#C7E995'},
};
export const PALETTE_KEYS = Object.keys(PALETTE);

/** Two-colour fills (stored as "g:<key>"). */
export const GRADIENTS: Record<string, {name: string; from: string; to: string; ink: string}> = {
  sunset: {name: 'Sunset', from: '#ea580c', to: '#db2777', ink: '#ffffff'},
  fire: {name: 'Fire', from: '#dc2626', to: '#ea580c', ink: '#ffffff'},
  grape: {name: 'Grape', from: '#6d28d9', to: '#a855f7', ink: '#ffffff'},
  ocean: {name: 'Ocean', from: '#1e40af', to: '#0284c7', ink: '#ffffff'},
  aurora: {name: 'Aurora', from: '#0d9488', to: '#4f46e5', ink: '#ffffff'},
  forest: {name: 'Forest', from: '#065f46', to: '#059669', ink: '#ffffff'},
  night: {name: 'Night', from: '#0f172a', to: '#334155', ink: '#ffffff'},
  opg: {name: 'OPG', from: '#0C2721', to: '#3F8F1E', ink: '#ffffff'},
  rose: {name: 'Rose', from: '#fecdd3', to: '#fbcfe8', ink: '#831843'},
  dawn: {name: 'Dawn', from: '#fde68a', to: '#fca5a5', ink: '#7c2d12'},
};
export const GRADIENT_KEYS = Object.keys(GRADIENTS);

// ── Colour maths ───────────────────────────────────────────────────────────
export const isHex = (v?: string | null): v is string => !!v && /^#[0-9a-f]{6}$/i.test(v);
const rgbOf = (hex: string): [number, number, number] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
/** Blends two "#rrggbb" colours; t = how much of the second. */
export function mix(a: string, b: string, t: number): string {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
/** Perceived lightness, 0 (black) to 1 (white). */
export function lightness(hex: string): number {
  const [r, g, b] = rgbOf(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
/** Readable text colour on top of a colour. */
export const inkOn = (hex: string) => (lightness(hex) > 0.62 ? '#1f2430' : '#ffffff');

export interface Paint {
  /** CSS background (a colour or a gradient) */
  bg: string;
  /** One flat colour standing in for the fill (previews, mini map) */
  flat: string;
  stroke: string;
  ink: string;
  /** The full-strength colour (dots, avatars, accents) */
  accent: string;
  grad?: [string, string];
}

/** Works out the colours for an item from its fill (palette key, custom colour or gradient), look and text colour. */
export function paint(d: Pick<FD, 'fill' | 'look' | 'ink'>, fallback = 'blue'): Paint {
  const key = d.fill || fallback;
  const look = d.look || 'soft';
  let p: Paint;
  if (key.startsWith('g:')) {
    const g = GRADIENTS[key.slice(2)] || GRADIENTS.grape;
    p =
      look === 'outline'
        ? {bg: '#ffffff', flat: '#ffffff', stroke: g.from, ink: mix(g.from, '#000000', 0.35), accent: g.from}
        : {bg: `linear-gradient(135deg, ${g.from}, ${g.to})`, flat: mix(g.from, g.to, 0.5), stroke: g.from, ink: g.ink, accent: g.from, grad: [g.from, g.to]};
  } else {
    const base = isHex(key)
      ? {fill: mix(key, '#ffffff', 0.78), stroke: mix(key, '#ffffff', 0.35), ink: mix(key, '#000000', 0.62), solid: key}
      : PALETTE[key] || PALETTE[fallback] || PALETTE.blue;
    const pale = lightness(base.solid) > 0.93;
    if (look === 'solid') p = {bg: base.solid, flat: base.solid, stroke: pale ? '#d5dae1' : mix(base.solid, '#000000', 0.14), ink: inkOn(base.solid), accent: base.solid};
    else if (look === 'outline') p = {bg: '#ffffff', flat: '#ffffff', stroke: pale ? '#aab2bf' : base.solid, ink: pale ? '#1f2430' : mix(base.solid, '#000000', lightness(base.solid) > 0.6 ? 0.6 : 0.3), accent: base.solid};
    else p = {bg: base.fill, flat: base.fill, stroke: base.stroke, ink: base.ink, accent: pale ? '#94a3b8' : base.solid};
  }
  if (isHex(d.ink)) p.ink = d.ink;
  return p;
}

/** Sticky note colours: a named note colour, or any custom colour. */
export function stickyPaint(d: Pick<FD, 'fill' | 'ink'>): {bg: string; ink: string} {
  const key = d.fill || 'yellow';
  const bg = isHex(key) ? key : STICKY_COLORS[key] || STICKY_COLORS.yellow;
  return {bg, ink: isHex(d.ink) ? d.ink : lightness(bg) > 0.55 ? '#2b2a24' : '#ffffff'};
}

/** Board backgrounds. Dark ones lighten dark lines and loose text so they stay readable. */
export const CANVASES: Record<string, {name: string; bg: string; dot: string; line: string; dark?: boolean}> = {
  light: {name: 'Light', bg: '#f7f8fa', dot: '#c8cdd6', line: '#eceef3'},
  white: {name: 'White', bg: '#ffffff', dot: '#d5d9e0', line: '#f0f2f5'},
  paper: {name: 'Paper', bg: '#fbf6ea', dot: '#dccfb3', line: '#f1e8d3'},
  mint: {name: 'Mint', bg: '#eef7f0', dot: '#bcd9c3', line: '#dcecdf'},
  lavender: {name: 'Lavender', bg: '#f3f1fd', dot: '#cbc5ee', line: '#e4e0f8'},
  slate: {name: 'Slate', bg: '#232936', dot: '#465066', line: '#2e3545', dark: true},
  midnight: {name: 'Midnight', bg: '#0f1424', dot: '#2c3552', line: '#1a2036', dark: true},
  blueprint: {name: 'Blueprint', bg: '#173f8a', dot: '#5f85cc', line: '#2a55a6', dark: true},
};
export const canvasOf = (key?: string) => CANVASES[key || 'light'] || CANVASES.light;
/** On a dark board, colours too dark to see are shown light instead. */
export const onCanvas = (color: string, dark: boolean) => (dark && isHex(color) && lightness(color) < 0.32 ? '#d7dce6' : color);

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

/** One-click colour schemes for a whole board (or just the selection). */
export interface BoardTheme {
  key: string;
  name: string;
  /** Four colours shown on the theme's button */
  dots: string[];
  look: Look;
  terminalLook?: Look;
  /** Start / end shapes, decisions, every other shape */
  terminal: string;
  decision: string;
  step: string;
  sticky: string;
  card: string;
  frame: string;
  edge: string;
  /** Mind map: the centre's fill and the colours its branches take turns through */
  rootFill?: string;
  branches: string[];
  /** Board background that goes with it (only set when the whole board is themed) */
  canvas?: string;
}
export const THEMES: BoardTheme[] = [
  {key: 'pastel', name: 'Pastel', dots: ['#c9e3ff', '#d6d1ff', '#cbf3cd', '#232838'], look: 'soft', terminal: 'dark', decision: 'purple', step: 'blue', sticky: 'yellow', card: 'purple', frame: 'gray', edge: '#3a4250', branches: BRANCH_COLORS, canvas: 'light'},
  {key: 'bold', name: 'Bold', dots: ['#3b82f6', '#f97316', '#16a34a', '#232838'], look: 'solid', terminal: 'dark', decision: 'orange', step: 'blue', sticky: '#fde047', card: 'blue', frame: 'gray', edge: '#232838', rootFill: 'dark', branches: ['#3b82f6', '#e5484d', '#16a34a', '#f97316', '#7b68ee', '#0d9488'], canvas: 'white'},
  {key: 'minimal', name: 'Minimal', dots: ['#ffffff', '#232838', '#94a3b8', '#e8eaee'], look: 'outline', terminalLook: 'solid', terminal: 'dark', decision: 'dark', step: 'dark', sticky: '#f1f5f9', card: 'gray', frame: 'white', edge: '#232838', rootFill: 'dark', branches: ['#232838', '#475569', '#64748b', '#94a3b8'], canvas: 'white'},
  {key: 'ocean', name: 'Ocean', dots: ['#1e40af', '#0284c7', '#cdeefd', '#0d9488'], look: 'soft', terminal: 'g:ocean', decision: 'teal', step: 'sky', sticky: '#cdeefd', card: 'sky', frame: 'sky', edge: '#1e40af', rootFill: 'g:ocean', branches: ['#1e40af', '#0284c7', '#0d9488', '#38bdf8', '#4f46e5'], canvas: 'light'},
  {key: 'sunset', name: 'Sunset', dots: ['#ea580c', '#db2777', '#ffdab3', '#ffd6ec'], look: 'soft', terminal: 'g:sunset', decision: 'orange', step: 'pink', sticky: '#ffe0c2', card: 'orange', frame: 'yellow', edge: '#9a3412', rootFill: 'g:sunset', branches: ['#db2777', '#ea580c', '#f59e0b', '#be123c', '#c026d3'], canvas: 'paper'},
  {key: 'forest', name: 'Forest', dots: ['#065f46', '#16a34a', '#cbf3cd', '#e3f6b5'], look: 'soft', terminal: 'g:forest', decision: 'lime', step: 'green', sticky: '#e3f6b5', card: 'green', frame: 'green', edge: '#14532d', rootFill: 'g:forest', branches: ['#166534', '#65a30d', '#0d9488', '#84cc16', '#15803d'], canvas: 'mint'},
  {key: 'grape', name: 'Grape', dots: ['#6d28d9', '#a855f7', '#d6d1ff', '#ffd6ec'], look: 'soft', terminal: 'g:grape', decision: 'pink', step: 'purple', sticky: '#eadcff', card: 'indigo', frame: 'purple', edge: '#4c1d95', rootFill: 'g:grape', branches: ['#6d28d9', '#a855f7', '#db2777', '#4f46e5', '#c026d3'], canvas: 'lavender'},
  {key: 'mono', name: 'Mono', dots: ['#232838', '#64748b', '#e8eaee', '#ffffff'], look: 'soft', terminal: 'dark', decision: 'gray', step: 'white', sticky: '#eef0f3', card: 'gray', frame: 'gray', edge: '#232838', rootFill: 'dark', branches: ['#232838', '#475569', '#64748b', '#94a3b8'], canvas: 'light'},
  {key: 'neon', name: 'Neon night', dots: ['#0f1424', '#22d3ee', '#a78bfa', '#f472b6'], look: 'solid', terminal: 'g:aurora', decision: 'pink', step: 'indigo', sticky: '#fde047', card: 'sky', frame: 'indigo', edge: '#a5b4fc', rootFill: 'g:aurora', branches: ['#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24'], canvas: 'midnight'},
];

/** Recolours nodes and edges with a theme. Only the given ids change when a list is passed. */
export function applyTheme(t: BoardTheme, nodes: Node[], edges: Edge[], only?: Set<string>): {nodes: Node[]; edges: Edge[]} {
  const hit = (id: string) => !only || only.has(id);
  const tops: Node[] = [];
  let rootId = '';
  for (const n of nodes) {
    if (n.type !== 'mind') continue;
    if (!(n.data as FD).parent) rootId = n.id;
  }
  for (const n of nodes) if (n.type === 'mind' && (n.data as FD).parent === rootId && rootId) tops.push(n);
  const branchColor: Record<string, string> = {};
  tops.sort((a, b) => Number((a.data as FD).order ?? 0) - Number((b.data as FD).order ?? 0)).forEach((n, i) => (branchColor[n.id] = t.branches[i % t.branches.length]));

  const next = nodes.map(n => {
    if (!hit(n.id)) return n;
    const d = n.data as FD;
    let patch: Partial<FD>;
    switch (n.type) {
      case 'shape': {
        const s = d.shape || 'rounded';
        const terminal = s === 'ellipse' || s === 'pill';
        const fill = terminal ? t.terminal : s === 'diamond' ? t.decision : t.step;
        const look = terminal ? t.terminalLook || t.look : t.look;
        patch = {fill, look, ink: undefined, border: fill === 'white' && look === 'soft' ? 'solid' : d.border === 'dashed' ? 'dashed' : fill === 'white' ? 'solid' : 'none'};
        break;
      }
      case 'sticky':
        patch = {fill: t.sticky, ink: undefined};
        break;
      case 'card':
        patch = {fill: t.card, look: undefined, ink: undefined};
        break;
      case 'frame':
        patch = {fill: t.frame, look: undefined, ink: undefined};
        break;
      case 'draw':
        patch = {stroke: t.edge};
        break;
      case 'text':
        patch = {ink: undefined};
        break;
      case 'mind':
        patch = n.id === rootId ? {fill: t.rootFill, look: t.rootFill ? 'solid' : undefined, ink: undefined, color: t.rootFill ? t.branches[0] : undefined} : {color: branchColor[n.id], fill: undefined};
        break;
      default:
        return n;
    }
    return {...n, data: {...d, ...patch}};
  });
  const nextEdges = edges.map(e => {
    if (only && !only.has(e.id) && !(only.has(e.source) && only.has(e.target))) return e;
    if (e.type === 'mind') return e;
    return {...e, data: {...e.data, color: t.edge}};
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
  {kind: 'chevron', name: 'Process step'},
  {kind: 'arrow', name: 'Arrow'},
  {kind: 'callout', name: 'Speech bubble'},
  {kind: 'star', name: 'Star'},
  {kind: 'cloud', name: 'Cloud'},
  {kind: 'octagon', name: 'Stop'},
  {kind: 'pentagon', name: 'Pentagon'},
  {kind: 'trapezoid', name: 'Manual step'},
  {kind: 'cross', name: 'Plus'},
  {kind: 'heart', name: 'Heart'},
  {kind: 'shield', name: 'Shield'},
];

/** Outlines of the non-box shapes, drawn in a 100 x 100 square and stretched to the item's size. */
export const SHAPE_PATHS: Record<string, string> = {
  diamond: 'M50 1 L99 50 L50 99 L1 50 Z',
  parallelogram: 'M15 1 L99 1 L85 99 L1 99 Z',
  hexagon: 'M13 1 L87 1 L99 50 L87 99 L13 99 L1 50 Z',
  triangle: 'M50 1 L99 99 L1 99 Z',
  document: 'M1 1 L99 1 L99 84 C76 70 26 100 1 86 Z',
  cylinder: 'M1 12 C1 -3 99 -3 99 12 L99 88 C99 103 1 103 1 88 Z',
  chevron: 'M1 1 L80 1 L99 50 L80 99 L1 99 L20 50 Z',
  arrow: 'M1 27 L60 27 L60 3 L99 50 L60 97 L60 73 L1 73 Z',
  callout: 'M7 1 H93 Q99 1 99 7 V68 Q99 74 93 74 H42 L22 99 L27 74 H7 Q1 74 1 68 V7 Q1 1 7 1 Z',
  star: 'M50 2 L61.5 36 L98 36.5 L68.5 58 L79.5 95 L50 73 L20.5 95 L31.5 58 L2 36.5 L38.5 36 Z',
  cloud: 'M26 86 C9 86 1 72 7 60 C-2 44 11 29 26 33 C29 13 54 6 65 22 C82 11 101 27 93 46 C104 60 96 86 78 86 Z',
  octagon: 'M30 1 L70 1 L99 30 L99 70 L70 99 L30 99 L1 70 L1 30 Z',
  pentagon: 'M50 1 L99 38 L80 99 L20 99 L1 38 Z',
  trapezoid: 'M18 1 L82 1 L99 99 L1 99 Z',
  cross: 'M34 1 H66 V34 H99 V66 H66 V99 H34 V66 H1 V34 H34 Z',
  heart: 'M50 96 C20 71 1 53 1 30 C1 12 14 3 27 3 C38 3 46 9 50 18 C54 9 62 3 73 3 C86 3 99 12 99 30 C99 53 80 71 50 96 Z',
  shield: 'M50 1 L95 14 V48 C95 74 76 91 50 99 C24 91 5 74 5 48 V14 Z',
};
/** A good starting size for each shape. */
export const SHAPE_SIZE: Partial<Record<ShapeKind, [number, number]>> = {
  diamond: [200, 120],
  ellipse: [140, 140],
  triangle: [150, 130],
  pill: [190, 56],
  cylinder: [150, 120],
  hexagon: [200, 90],
  chevron: [210, 76],
  arrow: [200, 100],
  callout: [220, 130],
  star: [150, 144],
  cloud: [210, 130],
  octagon: [140, 140],
  pentagon: [150, 140],
  trapezoid: [200, 90],
  cross: [130, 130],
  heart: [150, 136],
  shield: [140, 156],
};

export const STAMPS = ['👍', '👎', '❤️', '⭐', '✅', '❌', '❓', '❗', '🔥', '🎉', '💡', '🚀', '👀', '🙌', '⚠️', '🎯', '📌', '⏰', '💬', '🏆', '😀', '🤔', '💰', '🔒'];

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
export function textNode(x: number, y: number, label = '', textSize: TextSize = 'lg'): Node {
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
    if (n.type === 'sticky') return stickyPaint(d).bg;
    if (n.type === 'mind') return d.fill ? paint(d).flat : '#ffffff';
    if (n.type === 'draw') return 'none';
    return paint(d, n.type === 'frame' ? 'gray' : n.type === 'card' ? 'purple' : 'blue').flat;
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
    key: 'kanban',
    name: 'Kanban board',
    kind: 'whiteboard',
    blurb: 'Backlog to done, with cards you can drag between columns',
    build: () => {
      const cols = [
        ['Backlog', 'gray'],
        ['To do', 'blue'],
        ['In progress', 'purple'],
        ['Done', 'green'],
      ].map(([l, f], i) => frameNode(i * 310, 0, l, f, 290, 560));
      const card = (col: number, row: number, label: string, extra: Partial<FD> = {}) => ({...cardNode(0, 0, label, extra), parentId: cols[col].id, position: {x: 20, y: 54 + row * 112}});
      return board('whiteboard', [
        ...cols,
        card(0, 0, 'Gather requirements', {fill: 'gray'}),
        card(0, 1, 'Research options', {fill: 'gray'}),
        card(1, 0, 'Draft the plan', {fill: 'blue'}),
        card(1, 1, 'Book kickoff', {fill: 'blue'}),
        card(2, 0, 'Build first version', {fill: 'purple', status: 'doing'}),
        card(3, 0, 'Agree the goal', {fill: 'green', status: 'done'}),
      ]);
    },
  },
  {
    key: 'timeline',
    name: 'Timeline / roadmap',
    kind: 'whiteboard',
    blurb: 'Phases in a row with milestones underneath',
    build: () => {
      const phases = [
        ['Discover', 'g:ocean'],
        ['Plan', 'g:aurora'],
        ['Build', 'g:grape'],
        ['Launch', 'g:sunset'],
        ['Improve', 'g:fire'],
      ].map(([l, f], i) => shapeNode(i * 205, 0, l, {shape: 'chevron', fill: f, bold: true}, 220, 80));
      const notes = [
        ['Interviews and research', 'blue'],
        ['Scope, budget, owners', 'green'],
        ['Weekly demos', 'purple'],
        ['Go-live checklist', 'orange'],
        ['Feedback and fixes', 'pink'],
      ].map(([l, f], i) => stickyNode(i * 205 + 20, 130, l, f, i % 2 ? 2 : -2));
      return board('whiteboard', [textNode(0, -70, 'Roadmap', 'xl'), ...phases, ...notes]);
    },
  },
  {
    key: 'decision-tree',
    name: 'Decision tree',
    kind: 'whiteboard',
    blurb: 'A question, the options, and where each one leads',
    build: () => {
      const q = shapeNode(330, 0, 'What should we do?', {shape: 'diamond', fill: 'purple', look: 'solid'}, 240, 130);
      const a = shapeNode(60, 210, 'Option A', {fill: 'blue'});
      const b = shapeNode(350, 210, 'Option B', {fill: 'blue'});
      const c = shapeNode(640, 210, 'Option C', {fill: 'blue'});
      const outs = [
        [a, 0, 'Cheaper, slower', 'green'],
        [a, 1, 'Needs a new vendor', 'orange'],
        [b, 2, 'Fastest to deliver', 'green'],
        [c, 3, 'Highest risk', 'red'],
      ].map(([from, i, l, f]) => ({from: from as Node, node: shapeNode([-50, 170, 350, 640][Number(i)], 380, String(l), {shape: 'pill', fill: String(f)}, 200, 56)}));
      return board('whiteboard', [q, a, b, c, ...outs.map(o => o.node)], [
        flowEdge(q.id, a.id, {label: 'A'}, 'l', 't'),
        flowEdge(q.id, b.id, {label: 'B'}, 'b', 't'),
        flowEdge(q.id, c.id, {label: 'C'}, 'r', 't'),
        ...outs.map(o => flowEdge(o.from.id, o.node.id, {}, 'b', 't')),
      ]);
    },
  },
  {
    key: 'pros-cons',
    name: 'Pros and cons',
    kind: 'whiteboard',
    blurb: 'Two columns to weigh a choice',
    build: () => {
      const pro = frameNode(0, 0, 'Pros', 'green', 480, 440);
      const con = frameNode(510, 0, 'Cons', 'red', 480, 440);
      const inside = (f: Node, i: number, label: string, fill: string) => ({...stickyNode(0, 0, label, fill, i % 2 ? 2 : -2), parentId: f.id, position: {x: 30 + (i % 2) * 215, y: 60 + Math.floor(i / 2) * 185}});
      return board('whiteboard', [pro, con, inside(pro, 0, 'Saves time', 'green'), inside(pro, 1, 'Team already knows it', 'green'), inside(con, 0, 'Costs more up front', 'pink'), inside(con, 1, 'Needs training', 'pink'), textNode(0, -80, 'Should we…?', 'xl')]);
    },
  },
  {
    key: 'sipoc',
    name: 'SIPOC',
    kind: 'whiteboard',
    blurb: 'Suppliers, inputs, process, outputs, customers',
    build: () => {
      const cols = [
        ['Suppliers', 'blue'],
        ['Inputs', 'teal'],
        ['Process', 'purple'],
        ['Outputs', 'orange'],
        ['Customers', 'green'],
      ].map(([l, f], i) => frameNode(i * 250, 0, l, f, 235, 430));
      const box = (col: number, row: number, label: string) => ({...shapeNode(0, 0, label, {fill: 'white', border: 'solid'}, 195, 56), parentId: cols[col].id, position: {x: 20, y: 56 + row * 74}});
      return board('whiteboard', [...cols, box(0, 0, 'Vendor'), box(1, 0, 'Purchase request'), box(2, 0, 'Review'), box(2, 1, 'Approve'), box(2, 2, 'Order'), box(3, 0, 'Purchase order'), box(4, 0, 'Requesting team')]);
    },
  },
  {
    key: 'week',
    name: 'Weekly plan',
    kind: 'whiteboard',
    blurb: 'Monday to Friday, one column each',
    build: () => {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((l, i) => frameNode(i * 250, 0, l, ['blue', 'purple', 'green', 'orange', 'pink'][i], 235, 460));
      const first = {...stickyNode(0, 0, 'Top priority', 'yellow', -2), parentId: days[0].id, position: {x: 27, y: 56}};
      return board('whiteboard', [...days, first, textNode(0, -80, 'This week', 'xl')]);
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
