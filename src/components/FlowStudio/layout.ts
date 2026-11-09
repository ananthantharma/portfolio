// Layouts: mind maps (tidy tree) and flowcharts (layered, like an auto-arrange).
import type {Edge, Node} from '@xyflow/react';

import {BRANCH_COLORS, FD, MindLayout} from './model';

export type Box = {x: number; y: number; w: number; h: number};

const H_GAP = 72; // between a parent and its children (sideways)
const V_GAP = 14; // between siblings (sideways layouts)
const DOWN_GAP_Y = 70;
const DOWN_GAP_X = 24;

/** Size of a mind map node: what the browser measured, else a guess from its text. */
export function mindSize(n: Node, depth: number): {w: number; h: number} {
  const mw = n.measured?.width;
  const mh = n.measured?.height;
  if (mw && mh) return {w: mw, h: mh};
  const label = String((n.data as FD).label || '');
  const longest = Math.max(4, ...label.split('\n').map(l => l.length));
  const char = depth === 0 ? 10.5 : 8.2;
  return {w: Math.min(340, Math.round(longest * char + ((n.data as FD).icon ? 64 : 40) + (depth === 0 ? 30 : 0))), h: depth === 0 ? 58 : 42};
}

export interface MindInfo {
  rootId: string | null;
  depth: Record<string, number>;
  color: Record<string, string>;
  count: Record<string, number>; // all descendants
  kids: Record<string, string[]>; // ordered children
  side: Record<string, 'l' | 'r' | 'd'>;
  hidden: Set<string>;
  parent: Record<string, string | null>;
}

/** Tree facts for a mind map: depth, branch colour, descendant counts, which side each branch sits on. */
export function mindInfo(nodes: Node[], layout: MindLayout): MindInfo {
  const kids: Record<string, string[]> = {};
  const parent: Record<string, string | null> = {};
  const byId = new Map(nodes.map(n => [n.id, n]));
  let rootId: string | null = null;
  for (const n of nodes) {
    const p = (n.data as FD).parent ?? null;
    parent[n.id] = p && byId.has(p) ? p : null;
    if (!parent[n.id]) {
      if (!rootId) rootId = n.id;
      else parent[n.id] = rootId; // a second root becomes a branch of the first
    }
  }
  for (const n of nodes) {
    const p = parent[n.id];
    if (p) (kids[p] ||= []).push(n.id);
  }
  const ord = (id: string) => Number((byId.get(id)?.data as FD)?.order ?? 0);
  Object.values(kids).forEach(list => list.sort((a, b) => ord(a) - ord(b)));

  const depth: Record<string, number> = {};
  const color: Record<string, string> = {};
  const count: Record<string, number> = {};
  const side: Record<string, 'l' | 'r' | 'd'> = {};
  const hidden = new Set<string>();
  if (!rootId) return {rootId, depth, color, count, kids, side, hidden, parent};

  const countOf = (id: string): number => (count[id] = (kids[id] || []).reduce((s, k) => s + 1 + countOf(k), 0));
  countOf(rootId);

  // "Both sides": split the first branches so each side carries about the same weight
  const first = kids[rootId] || [];
  const leftSet = new Set<string>();
  if (layout === 'both' && first.length > 1) {
    let r = 0;
    let l = 0;
    for (const id of first) {
      const wgt = 1 + (count[id] || 0);
      if (r <= l) r += wgt;
      else {
        l += wgt;
        leftSet.add(id);
      }
    }
  }

  const walk = (id: string, d: number, c: string, s: 'l' | 'r' | 'd', hide: boolean) => {
    depth[id] = d;
    color[id] = c;
    side[id] = s;
    if (hide) hidden.add(id);
    const collapsed = !!(byId.get(id)?.data as FD)?.collapsed;
    (kids[id] || []).forEach((k, i) => {
      const own = (byId.get(k)?.data as FD)?.color;
      const kc = d === 0 ? own || BRANCH_COLORS[i % BRANCH_COLORS.length] : own || c;
      const ks = layout === 'down' ? 'd' : d === 0 ? (leftSet.has(k) ? 'l' : 'r') : s;
      walk(k, d + 1, kc, ks, hide || collapsed);
    });
  };
  walk(rootId, 0, (byId.get(rootId)?.data as FD)?.color || '#2b2d33', layout === 'down' ? 'd' : 'r', false);
  return {rootId, depth, color, count, kids, side, hidden, parent};
}

