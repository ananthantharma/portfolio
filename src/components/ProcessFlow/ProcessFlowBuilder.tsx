'use client';

import {useEffect, useRef} from 'react';

// ── Scoped CSS (prefixed with #pfb-root to avoid Tailwind conflicts) ──────────
const CSS = `
#pfb-root *{box-sizing:border-box}
#pfb-root {
  --dg:#0C2721; --green:#66CC00; --lgreen:#C7E995;
  --paper:#F7F8F6; --line:#9aa39c; --ink:#1b2420;
  --blue-fill:#dbe9f8; --blue-stroke:#7aa9d6; --blue-ink:#1d4e79;
  --grn-fill:#d8efe2; --grn-stroke:#7cc4a0; --grn-ink:#1f6b4a;
  --gry-fill:#eceae3; --gry-stroke:#c2c0b6; --gry-ink:#4a4a44;
  --amb-fill:#f7eccf; --amb-stroke:#d8b65e; --amb-ink:#8a6a14;
  --pur-fill:#e2e0f5; --pur-stroke:#9b96d6; --pur-ink:#403a86;
  --red-fill:#f8e2dd; --red-stroke:#d69a8c; --red-ink:#9a3e2c;
  display:flex;flex-direction:column;height:100%;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  color:var(--ink);background:#fff;
  position:fixed;inset:0;z-index:50;
}
#pfb-root header{
  background:var(--dg);color:#fff;padding:10px 16px;
  display:flex;align-items:center;gap:12px;flex-wrap:wrap;flex-shrink:0;
}
#pfb-root header h1{font-size:15px;margin:0;font-weight:600;letter-spacing:.3px}
#pfb-root header .tag{font-size:11px;color:var(--lgreen);font-weight:500}
#pfb-root .back-btn{
  display:flex;align-items:center;gap:5px;
  background:rgba(102,204,0,.15);color:var(--lgreen);
  border:1px solid rgba(102,204,0,.3);border-radius:7px;
  padding:5px 10px;font-size:12px;font-weight:500;cursor:pointer;
  text-decoration:none;transition:background .15s;white-space:nowrap;
  font-family:inherit;
}
#pfb-root .back-btn:hover{background:rgba(102,204,0,.28)}
#pfb-root .bar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-left:auto}
#pfb-root .bar .grp{
  display:flex;gap:4px;align-items:center;
  background:rgba(255,255,255,.08);padding:4px 6px;border-radius:7px;
}
#pfb-root .bar label{font-size:10.5px;color:#cfd6d1;text-transform:uppercase;letter-spacing:.4px}
#pfb-root button,#pfb-root select{
  font-family:inherit;font-size:12.5px;border:none;border-radius:6px;
  padding:6px 10px;cursor:pointer;background:#fff;color:var(--dg);font-weight:500;
}
#pfb-root button:hover{background:var(--lgreen)}
#pfb-root button.accent{background:var(--green);color:var(--dg);font-weight:600}
#pfb-root button.accent:hover{background:#7adb12}
#pfb-root button.ghost{background:rgba(255,255,255,.12);color:#fff}
#pfb-root button.ghost:hover{background:rgba(255,255,255,.25)}
#pfb-root select{padding:5px 8px}
#pfb-root .main{flex:1;display:flex;overflow:hidden}
#pfb-root .canvas-wrap{flex:1;overflow:auto;background:var(--paper);position:relative}
#pfb-root #canvas{position:relative;transform-origin:0 0}
#pfb-root svg.edges{position:absolute;inset:0;pointer-events:none;overflow:visible}
#pfb-root svg.edges g.edge-grp{pointer-events:auto}
#pfb-root .node{
  position:absolute;border-radius:12px;border:2px solid;
  padding:12px 14px;cursor:grab;user-select:none;
  box-shadow:0 1px 3px rgba(0,0,0,.08);transition:box-shadow .12s;
}
#pfb-root .node:active{cursor:grabbing}
#pfb-root .node.sel{box-shadow:0 0 0 3px var(--green),0 4px 10px rgba(0,0,0,.15)}
#pfb-root .node .ttl{font-weight:600;font-size:13.5px;line-height:1.25;pointer-events:none;text-align:center;white-space:pre-wrap}
#pfb-root .node .sub{font-size:11.5px;margin-top:3px;line-height:1.3;pointer-events:none;text-align:center;opacity:.92;white-space:pre-wrap}
#pfb-root .node .badge{position:absolute;top:-10px;right:-10px;font-size:17px;line-height:1;pointer-events:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.25));z-index:4}
#pfb-root .node.t-blue{background:var(--blue-fill);border-color:var(--blue-stroke);color:var(--blue-ink)}
#pfb-root .node.t-green{background:var(--grn-fill);border-color:var(--grn-stroke);color:var(--grn-ink)}
#pfb-root .node.t-grey{background:var(--gry-fill);border-color:var(--gry-stroke);color:var(--gry-ink)}
#pfb-root .node.t-amber{background:var(--amb-fill);border-color:var(--amb-stroke);color:var(--amb-ink)}
#pfb-root .node.t-purple{background:var(--pur-fill);border-color:var(--pur-stroke);color:var(--pur-ink)}
#pfb-root .node.t-red{background:var(--red-fill);border-color:var(--red-stroke);color:var(--red-ink)}
#pfb-root .node.t-start{background:var(--dg);border-color:var(--dg);color:#fff}
#pfb-root .node.shape-pill{border-radius:30px}
#pfb-root .port{
  position:absolute;width:13px;height:13px;border-radius:50%;
  background:#fff;border:2px solid var(--green);
  opacity:0;transition:opacity .1s;cursor:crosshair;z-index:5;
}
#pfb-root .node:hover .port{opacity:1}
#pfb-root .port.t{top:-7px;left:calc(50% - 6.5px)}
#pfb-root .port.b{bottom:-7px;left:calc(50% - 6.5px)}
#pfb-root .port.l{left:-7px;top:calc(50% - 6.5px)}
#pfb-root .port.r{right:-7px;top:calc(50% - 6.5px)}
#pfb-root .side{width:260px;background:#fff;border-left:1px solid #e3e6e1;display:flex;flex-direction:column;overflow-y:auto}
#pfb-root .side h2{font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:#7a8079;margin:16px 16px 8px}
#pfb-root .side .pad{padding:0 16px 12px}
#pfb-root .field{margin-bottom:10px}
#pfb-root .field label{display:block;font-size:11px;color:#666;margin-bottom:4px;font-weight:500}
#pfb-root .field input,#pfb-root .field textarea,#pfb-root .field select{
  width:100%;border:1px solid #d4d8d2;border-radius:7px;
  padding:7px 9px;font-size:13px;font-family:inherit;
  background:#fff;color:var(--ink);
}
#pfb-root .field textarea{resize:vertical;min-height:46px}
#pfb-root .swatches{display:flex;gap:6px;flex-wrap:wrap}
#pfb-root .sw{width:30px;height:30px;border-radius:7px;cursor:pointer;border:2px solid transparent}
#pfb-root .sw.on{border-color:var(--dg)}
#pfb-root .hint{font-size:11px;color:#8a908a;line-height:1.5;padding:0 16px 16px}
#pfb-root .empty{padding:30px 16px;text-align:center;color:#9aa099;font-size:12.5px;line-height:1.6}
#pfb-root .del{background:var(--red-fill);color:var(--red-ink)}
#pfb-root .del:hover{background:#f3cfc6}
#pfb-root .zoom-ind{
  position:absolute;bottom:12px;left:12px;background:#fff;
  border:1px solid #e0e3df;border-radius:7px;padding:4px 10px;
  font-size:11.5px;color:#666;box-shadow:0 1px 4px rgba(0,0,0,.08);
}
#pfb-root kbd{background:#eceae3;border-radius:4px;padding:1px 5px;font-size:10.5px;font-family:inherit}
#pfb-root .row2{display:flex;gap:8px}
#pfb-root .row2>*{flex:1}
#pfb-root svg.edges path.hit{pointer-events:stroke;cursor:pointer}
#pfb-root svg.edges .edge-grp:hover path.vis{stroke:var(--green)!important}
#pfb-root .edge-grp.esel path.vis{stroke:var(--green)!important}
/* Save/Load panel */
.pfb-overlay{position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:9999}
.pfb-panel{
  position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
  background:#fff;border:1px solid #e0e3df;border-radius:14px;
  padding:20px;z-index:10000;min-width:300px;max-width:420px;width:90%;
  box-shadow:0 12px 40px rgba(0,0,0,.18);
}
.pfb-panel h3{margin:0 0 14px;font-size:14px;color:#0C2721;font-weight:600;font-family:-apple-system,sans-serif}
.pfb-flow-item{
  display:flex;align-items:center;justify-content:space-between;
  padding:9px 11px;margin:4px 0;background:#f5f7f5;border-radius:8px;
  cursor:pointer;font-size:13px;font-family:-apple-system,sans-serif;
  transition:background .1s;
}
.pfb-flow-item:hover{background:#e8f5d4}
.pfb-flow-item span{flex:1;font-weight:500;color:#1b2420}
.pfb-flow-item .pfb-del{
  background:#fee2e2;color:#b91c1c;border:none;border-radius:5px;
  padding:3px 9px;font-size:11px;cursor:pointer;font-family:inherit;
  transition:background .1s;
}
.pfb-flow-item .pfb-del:hover{background:#fecaca}
.pfb-cancel{
  margin-top:12px;width:100%;background:#eceae3;color:#444;
  border:none;border-radius:8px;padding:9px;font-size:12.5px;
  cursor:pointer;font-family:-apple-system,sans-serif;transition:background .1s;
}
.pfb-cancel:hover{background:#dddbd4}
.pfb-empty-msg{text-align:center;color:#9aa099;font-size:13px;padding:16px 0;font-family:-apple-system,sans-serif}
`;