/** Where every mind map node goes, with the root kept where it is. */
export function layoutMind(nodes: Node[], info: MindInfo, layout: MindLayout): Map<string, Box> {
  const out = new Map<string, Box>();
  const root = info.rootId;
  if (!root) return out;
  const byId = new Map(nodes.map(n => [n.id, n]));
  const size = (id: string) => mindSize(byId.get(id)!, info.depth[id] || 0);
  const visibleKids = (id: string) => ((byId.get(id)?.data as FD)?.collapsed ? [] : info.kids[id] || []);

  if (layout === 'down') {
    const span: Record<string, number> = {};
    const measure = (id: string): number => {
      const k = visibleKids(id);
      const own = size(id).w;
      const sum = k.reduce((s, c) => s + measure(c), 0) + Math.max(0, k.length - 1) * DOWN_GAP_X;
      return (span[id] = Math.max(own, sum));
    };
    measure(root);
    const place = (id: string, left: number, top: number) => {
      const {w, h} = size(id);
      const cx = left + span[id] / 2;
      out.set(id, {x: cx - w / 2, y: top, w, h});
      const k = visibleKids(id);
      const sum = k.reduce((s, c) => s + span[c], 0) + Math.max(0, k.length - 1) * DOWN_GAP_X;
      let x = cx - sum / 2;
      for (const c of k) {
        place(c, x, top + h + DOWN_GAP_Y);
        x += span[c] + DOWN_GAP_X;
      }
    };
    place(root, 0, 0);
  } else {
    const span: Record<string, number> = {};
    const measure = (id: string, list: string[]): number => {
      const own = size(id).h;
      const sum = list.reduce((s, c) => s + measure(c, visibleKids(c)), 0) + Math.max(0, list.length - 1) * V_GAP;
      return (span[id] = Math.max(own, sum));
    };
    const place = (id: string, x: number, top: number, dir: 1 | -1, list: string[]) => {
      const {w, h} = size(id);
      const cy = top + span[id] / 2;
      const left = dir === 1 ? x : x - w;
      out.set(id, {x: left, y: cy - h / 2, w, h});
      const sum = list.reduce((s, c) => s + span[c], 0) + Math.max(0, list.length - 1) * V_GAP;
      let y = cy - sum / 2;
      const childX = dir === 1 ? left + w + H_GAP : left - H_GAP;
      for (const c of list) {
        place(c, childX, y, dir, visibleKids(c));
        y += span[c] + V_GAP;
      }
    };
    const first = visibleKids(root);
    const right = first.filter(k => info.side[k] !== 'l');
    const left = first.filter(k => info.side[k] === 'l');
    const {w: rw, h: rh} = size(root);
    measure(root, right);
    place(root, 0, 0, 1, right);
    const rootBox = out.get(root)!;
    if (left.length) {
      measure(root, left);
      const lSpan = span[root];
      // Lay the left side out from the root's left edge, centred on the root
      const tmp = new Map<string, Box>();
      const saved = new Map(out);
      out.clear();
      place(root, rw, rootBox.y + rh / 2 - lSpan / 2, -1, left);
      out.forEach((b, id) => id !== root && tmp.set(id, b));
      out.clear();
      saved.forEach((b, id) => out.set(id, b));
      tmp.forEach((b, id) => out.set(id, b));
    }
  }

  // Keep the root where the user put it
  const rootNode = byId.get(root)!;
  const placed = out.get(root)!;
  const dx = rootNode.position.x - placed.x;
  const dy = rootNode.position.y - placed.y;
  out.forEach(b => {
    b.x = Math.round(b.x + dx);
    b.y = Math.round(b.y + dy);
  });
  return out;
}