// ── HTML scaffold (injected via dangerouslySetInnerHTML) ──────────────────────
const HTML = `
<header>
  <a href="/notes" class="back-btn" title="Back to Notes">← Notes</a>
  <h1>Process Flow Builder</h1>
  <span class="tag">VISIO-STYLE EDITOR</span>
  <div class="bar">
    <div class="grp">
      <label>Add</label>
      <button class="accent" id="addNode">+ Box</button>
    </div>
    <div class="grp">
      <label>Layout</label>
      <select id="dir">
        <option value="TB">Vertical ↓</option>
        <option value="LR">Horizontal →</option>
      </select>
      <select id="wrap" title="Boxes per row/column before wrapping">
        <option value="0">No limit (∞)</option>
        <option value="2">Wrap at 2</option>
        <option value="3">Wrap at 3</option>
        <option value="4" selected>Wrap at 4</option>
        <option value="5">Wrap at 5</option>
        <option value="6">Wrap at 6</option>
        <option value="8">Wrap at 8</option>
        <option value="10">Wrap at 10</option>
        <option value="custom">Custom…</option>
      </select>
      <input id="wrapCustom" type="number" min="1" max="50" value="4" title="Custom wrap limit"
        style="display:none;width:56px;border:none;border-radius:6px;padding:5px 8px;font-family:inherit;font-size:12.5px">
      <button id="autoLayout">Auto-arrange</button>
    </div>
    <div class="grp">
      <button id="zoomOut">−</button>
      <button id="zoomIn">+</button>
      <button id="fit">Fit</button>
    </div>
    <div class="grp">
      <button class="ghost" id="saveLocal" title="Save flow to browser (named)">💾 Save</button>
      <button class="ghost" id="loadLocal" title="Load a saved flow">📂 Load</button>
      <button class="ghost" id="downloadJson" title="Download as JSON file">↓ JSON</button>
      <button class="ghost" id="importJson" title="Import JSON file">↑ Import</button>
      <button class="ghost" id="png">PNG</button>
      <button class="ghost" id="clear">Clear</button>
    </div>
  </div>
</header>
<div class="main">
  <div class="canvas-wrap" id="cw">
    <div id="canvas">
      <svg class="edges" id="edges"></svg>
    </div>
    <div class="zoom-ind" id="zi">100%</div>
  </div>
  <aside class="side" id="side">
    <div id="inspector"></div>
  </aside>
</div>
`;

export default function ProcessFlowBuilder() {
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // Inject scoped styles
    const styleEl = document.createElement('style');
    styleEl.id = 'pfb-styles';
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    // ── Constants ──────────────────────────────────────────────────────────
    const THEMES = [
      {k: 'start', name: 'Dark (start)'},
      {k: 'blue', name: 'Blue'},
      {k: 'green', name: 'Green'},
      {k: 'grey', name: 'Grey'},
      {k: 'amber', name: 'Amber'},
      {k: 'purple', name: 'Purple'},
      {k: 'red', name: 'Red'},
    ];
    const SWATCH: Record<string, string> = {
      start: '#0C2721',
      blue: '#dbe9f8',
      green: '#d8efe2',
      grey: '#eceae3',
      amber: '#f7eccf',
      purple: '#e2e0f5',
      red: '#f8e2dd',
    };
    const BADGES = [
      {v: '', name: 'None'},
      {v: '⭐', name: 'Star'},
      {v: '🚩', name: 'Flag'},
      {v: '⚠️', name: 'Warning'},
      {v: '🔑', name: 'Key step'},
      {v: '✅', name: 'Done'},
      {v: '🔴', name: 'Critical'},
      {v: '⏱️', name: 'Time-sensitive'},
      {v: '💲', name: 'Cost'},
      {v: '📌', name: 'Pin'},
      {v: '❗', name: 'Important'},
      {v: '🔒', name: 'Locked'},
    ];

    // ── State ──────────────────────────────────────────────────────────────
    type Node = {
      id: string; x: number; y: number; w: number; h: number;
      title: string; sub: string; theme: string; shape: string;
      badge: string; border: string; font: string;
    };
    type Edge = {
      id: string; from: string; to: string;
      fromSide: string | null; toSide: string | null; label: string;
    };
    type AppState = {nodes: Node[]; edges: Edge[]; dir: string; wrap: number};

    let state: AppState = {nodes: [], edges: [], dir: 'TB', wrap: 4};
    let sel: string | null = null;
    let idc = 1;
    let edgeId = 1;
    let zoom = 1;

    const canvas = document.getElementById('canvas') as HTMLDivElement;
    const svg = document.getElementById('edges') as unknown as SVGSVGElement;
    const cw = document.getElementById('cw') as HTMLDivElement;

    // ── Node creation ──────────────────────────────────────────────────────
    function makeNode(opts: Partial<Node> = {}): Node {
      const n: Node = Object.assign(
        {
          id: 'n' + idc++, x: 80, y: 80, w: 210, h: 74,
          title: 'New step', sub: '', theme: 'blue', shape: 'rect',
          badge: '', border: '', font: '',
        },
        opts,
      );
      state.nodes.push(n);
      return n;
    }

    function nodeEl(n: Node): HTMLDivElement {
      let el = document.getElementById(n.id) as HTMLDivElement | null;
      if (!el) {
        el = document.createElement('div');
        el.id = n.id;
        el.className = 'node';
        el.innerHTML = `<div class="inner"><div class="ttl"></div><div class="sub"></div></div>
          <span class="badge"></span>
          <span class="port t" data-d="t"></span><span class="port b" data-d="b"></span>
          <span class="port l" data-d="l"></span><span class="port r" data-d="r"></span>`;
        canvas.appendChild(el);
        bindNode(el, n);
      }
      el.className = 'node t-' + n.theme + (n.shape === 'pill' ? ' shape-pill' : '') + (sel === n.id ? ' sel' : '');
      el.style.left = n.x + 'px';
      el.style.top = n.y + 'px';
      el.style.width = n.w + 'px';
      el.style.borderColor = n.border || '';
      el.style.fontFamily = n.font || '';
      (el.querySelector('.ttl') as HTMLElement).textContent = n.title;
      const sub = el.querySelector('.sub') as HTMLElement;
      sub.textContent = n.sub || '';
      sub.style.display = n.sub ? 'block' : 'none';
      const badge = el.querySelector('.badge') as HTMLElement;
      badge.textContent = n.badge || '';
      badge.style.display = n.badge ? 'block' : 'none';
      requestAnimationFrame(() => {
        n.h = el!.offsetHeight;
      });
      return el;
    }

    // ── Rendering ──────────────────────────────────────────────────────────
    function render() {
      state.nodes.forEach(nodeEl);
      [...canvas.querySelectorAll('.node')].forEach(el => {
        if (!state.nodes.find(n => n.id === el.id)) el.remove();
      });
      drawEdges();
      inspector();
      sizeCanvas();
    }

    function port(n: Node, side: string): {x: number; y: number} {
      const {x, y, w, h} = n;
      if (side === 't') return {x: x + w / 2, y};
      if (side === 'b') return {x: x + w / 2, y: y + h};
      if (side === 'l') return {x, y: y + h / 2};
      return {x: x + w, y: y + h / 2};
    }

    function autoSides(a: Node, b: Node): [string, string] {
      const ac = {x: a.x + a.w / 2, y: a.y + a.h / 2};
      const bc = {x: b.x + b.w / 2, y: b.y + b.h / 2};
      const dx = bc.x - ac.x, dy = bc.y - ac.y;
      if (Math.abs(dy) >= Math.abs(dx)) return dy >= 0 ? ['b', 't'] : ['t', 'b'];
      return dx >= 0 ? ['r', 'l'] : ['l', 'r'];
    }

    function drawEdges() {
      svg.innerHTML = `<defs>
        <marker id="arr" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="#5a6159"/>
        </marker></defs>`;
      state.edges.forEach(e => {
        const a = state.nodes.find(n => n.id === e.from);
        const b = state.nodes.find(n => n.id === e.to);
        if (!a || !b) return;
        let sA = e.fromSide, sB = e.toSide;
        if (!sA || !sB) {
          const s = autoSides(a, b);
          sA = s[0];
          sB = s[1];
        }
        const p1 = port(a, sA!), p2 = port(b, sB!);
        const path = orthPath(p1, sA!, p2, sB!);
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'edge-grp' + (sel === e.id ? ' esel' : ''));
        g.style.pointerEvents = 'auto';

        const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hit.setAttribute('d', path);
        hit.setAttribute('fill', 'none');
        hit.setAttribute('stroke', 'transparent');
        hit.setAttribute('stroke-width', '14');
        hit.setAttribute('class', 'hit');
        hit.addEventListener('click', ev => {
          ev.stopPropagation();
          sel = e.id;
          render();
        });

        const pth = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pth.setAttribute('d', path);
        pth.setAttribute('fill', 'none');
        pth.setAttribute('stroke', sel === e.id ? '#66CC00' : '#5a6159');
        pth.setAttribute('stroke-width', '2');
        pth.setAttribute('marker-end', 'url(#arr)');
        pth.setAttribute('class', 'vis');
        g.appendChild(hit);
        g.appendChild(pth);

        if (e.label) {
          const mid = midOf(p1, p2);
          const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          t.textContent = e.label;
          t.setAttribute('x', String(mid.x));
          t.setAttribute('y', String(mid.y + 4));
          t.setAttribute('text-anchor', 'middle');
          t.setAttribute('font-size', '11.5');
          t.setAttribute('font-family', 'sans-serif');
          t.setAttribute('fill', '#3a403a');
          const tw = e.label.length * 6.6 + 12;
          r.setAttribute('x', String(mid.x - tw / 2));
          r.setAttribute('y', String(mid.y - 9));
          r.setAttribute('width', String(tw));
          r.setAttribute('height', '18');
          r.setAttribute('rx', '5');
          r.setAttribute('fill', '#fff');
          r.setAttribute('stroke', sel === e.id ? '#66CC00' : '#d9ddd6');
          r.style.cursor = 'pointer';
          r.addEventListener('click', ev => {
            ev.stopPropagation();
            sel = e.id;
            render();
          });
          g.appendChild(r);
          g.appendChild(t);
        }
        svg.appendChild(g);
      });
    }

    function midOf(p1: {x: number; y: number}, p2: {x: number; y: number}) {
      return {x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2};
    }

    function orthPath(
      p1: {x: number; y: number}, s1: string,
      p2: {x: number; y: number}, s2: string,
    ): string {
      const off = 22;
      const e1 = stub(p1, s1, off), e2 = stub(p2, s2, off);
      const midX = (e1.x + e2.x) / 2, midY = (e1.y + e2.y) / 2;
      let pts: {x: number; y: number}[] = [p1, e1];
      if (s1 === 'b' || s1 === 't') {
        pts.push({x: e1.x, y: midY}, {x: e2.x, y: midY});
      } else {
        pts.push({x: midX, y: e1.y}, {x: midX, y: e2.y});
      }
      pts.push(e2, p2);
      return 'M' + pts.map(p => p.x + ',' + p.y).join(' L');
    }

    function stub(p: {x: number; y: number}, s: string, o: number) {
      if (s === 't') return {x: p.x, y: p.y - o};
      if (s === 'b') return {x: p.x, y: p.y + o};
      if (s === 'l') return {x: p.x - o, y: p.y};
      return {x: p.x + o, y: p.y};
    }

    function sizeCanvas() {
      let mx = 600, my = 400;
      state.nodes.forEach(n => {
        mx = Math.max(mx, n.x + n.w + 120);
        my = Math.max(my, n.y + n.h + 120);
      });
      canvas.style.width = mx + 'px';
      canvas.style.height = my + 'px';
      svg.setAttribute('width', String(mx));
      svg.setAttribute('height', String(my));
    }

    // ── Drag nodes ─────────────────────────────────────────────────────────
    function bindNode(el: HTMLDivElement, n: Node) {
      el.addEventListener('mousedown', ev => {
        const target = ev.target as HTMLElement;
        if (target.classList.contains('port')) {
          startEdge(n, target.dataset.d!, ev);
          return;
        }
        sel = n.id;
        render();
        let sx = ev.clientX, sy = ev.clientY, ox = n.x, oy = n.y;

        function mv(e: MouseEvent) {
          n.x = Math.round((ox + (e.clientX - sx) / zoom) / 10) * 10;
          n.y = Math.round((oy + (e.clientY - sy) / zoom) / 10) * 10;
          el.style.left = n.x + 'px';
          el.style.top = n.y + 'px';
          drawEdges();
        }
        function up() {
          document.removeEventListener('mousemove', mv);
          document.removeEventListener('mouseup', up);
        }
        document.addEventListener('mousemove', mv);
        document.addEventListener('mouseup', up);
        ev.stopPropagation();
      });
    }

    // ── Edge drawing ───────────────────────────────────────────────────────
    function startEdge(n: Node, side: string, ev: MouseEvent) {
      ev.stopPropagation();
      ev.preventDefault();
      const p1 = port(n, side);
      const pth = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pth.setAttribute('stroke', '#66CC00');
      pth.setAttribute('stroke-width', '2.5');
      pth.setAttribute('fill', 'none');
      pth.setAttribute('stroke-dasharray', '5 4');
      svg.appendChild(pth);

      function mv(e: MouseEvent) {
        const r = canvas.getBoundingClientRect();
        const x = (e.clientX - r.left) / zoom;
        const y = (e.clientY - r.top) / zoom;
        pth.setAttribute('d', `M${p1.x},${p1.y} L${x},${y}`);
      }
      function up(e: MouseEvent) {
        document.removeEventListener('mousemove', mv);
        document.removeEventListener('mouseup', up);
        pth.remove();
        const tgt = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement)?.closest('.node') as HTMLElement | null;
        if (tgt && tgt.id !== n.id) {
          let toSide = 't';
          const portEl = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
          if (portEl?.classList.contains('port')) toSide = portEl.dataset.d!;
          state.edges.push({id: 'e' + edgeId++, from: n.id, to: tgt.id, fromSide: side, toSide, label: ''});
          render();
        }
      }
      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup', up);
    }

    // Deselect on canvas background click
    const cwClickHandler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t === cw || t === canvas || (t as unknown) === svg) {
        sel = null;
        render();
      }
    };
    cw.addEventListener('mousedown', cwClickHandler);

    // ── Inspector ──────────────────────────────────────────────────────────
    function inspector() {
      const ins = document.getElementById('inspector') as HTMLElement;
      const n = state.nodes.find(x => x.id === sel);
      if (!n) {
        const e = state.edges.find(x => x.id === sel);
        if (e) {
          inspectEdge(e);
          return;
        }
        ins.innerHTML = `<div class="empty">Select a box to edit it,<br>or click a connection to edit/delete it.<br><br>
          <b>Drag</b> a green dot on a box edge to another box to connect them.<br><br>
          <kbd>Del</kbd> removes the selected box or line.</div>`;
        return;
      }
      ins.innerHTML = `
       <h2>Box</h2>
       <div class="pad">
         <div class="field"><label>Title</label><textarea id="f-title">${esc(n.title)}</textarea></div>
         <div class="field"><label>Subtitle</label><textarea id="f-sub" rows="3">${esc(n.sub)}</textarea></div>
         <div class="field"><label>Font</label><select id="f-font">
           <option value=""${!n.font ? ' selected' : ''}>Default (system)</option>
           <option value="Georgia, serif"${n.font === 'Georgia, serif' ? ' selected' : ''}>Georgia (serif)</option>
           <option value="'Times New Roman', serif"${n.font === "'Times New Roman', serif" ? ' selected' : ''}>Times New Roman</option>
           <option value="Arial, sans-serif"${n.font === 'Arial, sans-serif' ? ' selected' : ''}>Arial</option>
           <option value="'Trebuchet MS', sans-serif"${n.font === "'Trebuchet MS', sans-serif" ? ' selected' : ''}>Trebuchet MS</option>
           <option value="Verdana, sans-serif"${n.font === 'Verdana, sans-serif' ? ' selected' : ''}>Verdana</option>
           <option value="'Courier New', monospace"${n.font === "'Courier New', monospace" ? ' selected' : ''}>Courier (mono)</option>
         </select></div>
         <div class="field"><label>Highlight symbol</label><div class="swatches" id="badges"></div></div>
         <div class="field"><label>Fill color</label><div class="swatches" id="sw"></div></div>
         <div class="field"><label>Border color</label>
           <div class="row2" style="align-items:center">
             <input type="color" id="f-border" value="${n.border || '#7aa9d6'}" style="height:34px;padding:2px">
             <button id="borderReset" style="background:#eceae3;color:#555">Match theme</button>
           </div>
         </div>
         <div class="field row2">
           <div><label>Shape</label><select id="f-shape">
             <option value="rect"${n.shape === 'rect' ? ' selected' : ''}>Rounded</option>
             <option value="pill"${n.shape === 'pill' ? ' selected' : ''}>Pill</option>
           </select></div>
           <div><label>Width</label><input type="number" id="f-w" value="${n.w}" step="10" min="120" max="400"></div>
         </div>
         <button class="del" id="delNode" style="width:100%;margin-top:6px">Delete box</button>
       </div>`;

      const swrap = document.getElementById('sw') as HTMLElement;
      THEMES.forEach(t => {
        const s = document.createElement('div');
        s.className = 'sw' + (n.theme === t.k ? ' on' : '');
        s.style.background = SWATCH[t.k];
        s.title = t.name;
        s.onclick = () => {
          n.theme = t.k;
          render();
        };
        swrap.appendChild(s);
      });

      const bwrap = document.getElementById('badges') as HTMLElement;
      BADGES.forEach(b => {
        const s = document.createElement('div');
        s.className = 'sw' + (n.badge === b.v ? ' on' : '');
        s.style.cssText =
          'width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:17px;background:#f3f4f1;cursor:pointer';
        if (n.badge === b.v) s.style.borderColor = 'var(--dg)';
        s.textContent = b.v || '∅';
        s.title = b.name;
        if (!b.v) {
          s.style.fontSize = '12px';
          s.style.color = '#999';
        }
        s.onclick = () => {
          n.badge = b.v;
          render();
        };
        bwrap.appendChild(s);
      });

      (document.getElementById('f-title') as HTMLTextAreaElement).oninput = e => {
        n.title = (e.target as HTMLTextAreaElement).value;
        nodeEl(n);
        drawEdges();
      };
      (document.getElementById('f-sub') as HTMLTextAreaElement).oninput = e => {
        n.sub = (e.target as HTMLTextAreaElement).value;
        nodeEl(n);
        drawEdges();
        sizeCanvas();
      };
      (document.getElementById('f-font') as HTMLSelectElement).onchange = e => {
        n.font = (e.target as HTMLSelectElement).value;
        nodeEl(n);
        drawEdges();
      };
      (document.getElementById('f-border') as HTMLInputElement).oninput = e => {
        n.border = (e.target as HTMLInputElement).value;
        nodeEl(n);
      };
      (document.getElementById('borderReset') as HTMLButtonElement).onclick = () => {
        n.border = '';
        render();
      };
      (document.getElementById('f-shape') as HTMLSelectElement).onchange = e => {
        n.shape = (e.target as HTMLSelectElement).value;
        render();
      };
      (document.getElementById('f-w') as HTMLInputElement).oninput = e => {
        n.w = +(e.target as HTMLInputElement).value || 210;
        nodeEl(n);
        drawEdges();
        sizeCanvas();
      };
      (document.getElementById('delNode') as HTMLButtonElement).onclick = () => delNode(n.id);
    }

    function inspectEdge(e: Edge) {
      const ins = document.getElementById('inspector') as HTMLElement;
      ins.innerHTML = `<h2>Connection</h2><div class="pad">
        <div class="field"><label>Label (e.g. Yes / No)</label><input id="e-lbl" value="${esc(e.label)}"></div>
        <button class="del" id="delEdge" style="width:100%">Delete connection</button></div>`;
      (document.getElementById('e-lbl') as HTMLInputElement).oninput = ev => {
        e.label = (ev.target as HTMLInputElement).value;
        drawEdges();
      };
      (document.getElementById('delEdge') as HTMLButtonElement).onclick = () => {
        state.edges = state.edges.filter(x => x.id !== e.id);
        sel = null;
        render();
      };
    }

    function esc(s: string) {
      return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function delNode(id: string) {
      state.nodes = state.nodes.filter(n => n.id !== id);
      state.edges = state.edges.filter(e => e.from !== id && e.to !== id);
      document.getElementById(id)?.remove();
      sel = null;
      render();
    }

    const keyHandler = (e: KeyboardEvent) => {
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        sel &&
        !/INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement).tagName)
      ) {
        if (state.nodes.find(n => n.id === sel)) delNode(sel!);
        else {
          state.edges = state.edges.filter(x => x.id !== sel);
          sel = null;
          render();
        }
      }
    };
    document.addEventListener('keydown', keyHandler);

    // ── Auto layout ────────────────────────────────────────────────────────
    function autoLayout() {
      const dir = state.dir;
      const wrap = +state.wrap;
      const ind: Record<string, number> = {};
      const out: Record<string, string[]> = {};
      state.nodes.forEach(n => {
        ind[n.id] = 0;
        out[n.id] = [];
      });
      state.edges.forEach(e => {
        if (ind[e.to] != null) {
          ind[e.to]++;
          out[e.from]?.push(e.to);
        }
      });
      const depth: Record<string, number> = {};
      const roots = state.nodes.filter(n => ind[n.id] === 0).map(n => n.id);
      roots.forEach(r => (depth[r] = 0));
      const indc = {...ind};
      const queue = [...roots];
      let guard = 0;
      while (queue.length && guard++ < 5000) {
        const id = queue.shift()!;
        (out[id] || []).forEach(t => {
          depth[t] = Math.max(depth[t] ?? 0, (depth[id] ?? 0) + 1);
          if (--indc[t] === 0) queue.push(t);
        });
      }
      state.nodes.forEach(n => {
        if (depth[n.id] == null) depth[n.id] = 0;
      });
      const levels: Record<number, Node[]> = {};
      state.nodes.forEach(n => {
        (levels[depth[n.id]] = levels[depth[n.id]] || []).push(n);
      });
      const gapMain = 70;
      const colW = 240, rowH = 120;
      const levelKeys = Object.keys(levels).map(Number).sort((a, b) => a - b);
      let mainPos = 60;
      levelKeys.forEach(lk => {
        const group = levels[lk];
        let maxMain = 0;
        group.forEach((n, i) => {
          if (dir === 'TB') {
            n.x = 60 + i * colW;
            n.y = mainPos;
            maxMain = Math.max(maxMain, n.h);
          } else {
            n.y = 60 + i * rowH;
            n.x = mainPos;
            maxMain = Math.max(maxMain, n.w);
          }
        });
        mainPos += maxMain + (dir === 'TB' ? gapMain : gapMain + 30);
      });
      applyChainWrap(dir, wrap);
      state.edges.forEach(e => {
        e.fromSide = null;
        e.toSide = null;
      });
      render();
      fit();
    }

    function applyChainWrap(dir: string, wrap: number) {
      if (!wrap) return;
      const outMap: Record<string, string[]> = {};
      const inMap: Record<string, string[]> = {};
      state.nodes.forEach(n => {
        outMap[n.id] = [];
        inMap[n.id] = [];
      });
      state.edges.forEach(e => {
        outMap[e.from]?.push(e.to);
        inMap[e.to]?.push(e.from);
      });
      const isLinear =
        state.nodes.every(n => outMap[n.id].length <= 1 && inMap[n.id].length <= 1) &&
        state.edges.length > 0;
      if (!isLinear) return;
      const start = state.nodes.find(n => inMap[n.id].length === 0) || state.nodes[0];
      const order: Node[] = [];
      let cur: string | undefined = start.id;
      let g = 0;
      while (cur && g++ < 1000) {
        const node = state.nodes.find(n => n.id === cur);
        if (!node) break;
        order.push(node);
        cur = outMap[cur][0];
      }
      const colWw = 240, rowHh = 130, padX = 60, padY = 60;
      order.forEach((n, i) => {
        const band = Math.floor(i / wrap), idx = i % wrap;
        const fwd = band % 2 === 0;
        const pos = fwd ? idx : wrap - 1 - idx;
        if (dir === 'TB') {
          n.x = padX + pos * colWw;
          n.y = padY + band * rowHh;
        } else {
          n.x = padX + band * colWw * 1.2;
          n.y = padY + pos * rowHh;
        }
      });
    }

    // ── Zoom / fit ─────────────────────────────────────────────────────────
    function applyZoom() {
      canvas.style.transform = `scale(${zoom})`;
      (document.getElementById('zi') as HTMLElement).textContent = Math.round(zoom * 100) + '%';
    }

    function fit() {
      if (!state.nodes.length) return;
      let minx = 1e9, miny = 1e9, maxx = 0, maxy = 0;
      state.nodes.forEach(n => {
        minx = Math.min(minx, n.x);
        miny = Math.min(miny, n.y);
        maxx = Math.max(maxx, n.x + n.w);
        maxy = Math.max(maxy, n.y + n.h);
      });
      const pad = 60;
      const cwr = cw.clientWidth - 40, chr = cw.clientHeight - 40;
      zoom = Math.min(1, cwr / (maxx - minx + pad), chr / (maxy - miny + pad));
      zoom = Math.max(0.3, zoom);
      applyZoom();
      cw.scrollTo({left: (minx - 30) * zoom, top: (miny - 30) * zoom});
    }

    // ── Toolbar wiring ─────────────────────────────────────────────────────
    (document.getElementById('zoomIn') as HTMLButtonElement).onclick = () => {
      zoom = Math.min(2, zoom + 0.1);
      applyZoom();
    };
    (document.getElementById('zoomOut') as HTMLButtonElement).onclick = () => {
      zoom = Math.max(0.3, zoom - 0.1);
      applyZoom();
    };
    (document.getElementById('fit') as HTMLButtonElement).onclick = fit;

    (document.getElementById('addNode') as HTMLButtonElement).onclick = () => {
      const n = makeNode({
        x: 60 + (state.nodes.length % 5) * 30,
        y: 60 + (state.nodes.length % 5) * 30,
      });
      sel = n.id;
      render();
    };

    (document.getElementById('dir') as HTMLSelectElement).onchange = e => {
      state.dir = (e.target as HTMLSelectElement).value;
    };

    (document.getElementById('wrap') as HTMLSelectElement).onchange = e => {
      const v = (e.target as HTMLSelectElement).value;
      const ci = document.getElementById('wrapCustom') as HTMLInputElement;
      if (v === 'custom') {
        ci.style.display = 'inline-block';
        state.wrap = +ci.value || 0;
      } else {
        ci.style.display = 'none';
        state.wrap = +v;
      }
    };

    (document.getElementById('wrapCustom') as HTMLInputElement).oninput = e => {
      state.wrap = +(e.target as HTMLInputElement).value || 0;
    };

    (document.getElementById('autoLayout') as HTMLButtonElement).onclick = autoLayout;

    (document.getElementById('clear') as HTMLButtonElement).onclick = () => {
      if (confirm('Clear the whole canvas?')) {
        [...canvas.querySelectorAll('.node')].forEach(el => el.remove());
        state = {nodes: [], edges: [], dir: state.dir, wrap: state.wrap};
        sel = null;
        idc = 1;
        edgeId = 1;
        render();
      }
    };

    // ── Named Save / Load (localStorage) ──────────────────────────────────
    const PFB_PREFIX = 'pfb_flow_';

    function showLoadPanel() {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(PFB_PREFIX));
      const names = keys.map(k => k.slice(PFB_PREFIX.length));

      // Overlay
      const overlay = document.createElement('div');
      overlay.className = 'pfb-overlay';
      document.body.appendChild(overlay);

      // Panel
      const panel = document.createElement('div');
      panel.className = 'pfb-panel';
      panel.innerHTML = `<h3>Load Flow</h3>
        <div id="pfb-list">
          ${
            names.length
              ? names
                  .map(
                    n =>
                      `<div class="pfb-flow-item" data-name="${n}">
                      <span>${n}</span>
                      <button class="pfb-del" data-del="${n}">Delete</button>
                    </div>`,
                  )
                  .join('')
              : '<p class="pfb-empty-msg">No saved flows yet.</p>'
          }
        </div>
        <button class="pfb-cancel" id="pfb-close">Cancel</button>`;
      document.body.appendChild(panel);

      const close = () => {
        panel.remove();
        overlay.remove();
      };

      overlay.addEventListener('click', close);
      (panel.querySelector('#pfb-close') as HTMLButtonElement).onclick = close;

      panel.querySelectorAll('.pfb-flow-item').forEach(item => {
        const el = item as HTMLElement;
        el.addEventListener('click', e => {
          const btn = (e.target as HTMLElement).closest('[data-del]');
          if (btn) {
            // Delete action
            e.stopPropagation();
            const name = (btn as HTMLElement).dataset.del!;
            if (confirm(`Delete "${name}"?`)) {
              localStorage.removeItem(PFB_PREFIX + name);
              el.remove();
              if (!panel.querySelectorAll('.pfb-flow-item').length) {
                (panel.querySelector('#pfb-list') as HTMLElement).innerHTML =
                  '<p class="pfb-empty-msg">No saved flows yet.</p>';
              }
            }
            return;
          }
          // Load action
          const name = el.dataset.name!;
          const saved = localStorage.getItem(PFB_PREFIX + name);
          if (saved) {
            try {
              const loaded = JSON.parse(saved) as AppState;
              // Clear existing node DOM elements
              [...canvas.querySelectorAll('.node')].forEach(el2 => el2.remove());
              state = loaded;
              idc = state.nodes.length
                ? Math.max(...state.nodes.map(n => +n.id.replace('n', ''))) + 1
                : 1;
              edgeId = state.edges.length
                ? Math.max(...state.edges.map(e2 => +e2.id.replace('e', ''))) + 1
                : 1;
              sel = null;
              render();
              fit();
              close();
            } catch {
              alert('Could not load flow.');
            }
          }
        });
      });
    }

    (document.getElementById('saveLocal') as HTMLButtonElement).onclick = () => {
      const name = window.prompt('Name this flow (will overwrite if name exists):');
      if (!name || !name.trim()) return;
      localStorage.setItem(PFB_PREFIX + name.trim(), JSON.stringify(state));
      // Brief visual confirmation via the button text
      const btn = document.getElementById('saveLocal') as HTMLButtonElement;
      const orig = btn.textContent;
      btn.textContent = '✓ Saved!';
      setTimeout(() => {
        btn.textContent = orig;
      }, 1500);
    };

    (document.getElementById('loadLocal') as HTMLButtonElement).onclick = () => showLoadPanel();

    // ── Download / Import JSON ─────────────────────────────────────────────
    (document.getElementById('downloadJson') as HTMLButtonElement).onclick = () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'process-flow.json';
      a.click();
    };

    (document.getElementById('importJson') as HTMLButtonElement).onclick = () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json';
      inp.onchange = () => {
        const f = inp.files![0];
        const r = new FileReader();
        r.onload = () => {
          try {
            const loaded = JSON.parse(r.result as string) as AppState;
            [...canvas.querySelectorAll('.node')].forEach(el => el.remove());
            state = loaded;
            idc = state.nodes.length
              ? Math.max(...state.nodes.map(n => +n.id.replace('n', ''))) + 1
              : 1;
            edgeId = state.edges.length
              ? Math.max(...state.edges.map(e => +e.id.replace('e', ''))) + 1
              : 1;
            sel = null;
            render();
            fit();
          } catch {
            alert('Could not read file.');
          }
        };
        r.readAsText(f);
      };
      inp.click();
    };

    // ── PNG export ─────────────────────────────────────────────────────────
    function exportPNG() {
      if (!state.nodes.length) {
        alert('Nothing to export.');
        return;
      }
      let minx = 1e9, miny = 1e9, maxx = 0, maxy = 0;
      state.nodes.forEach(n => {
        minx = Math.min(minx, n.x);
        miny = Math.min(miny, n.y);
        maxx = Math.max(maxx, n.x + n.w);
        maxy = Math.max(maxy, n.y + n.h);
      });
      const pad = 40, W = maxx - minx + pad * 2, H = maxy - miny + pad * 2;
      const c = document.createElement('canvas');
      c.width = W * 2;
      c.height = H * 2;
      const x = c.getContext('2d')!;
      x.scale(2, 2);
      x.fillStyle = '#F7F8F6';
      x.fillRect(0, 0, W, H);
      x.translate(-minx + pad, -miny + pad);

      x.strokeStyle = '#5a6159';
      x.lineWidth = 2;
      state.edges.forEach(e => {
        const a = state.nodes.find(n => n.id === e.from);
        const b = state.nodes.find(n => n.id === e.to);
        if (!a || !b) return;
        let s = e.fromSide, t = e.toSide;
        if (!s || !t) {
          const ss = autoSides(a, b);
          s = ss[0];
          t = ss[1];
        }
        const p1 = port(a, s!), p2 = port(b, t!);
        const e1 = stub(p1, s!, 22), e2 = stub(p2, t!, 22);
        x.beginPath();
        x.moveTo(p1.x, p1.y);
        if (s === 'b' || s === 't') {
          const my = (e1.y + e2.y) / 2;
          x.lineTo(e1.x, e1.y);
          x.lineTo(e1.x, my);
          x.lineTo(e2.x, my);
          x.lineTo(e2.x, e2.y);
        } else {
          const mx = (e1.x + e2.x) / 2;
          x.lineTo(e1.x, e1.y);
          x.lineTo(mx, e1.y);
          x.lineTo(mx, e2.y);
          x.lineTo(e2.x, e2.y);
        }
        x.lineTo(p2.x, p2.y);
        x.stroke();
        const ang = Math.atan2(p2.y - e2.y, p2.x - e2.x);
        x.beginPath();
        x.moveTo(p2.x, p2.y);
        x.lineTo(p2.x - 8 * Math.cos(ang - 0.4), p2.y - 8 * Math.sin(ang - 0.4));
        x.lineTo(p2.x - 8 * Math.cos(ang + 0.4), p2.y - 8 * Math.sin(ang + 0.4));
        x.closePath();
        x.fillStyle = '#5a6159';
        x.fill();
        if (e.label) {
          const m = {x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2};
          x.fillStyle = '#fff';
          const tw = e.label.length * 6.6 + 12;
          x.fillRect(m.x - tw / 2, m.y - 9, tw, 18);
          x.strokeStyle = '#d9ddd6';
          x.strokeRect(m.x - tw / 2, m.y - 9, tw, 18);
          x.fillStyle = '#3a403a';
          x.font = '11.5px sans-serif';
          x.textAlign = 'center';
          x.fillText(e.label, m.x, m.y + 4);
          x.strokeStyle = '#5a6159';
        }
      });

      const fills: Record<string, string> = {
        start: '#0C2721', blue: '#dbe9f8', green: '#d8efe2', grey: '#eceae3',
        amber: '#f7eccf', purple: '#e2e0f5', red: '#f8e2dd',
      };
      const strokes: Record<string, string> = {
        start: '#0C2721', blue: '#7aa9d6', green: '#7cc4a0', grey: '#c2c0b6',
        amber: '#d8b65e', purple: '#9b96d6', red: '#d69a8c',
      };
      const inks: Record<string, string> = {
        start: '#fff', blue: '#1d4e79', green: '#1f6b4a', grey: '#4a4a44',
        amber: '#8a6a14', purple: '#403a86', red: '#9a3e2c',
      };

      state.nodes.forEach(n => {
        const r = n.shape === 'pill' ? n.h / 2 : 12;
        const fam = n.font || 'sans-serif';
        rr(x, n.x, n.y, n.w, n.h, r);
        x.fillStyle = fills[n.theme] || '#dbe9f8';
        x.fill();
        x.lineWidth = 2;
        x.strokeStyle = n.border || strokes[n.theme] || '#7aa9d6';
        x.stroke();
        x.fillStyle = inks[n.theme] || '#1d4e79';
        x.textAlign = 'center';
        x.font = '600 13.5px ' + fam;
        const titleLines = wrapText(x, n.title, n.x + n.w / 2, n.y + (n.sub ? 24 : n.h / 2 + 5), n.w - 24, 16);
        if (n.sub) {
          x.font = '11.5px ' + fam;
          wrapText(x, n.sub, n.x + n.w / 2, n.y + 24 + titleLines * 16 + 4, n.w - 24, 15);
        }
        if (n.badge) {
          x.font = '17px sans-serif';
          x.textAlign = 'center';
          x.fillText(n.badge, n.x + n.w - 2, n.y + 6);
        }
      });

      c.toBlob(b => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b!);
        a.download = 'process-flow.png';
        a.click();
      });
    }

    function rr(
      ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
    ) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function wrapText(
      ctx: CanvasRenderingContext2D, t: string, x: number, y: number, maxw: number, lh: number,
    ): number {
      let yy = y, count = 0;
      t.split('\n').forEach(para => {
        const words = para.split(' ');
        let line = '';
        words.forEach(w => {
          const test = line + w + ' ';
          if (ctx.measureText(test).width > maxw && line) {
            ctx.fillText(line.trim(), x, yy);
            line = w + ' ';
            yy += lh;
            count++;
          } else {
            line = test;
          }
        });
        ctx.fillText(line.trim(), x, yy);
        yy += lh;
        count++;
      });
      return count;
    }

    (document.getElementById('png') as HTMLButtonElement).onclick = exportPNG;

    // ── Seed demo ──────────────────────────────────────────────────────────
    function seed() {
      makeNode({id: 'n1', title: 'What do you need?', theme: 'start', shape: 'pill', x: 430, y: 40, w: 230});
      makeNode({id: 'n2', title: 'Goods / cat ID items', sub: 'Material to a PO', theme: 'blue', x: 160, y: 160, w: 230});
      makeNode({id: 'n3', title: 'Services', sub: 'With start / end dates', theme: 'green', x: 560, y: 160, w: 230});
      makeNode({id: 'n4', title: 'Create Material Request (MR)', sub: 'All cat ID flows through an MR', theme: 'blue', x: 150, y: 300, w: 250});
      makeNode({id: 'n5', title: 'Create Contract Req (CR)', sub: 'In AS9 CMM', theme: 'green', x: 560, y: 300, w: 230});
      makeNode({id: 'n6', title: 'PO created from the MR', theme: 'grey', x: 170, y: 430, w: 210});
      makeNode({id: 'n7', title: 'Contract Order (CO) created', theme: 'grey', x: 560, y: 430, w: 230});
      idc = 8;
      state.edges = [
        {id: 'e1', from: 'n1', to: 'n2', fromSide: 'b', toSide: 't', label: ''},
        {id: 'e2', from: 'n1', to: 'n3', fromSide: 'b', toSide: 't', label: ''},
        {id: 'e3', from: 'n2', to: 'n4', fromSide: 'b', toSide: 't', label: ''},
        {id: 'e4', from: 'n3', to: 'n5', fromSide: 'b', toSide: 't', label: ''},
        {id: 'e5', from: 'n4', to: 'n6', fromSide: 'b', toSide: 't', label: ''},
        {id: 'e6', from: 'n5', to: 'n7', fromSide: 'b', toSide: 't', label: ''},
      ];
      edgeId = 7;
    }

    // ── Init ───────────────────────────────────────────────────────────────
    seed();
    render();
    applyZoom();

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      initRef.current = false;
      styleEl.remove();
      document.removeEventListener('keydown', keyHandler);
      cw.removeEventListener('mousedown', cwClickHandler);
      [...canvas.querySelectorAll('.node')].forEach(el => el.remove());
      svg.innerHTML = '';
      // Remove any lingering panels
      document.querySelectorAll('.pfb-overlay, .pfb-panel').forEach(el => el.remove());
    };
  }, []);

  return (
    <div
      id="pfb-root"
      dangerouslySetInnerHTML={{__html: HTML}}
    />
  );
}