/** Layered auto-arrange for flowcharts: sources first, each step below (or right of) what leads into it. */
export function layeredLayout(nodes: Node[], edges: Edge[], dir: 'TB' | 'LR', origin: {x: number; y: number}): Map<string, {x: number; y: number}> {
  const ids = new Set(nodes.map(n => n.id));
  const out = new Map<string, {x: number; y: number}>();
  if (!nodes.length) return out;
  const size = (n: Node) => ({w: (n.width ?? n.measured?.width ?? 200) as number, h: (n.height ?? n.measured?.height ?? 72) as number});
  const succ = new Map<string, string[]>();
  const pred = new Map<string, string[]>();
  nodes.forEach(n => {
    succ.set(n.id, []);
    pred.set(n.id, []);
  });
  // Drop edges that close a loop so the steps still read top to bottom
  const order = [...nodes].sort((a, b) => (dir === 'TB' ? a.position.y - b.position.y || a.position.x - b.position.x : a.position.x - b.position.x || a.position.y - b.position.y));
  const visiting = new Set<string>();
  const done = new Set<string>();
  const forward: [string, string][] = [];
  const adj = new Map<string, string[]>();
  edges.forEach(e => {
    if (ids.has(e.source) && ids.has(e.target) && e.source !== e.target) (adj.get(e.source) || adj.set(e.source, []).get(e.source)!).push(e.target);
  });
  const dfs = (id: string) => {
    visiting.add(id);
    for (const t of adj.get(id) || []) {
      if (visiting.has(t)) continue; // back edge
      forward.push([id, t]);
      if (!done.has(t)) dfs(t);
    }
    visiting.delete(id);
    done.add(id);
  };
  const hasPred = new Set(edges.filter(e => ids.has(e.source) && ids.has(e.target)).map(e => e.target));
  order.filter(n => !hasPred.has(n.id)).forEach(n => !done.has(n.id) && dfs(n.id));
  order.forEach(n => !done.has(n.id) && dfs(n.id));
  const seen = new Set<string>();
  forward.forEach(([a, b]) => {
    const k = `${a}>${b}`;
    if (seen.has(k)) return;
    seen.add(k);
    succ.get(a)!.push(b);
    pred.get(b)!.push(a);
  });
  // Longest path ranks
  const rank = new Map<string, number>();
  const indeg = new Map(nodes.map(n => [n.id, pred.get(n.id)!.length]));
  const queue = order.filter(n => indeg.get(n.id) === 0).map(n => n.id);
  queue.forEach(id => rank.set(id, 0));
  while (queue.length) {
    const id = queue.shift()!;
    for (const t of succ.get(id)!) {
      rank.set(t, Math.max(rank.get(t) ?? 0, (rank.get(id) ?? 0) + 1));
      indeg.set(t, indeg.get(t)! - 1);
      if (indeg.get(t) === 0) queue.push(t);
    }
  }
  nodes.forEach(n => !rank.has(n.id) && rank.set(n.id, 0));
  const layers: string[][] = [];
  order.forEach(n => (layers[rank.get(n.id)!] ||= []).push(n.id));
  // Reduce crossings: order each layer by the average position of what feeds it
  const posIn = new Map<string, number>();
  const setPos = () => layers.forEach(l => l?.forEach((id, i) => posIn.set(id, i)));
  setPos();
  for (let pass = 0; pass < 4; pass++) {
    for (let r = 1; r < layers.length; r++) {
      const l = layers[r];
      if (!l) continue;
      const bary = (id: string) => {
        const p = pred.get(id)!;
        return p.length ? p.reduce((s, q) => s + (posIn.get(q) ?? 0), 0) / p.length : posIn.get(id) ?? 0;
      };
      l.sort((a, b) => bary(a) - bary(b));
      setPos();
    }
  }
  const byId = new Map(nodes.map(n => [n.id, n]));
  const GAP_MAIN = 80;
  const GAP_CROSS = 50;
  let main = 0;
  layers.forEach(l => {
    if (!l) return;
    const sizes = l.map(id => size(byId.get(id)!));
    const thick = Math.max(...sizes.map(s => (dir === 'TB' ? s.h : s.w)));
    const total = sizes.reduce((s, z) => s + (dir === 'TB' ? z.w : z.h), 0) + (l.length - 1) * GAP_CROSS;
    let cross = -total / 2;
    l.forEach((id, i) => {
      const s = sizes[i];
      if (dir === 'TB') {
        out.set(id, {x: cross, y: main + (thick - s.h) / 2});
        cross += s.w + GAP_CROSS;
      } else {
        out.set(id, {x: main + (thick - s.w) / 2, y: cross});
        cross += s.h + GAP_CROSS;
      }
    });
    main += thick + GAP_MAIN;
  });
  const minX = Math.min(...[...out.values()].map(p => p.x));
  const minY = Math.min(...[...out.values()].map(p => p.y));
  out.forEach(p => {
    p.x = Math.round(p.x - minX + origin.x);
    p.y = Math.round(p.y - minY + origin.y);
  });
  return out;
}
