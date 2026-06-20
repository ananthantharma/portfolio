'use client';

import {useEffect, useRef} from 'react';

// ── Scoped CSS ────────────────────────────────────────────────────────────────
const CSS = `
#pfb-root *{box-sizing:border-box}
#pfb-root {
  --dg:#0C2721; --green:#66CC00; --lgreen:#C7E995;
  --ink:#1b2420;
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
  text-decoration:none;transition:background .15s;white-space:nowrap;font-family:inherit;
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
#pfb-root .canvas-wrap{flex:1;overflow:auto;background:#ffffff;position:relative}
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
#pfb-root .side{width:270px;background:#fff;border-left:1px solid #e3e6e1;display:flex;flex-direction:column;overflow-y:auto}
#pfb-root .side h2{font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:#7a8079;margin:16px 16px 8px}
#pfb-root .side .pad{padding:0 16px 12px}
#pfb-root .field{margin-bottom:10px}
#pfb-root .field label{display:block;font-size:11px;color:#666;margin-bottom:4px;font-weight:500}
#pfb-root .field input,#pfb-root .field textarea,#pfb-root .field select{
  width:100%;border:1px solid #d4d8d2;border-radius:7px;
  padding:7px 9px;font-size:13px;font-family:inherit;background:#fff;color:var(--ink);
}
#pfb-root .field textarea{resize:vertical;min-height:46px}
#pfb-root .swatches{display:flex;gap:6px;flex-wrap:wrap}
#pfb-root .sw{width:30px;height:30px;border-radius:7px;cursor:pointer;border:2px solid transparent}
#pfb-root .sw.on{border-color:var(--dg)}
#pfb-root .empty{padding:30px 16px;text-align:center;color:#9aa099;font-size:12.5px;line-height:1.6}
#pfb-root .del{background:#f8e2dd;color:#9a3e2c}
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
#pfb-root svg.edges .edge-grp:hover path.vis{filter:brightness(.7)}
#pfb-root .edge-grp.esel path.vis{filter:none}
/* Legend */
#pfb-legend{
  position:absolute;background:#fff;border:2px solid #0C2721;
  border-radius:10px;padding:10px 14px;box-shadow:0 2px 10px rgba(0,0,0,.12);
  z-index:20;cursor:grab;user-select:none;min-width:130px;
}
#pfb-legend:active{cursor:grabbing}
#pfb-legend .leg-hdr{
  font-weight:700;font-size:11px;color:#0C2721;letter-spacing:.5px;
  display:flex;align-items:center;justify-content:space-between;
  max-height:0;overflow:hidden;opacity:0;
  transition:max-height .2s ease,opacity .15s ease,margin-bottom .2s ease;
  margin-bottom:0;
}
#pfb-legend:hover .leg-hdr{
  max-height:40px;opacity:1;margin-bottom:8px;
}
#pfb-legend .leg-lay-btn{
  background:#eee;color:#555;border:none;border-radius:4px;
  padding:2px 7px;font-size:10px;cursor:pointer;font-weight:600;
}
#pfb-legend .leg-lay-btn.active{background:#66CC00;color:#0C2721}
#pfb-legend .leg-item{display:flex;align-items:center;gap:7px}
#pfb-legend .leg-swatch{width:14px;height:14px;border-radius:3px;border:1.5px solid #0C2721;flex-shrink:0}
#pfb-legend .leg-lbl{
  font-size:11.5px;color:#333;outline:none;min-width:40px;
  border-bottom:1px solid transparent;transition:border-color .1s;
}
#pfb-legend .leg-lbl:hover{border-bottom-color:#ccc}
#pfb-legend .leg-lbl:focus{border-bottom-color:#66CC00}
#pfb-legend .leg-remove{
  background:none;border:none;color:#bbb;cursor:pointer;font-size:14px;
  padding:0 0 0 2px;line-height:1;flex-shrink:0;opacity:0;transition:opacity .1s;
}
#pfb-legend .leg-item:hover .leg-remove{opacity:1}
#pfb-legend .leg-remove:hover{color:#b91c1c!important;background:none!important}
/* Overlay panels */
.pfb-overlay{position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:9999}
.pfb-panel{
  position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
  background:#fff;border:1px solid #e0e3df;border-radius:14px;
  padding:22px;z-index:10000;min-width:300px;max-width:480px;width:90%;
  box-shadow:0 12px 40px rgba(0,0,0,.18);
}
.pfb-panel h3{margin:0 0 8px;font-size:15px;color:#0C2721;font-weight:700;font-family:-apple-system,sans-serif}
.pfb-panel p{margin:0 0 12px;font-size:12px;color:#666;line-height:1.5;font-family:-apple-system,sans-serif}
.pfb-panel textarea,.pfb-panel input[type=text]{
  width:100%;border:1px solid #d4d8d2;border-radius:8px;padding:10px;
  font-family:monospace;font-size:13px;resize:vertical;outline:none;color:#1b2420;
}
.pfb-panel textarea:focus,.pfb-panel input:focus{border-color:#66CC00}
.pfb-flow-item{
  display:flex;align-items:center;justify-content:space-between;
  padding:9px 11px;margin:4px 0;background:#f5f7f5;border-radius:8px;
  cursor:pointer;font-size:13px;font-family:-apple-system,sans-serif;transition:background .1s;
}
.pfb-flow-item:hover{background:#e8f5d4}
.pfb-flow-item span{flex:1;font-weight:500;color:#1b2420}
.pfb-flow-item .pfb-del{
  background:#fee2e2;color:#b91c1c;border:none;border-radius:5px;
  padding:3px 9px;font-size:11px;cursor:pointer;font-family:inherit;
}
.pfb-flow-item .pfb-del:hover{background:#fecaca}
.pfb-btn-row{display:flex;gap:8px;margin-top:12px}
.pfb-btn-primary{
  flex:1;background:#66CC00;color:#0C2721;border:none;border-radius:8px;
  padding:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:-apple-system,sans-serif;
}
.pfb-btn-primary:hover{background:#7adb12}
.pfb-cancel{
  background:#eceae3;color:#444;border:none;border-radius:8px;
  padding:10px 16px;font-size:12.5px;cursor:pointer;font-family:-apple-system,sans-serif;
}
.pfb-cancel:hover{background:#dddbd4}
.pfb-empty-msg{text-align:center;color:#9aa099;font-size:13px;padding:16px 0;font-family:-apple-system,sans-serif}
`;

// ── HTML scaffold ─────────────────────────────────────────────────────────────
const HTML = `
<header>
  <a href="/notes" class="back-btn" title="Back to Notes">← Notes</a>
  <h1>Process Flow Builder</h1>
  <span class="tag">VISIO-STYLE EDITOR</span>
  <div class="bar">
    <div class="grp">
      <label>Add</label>
      <button class="accent" id="addNode">+ Box</button>
      <button class="ghost" id="hierarchyBtn" title="Build diagram from text hierarchy">📋 Hierarchy</button>
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
      <label>Canvas</label>
      <input type="color" id="canvasBgPicker" value="#ffffff" title="Canvas background colour"
        style="height:28px;width:34px;padding:2px;border-radius:5px;border:none;cursor:pointer;background:none">
    </div>
    <div class="grp">
      <button class="ghost" id="legendBtn" title="Toggle colour legend">🗓 Legend</button>
      <button class="ghost" id="saveLocal" title="Save to browser">💾 Save</button>
      <button class="ghost" id="loadLocal" title="Load saved flow">📂 Load</button>
      <button class="ghost" id="downloadJson" title="Download JSON">↓ JSON</button>
      <button class="ghost" id="importJson" title="Import JSON">↑ Import</button>
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

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.id = 'pfb-styles';
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    // ── Type definitions ───────────────────────────────────────────────────
    type Node = {
      id: string; x: number; y: number; w: number; h: number;
      title: string; sub: string; theme: string; shape: string;
      badge: string; border: string; font: string;
    };
    type Edge = {
      id: string; from: string; to: string;
      fromSide: string | null; toSide: string | null;
      label: string; color?: string; style?: string;
    };
    type LegendState = {
      visible: boolean; x: number; y: number; layout: 'V' | 'H';
      labels: Record<string, string>;
      hidden: string[];
    };
    type AppState = {
      nodes: Node[]; edges: Edge[]; dir: string; wrap: number; legend: LegendState;
      canvasBg: string;
    };

    // ── Constants ──────────────────────────────────────────────────────────
    const THEMES = [
      {k: 'start', name: 'Start / End'},
      {k: 'blue',  name: 'Process Step'},
      {k: 'green', name: 'Approved'},
      {k: 'grey',  name: 'Note / Neutral'},
      {k: 'amber', name: 'Caution'},
      {k: 'purple',name: 'Decision'},
      {k: 'red',   name: 'Issue / Stop'},
    ];
    const SWATCH: Record<string, string> = {
      start:'#0C2721', blue:'#dbe9f8', green:'#d8efe2',
      grey:'#eceae3', amber:'#f7eccf', purple:'#e2e0f5', red:'#f8e2dd',
    };
    const BADGES = [
      {v:'',name:'None'},{v:'⭐',name:'Star'},{v:'🚩',name:'Flag'},{v:'⚠️',name:'Warning'},
      {v:'🔑',name:'Key step'},{v:'✅',name:'Done'},{v:'🔴',name:'Critical'},
      {v:'⏱️',name:'Time-sensitive'},{v:'💲',name:'Cost'},{v:'📌',name:'Pin'},
      {v:'❗',name:'Important'},{v:'🔒',name:'Locked'},
    ];

    const defaultLegend = (): LegendState => ({
      visible: false, x: 20, y: 20, layout: 'V',
      labels: Object.fromEntries(THEMES.map(t => [t.k, t.name])),
      hidden: [],
    });

    // ── State ──────────────────────────────────────────────────────────────
    let state: AppState = {nodes: [], edges: [], dir: 'TB', wrap: 4, legend: defaultLegend(), canvasBg: '#ffffff'};
    let sel: string | null = null;
    let idc = 1;
    let edgeId = 1;
    let zoom = 1;

    const canvas  = document.getElementById('canvas') as HTMLDivElement;
    const svg     = document.getElementById('edges') as unknown as SVGSVGElement;
    const cw      = document.getElementById('cw') as HTMLDivElement;

    // ── Node creation ──────────────────────────────────────────────────────
    function makeNode(opts: Partial<Node> = {}): Node {
      const n: Node = Object.assign(
        {id:'n'+idc++, x:80, y:80, w:210, h:74,
         title:'New step', sub:'', theme:'blue', shape:'rect',
         badge:'', border:'', font:''},
        opts,
      );
      state.nodes.push(n);
      return n;
    }

    // ── Render node DOM element ────────────────────────────────────────────
    // FIX: uses a per-node ID lookup so each node keeps its own element
    function nodeEl(n: Node): HTMLDivElement {
      let el = document.getElementById(n.id) as HTMLDivElement | null;
      if (!el) {
        el = document.createElement('div');
        el.id = n.id;
        el.innerHTML =
          `<div class="inner"><div class="ttl"></div><div class="sub"></div></div>` +
          `<span class="badge"></span>` +
          `<span class="port t" data-d="t"></span><span class="port b" data-d="b"></span>` +
          `<span class="port l" data-d="l"></span><span class="port r" data-d="r"></span>`;
        canvas.appendChild(el);
        bindNode(el, n);   // bind ONCE when the element is first created
      }
      // Update visual state (class, position, text)
      el.className =
        'node t-' + n.theme +
        (n.shape === 'pill' ? ' shape-pill' : '') +
        (sel === n.id ? ' sel' : '');
      el.style.cssText =
        `left:${n.x}px;top:${n.y}px;width:${n.w}px;` +
        (n.border ? `border-color:${n.border};` : '') +
        (n.font   ? `font-family:${n.font};`    : '');
      (el.querySelector('.ttl') as HTMLElement).textContent = n.title;
      const sub = el.querySelector('.sub') as HTMLElement;
      sub.textContent = n.sub || '';
      sub.style.display = n.sub ? 'block' : 'none';
      const badge = el.querySelector('.badge') as HTMLElement;
      badge.textContent = n.badge || '';
      badge.style.display = n.badge ? 'block' : 'none';
      // Snapshot height after layout settles
      requestAnimationFrame(() => { if (el) n.h = el.offsetHeight; });
      return el;
    }

    // ── Full re-render ─────────────────────────────────────────────────────
    function render() {
      state.nodes.forEach(nodeEl);
      // Remove DOM elements for deleted nodes
      [...canvas.querySelectorAll('.node')].forEach(el => {
        if (!state.nodes.find(n => n.id === el.id)) el.remove();
      });
      drawEdges();
      renderLegend();
      inspector();
      sizeCanvas();
    }

    // ── Geometry helpers ───────────────────────────────────────────────────
    function port(n: Node, side: string) {
      const {x, y, w, h} = n;
      if (side === 't') return {x: x+w/2, y};
      if (side === 'b') return {x: x+w/2, y: y+h};
      if (side === 'l') return {x, y: y+h/2};
      return {x: x+w, y: y+h/2};
    }
    function autoSides(a: Node, b: Node): [string, string] {
      const dx = (b.x+b.w/2)-(a.x+a.w/2), dy = (b.y+b.h/2)-(a.y+a.h/2);
      if (Math.abs(dy) >= Math.abs(dx)) return dy >= 0 ? ['b','t'] : ['t','b'];
      return dx >= 0 ? ['r','l'] : ['l','r'];
    }
    function stub(p: {x:number;y:number}, s: string, o: number) {
      if (s==='t') return {x:p.x, y:p.y-o};
      if (s==='b') return {x:p.x, y:p.y+o};
      if (s==='l') return {x:p.x-o, y:p.y};
      return {x:p.x+o, y:p.y};
    }
    function orthPath(p1:{x:number;y:number}, s1:string, p2:{x:number;y:number}, s2:string) {
      const off=22, e1=stub(p1,s1,off), e2=stub(p2,s2,off);
      const mx=(e1.x+e2.x)/2, my=(e1.y+e2.y)/2;
      let pts=[p1,e1];
      if (s1==='b'||s1==='t') pts.push({x:e1.x,y:my},{x:e2.x,y:my});
      else                     pts.push({x:mx,y:e1.y},{x:mx,y:e2.y});
      pts.push(e2,p2);
      return 'M'+pts.map(p=>p.x+','+p.y).join(' L');
    }
    function midOf(p1:{x:number;y:number}, p2:{x:number;y:number}) {
      return {x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2};
    }

    // ── Draw edges ─────────────────────────────────────────────────────────
    function drawEdges() {
      // Build one <marker> per unique colour
      const usedColors = new Set<string>();
      state.edges.forEach(e => usedColors.add(e.color || '#5a6159'));
      usedColors.add('#66CC00'); // always need green for selected
      let defs = '<defs>';
      usedColors.forEach(c => {
        const id = 'arr-' + c.replace('#','');
        defs += `<marker id="${id}" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="${c}"/>
        </marker>`;
      });
      defs += '</defs>';
      svg.innerHTML = defs;

      state.edges.forEach(e => {
        const a = state.nodes.find(n=>n.id===e.from);
        const b = state.nodes.find(n=>n.id===e.to);
        if (!a||!b) return;
        let sA=e.fromSide, sB=e.toSide;
        if (!sA||!sB) { const s=autoSides(a,b); sA=s[0]; sB=s[1]; }
        const p1=port(a,sA!), p2=port(b,sB!);
        const path=orthPath(p1,sA!,p2,sB!);
        const isSel = sel===e.id;
        const edgeColor = isSel ? '#66CC00' : (e.color || '#5a6159');
        const markerId = 'arr-' + edgeColor.replace('#','');
        const sw = e.style==='thick' ? '4' : '2';
        const da = e.style==='dashed' ? '8 4' : e.style==='dotted' ? '2 4' : '';

        const g = document.createElementNS('http://www.w3.org/2000/svg','g');
        g.setAttribute('class','edge-grp'+(isSel?' esel':''));
        g.style.pointerEvents='auto';

        // Wide invisible hit path
        const hit = document.createElementNS('http://www.w3.org/2000/svg','path');
        hit.setAttribute('d',path); hit.setAttribute('fill','none');
        hit.setAttribute('stroke','transparent'); hit.setAttribute('stroke-width','14');
        hit.setAttribute('class','hit');
        hit.addEventListener('click', ev=>{ ev.stopPropagation(); sel=e.id; render(); });

        // Visible line
        const pth = document.createElementNS('http://www.w3.org/2000/svg','path');
        pth.setAttribute('d',path); pth.setAttribute('fill','none');
        pth.setAttribute('stroke',edgeColor); pth.setAttribute('stroke-width',sw);
        pth.setAttribute('marker-end',`url(#${markerId})`); pth.setAttribute('class','vis');
        if (da) pth.setAttribute('stroke-dasharray',da);
        if (isSel) pth.setAttribute('stroke-dashoffset','0');

        g.appendChild(hit); g.appendChild(pth);

        // Edge label
        if (e.label) {
          const mid=midOf(p1,p2);
          const tw=e.label.length*6.6+12;
          const r=document.createElementNS('http://www.w3.org/2000/svg','rect');
          r.setAttribute('x',String(mid.x-tw/2)); r.setAttribute('y',String(mid.y-9));
          r.setAttribute('width',String(tw)); r.setAttribute('height','18'); r.setAttribute('rx','5');
          r.setAttribute('fill','#fff'); r.setAttribute('stroke',isSel?'#66CC00':'#d9ddd6');
          r.style.cursor='pointer';
          r.addEventListener('click',ev=>{ ev.stopPropagation(); sel=e.id; render(); });
          const t=document.createElementNS('http://www.w3.org/2000/svg','text');
          t.textContent=e.label;
          t.setAttribute('x',String(mid.x)); t.setAttribute('y',String(mid.y+4));
          t.setAttribute('text-anchor','middle'); t.setAttribute('font-size','11.5');
          t.setAttribute('font-family','sans-serif'); t.setAttribute('fill','#3a403a');
          g.appendChild(r); g.appendChild(t);
        }
        svg.appendChild(g);
      });
    }

    // ── Canvas sizing ──────────────────────────────────────────────────────
    function sizeCanvas() {
      let mx=800, my=600;
      state.nodes.forEach(n=>{ mx=Math.max(mx,n.x+n.w+120); my=Math.max(my,n.y+n.h+120); });
      canvas.style.width=mx+'px'; canvas.style.height=my+'px';
      svg.setAttribute('width',String(mx)); svg.setAttribute('height',String(my));
    }

    // ── Bind drag to node ──────────────────────────────────────────────────
    function bindNode(el: HTMLDivElement, n: Node) {
      el.addEventListener('mousedown', ev => {
        const target = ev.target as HTMLElement;
        if (target.classList.contains('port')) { startEdge(n, target.dataset.d!, ev); return; }

        // Select this node and update inspector WITHOUT calling full render
        // (avoids the node overlap/stale-inspector bug)
        sel = n.id;
        // Update all node classes (sel highlight)
        state.nodes.forEach(nd => {
          const ndEl = document.getElementById(nd.id);
          if (!ndEl) return;
          ndEl.className =
            'node t-'+nd.theme+(nd.shape==='pill'?' shape-pill':'')+(sel===nd.id?' sel':'');
        });
        inspector(); // only re-render inspector, not the whole canvas

        let moved = false;
        const sx=ev.clientX, sy=ev.clientY, ox=n.x, oy=n.y;
        function mv(e: MouseEvent) {
          moved = true;
          n.x=Math.round((ox+(e.clientX-sx)/zoom)/10)*10;
          n.y=Math.round((oy+(e.clientY-sy)/zoom)/10)*10;
          el.style.left=n.x+'px'; el.style.top=n.y+'px';
          drawEdges();
        }
        function up() {
          document.removeEventListener('mousemove',mv);
          document.removeEventListener('mouseup',up);
          if (moved) sizeCanvas();
        }
        document.addEventListener('mousemove',mv);
        document.addEventListener('mouseup',up);
        ev.stopPropagation();
      });
    }

    // ── Edge drawing (drag from port) ──────────────────────────────────────
    function startEdge(n: Node, side: string, ev: MouseEvent) {
      ev.stopPropagation(); ev.preventDefault();
      const p1=port(n,side);
      const pth=document.createElementNS('http://www.w3.org/2000/svg','path');
      pth.setAttribute('stroke','#66CC00'); pth.setAttribute('stroke-width','2.5');
      pth.setAttribute('fill','none'); pth.setAttribute('stroke-dasharray','5 4');
      svg.appendChild(pth);
      function mv(e: MouseEvent) {
        const r=canvas.getBoundingClientRect();
        pth.setAttribute('d',`M${p1.x},${p1.y} L${(e.clientX-r.left)/zoom},${(e.clientY-r.top)/zoom}`);
      }
      function up(e: MouseEvent) {
        document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up);
        pth.remove();
        const tgt=(document.elementFromPoint(e.clientX,e.clientY) as HTMLElement)?.closest('.node') as HTMLElement|null;
        if (tgt && tgt.id!==n.id) {
          const portEl=document.elementFromPoint(e.clientX,e.clientY) as HTMLElement;
          const toSide=portEl?.classList.contains('port') ? portEl.dataset.d! : 't';
          state.edges.push({id:'e'+edgeId++, from:n.id, to:tgt.id, fromSide:side, toSide, label:''});
          render();
        }
      }
      document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
    }

    // Deselect when clicking empty canvas
    const cwClick = (e: MouseEvent) => {
      const t=e.target as HTMLElement;
      if (t===cw||t===canvas||(t as unknown)===svg) { sel=null; render(); }
    };
    cw.addEventListener('mousedown', cwClick);

    // ── Inspector ──────────────────────────────────────────────────────────
    function inspector() {
      const ins=document.getElementById('inspector') as HTMLElement;
      const n=state.nodes.find(x=>x.id===sel);
      if (!n) {
        const e=state.edges.find(x=>x.id===sel);
        if (e) { inspectEdge(e); return; }
        ins.innerHTML=`<div class="empty">Select a box to edit it,<br>or click a connection to edit/delete.<br><br>
          <b>Drag</b> a green dot to another box to connect.<br><br>
          <kbd>Del</kbd> removes the selected item.</div>`;
        return;
      }
      ins.innerHTML=`
       <h2>Box</h2>
       <div class="pad">
         <div class="field"><label>Title</label><textarea id="f-title">${esc(n.title)}</textarea></div>
         <div class="field"><label>Subtitle</label><textarea id="f-sub" rows="3">${esc(n.sub)}</textarea></div>
         <div class="field"><label>Font</label><select id="f-font">
           <option value=""${!n.font?' selected':''}>Default</option>
           <option value="Georgia, serif"${n.font==='Georgia, serif'?' selected':''}>Georgia</option>
           <option value="'Times New Roman', serif"${n.font==="'Times New Roman', serif"?' selected':''}>Times New Roman</option>
           <option value="Arial, sans-serif"${n.font==='Arial, sans-serif'?' selected':''}>Arial</option>
           <option value="'Trebuchet MS', sans-serif"${n.font==="'Trebuchet MS', sans-serif"?' selected':''}>Trebuchet MS</option>
           <option value="Verdana, sans-serif"${n.font==='Verdana, sans-serif'?' selected':''}>Verdana</option>
           <option value="'Courier New', monospace"${n.font==="'Courier New', monospace"?' selected':''}>Courier</option>
         </select></div>
         <div class="field"><label>Highlight symbol</label><div class="swatches" id="badges"></div></div>
         <div class="field"><label>Fill colour</label><div class="swatches" id="sw"></div></div>
         <div class="field"><label>Border colour</label>
           <div class="row2" style="align-items:center">
             <input type="color" id="f-border" value="${n.border||'#7aa9d6'}" style="height:34px;padding:2px">
             <button id="borderReset" style="background:#eceae3;color:#555;font-size:11px">Reset</button>
           </div>
         </div>
         <div class="field row2">
           <div><label>Shape</label><select id="f-shape">
             <option value="rect"${n.shape==='rect'?' selected':''}>Rounded</option>
             <option value="pill"${n.shape==='pill'?' selected':''}>Pill</option>
           </select></div>
           <div><label>Width</label><input type="number" id="f-w" value="${n.w}" step="10" min="120" max="500"></div>
         </div>
         <button class="del" id="delNode" style="width:100%;margin-top:6px">Delete box</button>
       </div>`;

      // Colour swatches
      const swrap=document.getElementById('sw') as HTMLElement;
      THEMES.forEach(t=>{
        const s=document.createElement('div');
        s.className='sw'+(n.theme===t.k?' on':'');
        s.style.background=SWATCH[t.k]; s.title=t.name;
        s.onclick=()=>{ n.theme=t.k; render(); };
        swrap.appendChild(s);
      });

      // Badge picker
      const bwrap=document.getElementById('badges') as HTMLElement;
      BADGES.forEach(b=>{
        const s=document.createElement('div');
        s.className='sw'+(n.badge===b.v?' on':'');
        s.style.cssText='width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:17px;background:#f3f4f1;cursor:pointer';
        if (n.badge===b.v) s.style.borderColor='var(--dg)';
        s.textContent=b.v||'∅'; s.title=b.name;
        if (!b.v){s.style.fontSize='12px';s.style.color='#999';}
        s.onclick=()=>{ n.badge=b.v; render(); };
        bwrap.appendChild(s);
      });

      (document.getElementById('f-title') as HTMLTextAreaElement).oninput=e=>{
        n.title=(e.target as HTMLTextAreaElement).value; nodeEl(n); drawEdges();
      };
      (document.getElementById('f-sub') as HTMLTextAreaElement).oninput=e=>{
        n.sub=(e.target as HTMLTextAreaElement).value; nodeEl(n); drawEdges(); sizeCanvas();
      };
      (document.getElementById('f-font') as HTMLSelectElement).onchange=e=>{
        n.font=(e.target as HTMLSelectElement).value; nodeEl(n);
      };
      (document.getElementById('f-border') as HTMLInputElement).oninput=e=>{
        n.border=(e.target as HTMLInputElement).value; nodeEl(n);
      };
      (document.getElementById('borderReset') as HTMLButtonElement).onclick=()=>{ n.border=''; render(); };
      (document.getElementById('f-shape') as HTMLSelectElement).onchange=e=>{
        n.shape=(e.target as HTMLSelectElement).value; render();
      };
      (document.getElementById('f-w') as HTMLInputElement).oninput=e=>{
        n.w=+(e.target as HTMLInputElement).value||210; nodeEl(n); drawEdges(); sizeCanvas();
      };
      (document.getElementById('delNode') as HTMLButtonElement).onclick=()=>delNode(n.id);
    }

    function inspectEdge(e: Edge) {
      const ins=document.getElementById('inspector') as HTMLElement;
      const edgeCol=e.color||'#5a6159';
      ins.innerHTML=`<h2>Connection</h2><div class="pad">
        <div class="field"><label>Label (e.g. Yes / No)</label><input id="e-lbl" value="${esc(e.label)}"></div>
        <div class="field"><label>Line colour</label>
          <div class="row2" style="align-items:center">
            <input type="color" id="e-color" value="${edgeCol}" style="height:34px;padding:2px">
            <button id="e-colorReset" style="background:#eceae3;color:#555;font-size:11px">Default</button>
          </div>
        </div>
        <div class="field"><label>Line style</label>
          <select id="e-style">
            <option value="solid"${(!e.style||e.style==='solid')?' selected':''}>Solid</option>
            <option value="dashed"${e.style==='dashed'?' selected':''}>Dashed</option>
            <option value="dotted"${e.style==='dotted'?' selected':''}>Dotted</option>
            <option value="thick"${e.style==='thick'?' selected':''}>Thick</option>
          </select>
        </div>
        <button class="del" id="delEdge" style="width:100%;margin-top:6px">Delete connection</button>
      </div>`;

      (document.getElementById('e-lbl') as HTMLInputElement).oninput=ev=>{
        e.label=(ev.target as HTMLInputElement).value; drawEdges();
      };
      (document.getElementById('e-color') as HTMLInputElement).oninput=ev=>{
        e.color=(ev.target as HTMLInputElement).value; drawEdges();
      };
      (document.getElementById('e-colorReset') as HTMLButtonElement).onclick=()=>{
        e.color=undefined; drawEdges();
        (document.getElementById('e-color') as HTMLInputElement).value='#5a6159';
      };
      (document.getElementById('e-style') as HTMLSelectElement).onchange=ev=>{
        e.style=(ev.target as HTMLSelectElement).value; drawEdges();
      };
      (document.getElementById('delEdge') as HTMLButtonElement).onclick=()=>{
        state.edges=state.edges.filter(x=>x.id!==e.id); sel=null; render();
      };
    }

    function esc(s: string) {
      return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function delNode(id: string) {
      state.nodes=state.nodes.filter(n=>n.id!==id);
      state.edges=state.edges.filter(e=>e.from!==id&&e.to!==id);
      document.getElementById(id)?.remove();
      sel=null; render();
    }

    // Delete key
    const keyHandler=(e: KeyboardEvent)=>{
      if ((e.key==='Delete'||e.key==='Backspace') && sel &&
          !/INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement).tagName)) {
        if (state.nodes.find(n=>n.id===sel)) delNode(sel!);
        else { state.edges=state.edges.filter(x=>x.id!==sel); sel=null; render(); }
      }
    };
    document.addEventListener('keydown', keyHandler);

    // ── Legend ─────────────────────────────────────────────────────────────
    function renderLegend() {
      let leg=document.getElementById('pfb-legend') as HTMLElement|null;
      if (!state.legend.visible) { leg?.remove(); return; }
      if (!leg) {
        leg=document.createElement('div');
        leg.id='pfb-legend';
        canvas.appendChild(leg);
        bindLegendDrag(leg);
      }
      const isH=state.legend.layout==='H';
      leg.style.left=state.legend.x+'px';
      leg.style.top=state.legend.y+'px';

      const hidden = state.legend.hidden || [];
      const hasHidden = hidden.length > 0;
      const visibleThemes = THEMES.filter(t => !hidden.includes(t.k));

      const items=visibleThemes.map(t=>{
        const label=state.legend.labels[t.k]||t.name;
        return `<div class="leg-item" style="${isH?'display:inline-flex;margin-right:12px;margin-bottom:4px;':'margin-bottom:5px;'}align-items:center;gap:7px">
          <div class="leg-swatch" style="background:${SWATCH[t.k]}"></div>
          <span class="leg-lbl" contenteditable="true" data-theme="${t.k}" spellcheck="false">${label}</span>
          <button class="leg-remove" data-remove="${t.k}" title="Remove from legend">×</button>
        </div>`;
      }).join('');

      leg.innerHTML=`
        <div class="leg-hdr">
          <span>LEGEND</span>
          <div style="display:flex;gap:4px">
            <button class="leg-lay-btn${!isH?' active':''}" data-lay="V">V</button>
            <button class="leg-lay-btn${isH?' active':''}" data-lay="H">H</button>
            ${hasHidden ? `<button class="leg-lay-btn" data-restore="1" title="Restore ${hidden.length} hidden colour${hidden.length>1?'s':''}">↺</button>` : ''}
          </div>
        </div>
        <div style="${isH?'display:flex;flex-wrap:wrap;':''}padding:2px 0">${items||'<div style="font-size:11px;color:#aaa;padding:4px 0">All colours hidden — click ↺ to restore</div>'}</div>`;

      // Layout toggle buttons
      (leg as HTMLElement).querySelectorAll('[data-lay]').forEach(btn=>{
        (btn as HTMLElement).addEventListener('mousedown', e=>{
          e.stopPropagation();
          state.legend.layout=(btn as HTMLElement).dataset.lay as 'V'|'H';
          renderLegend();
        });
      });

      // Restore all hidden colours
      const restoreBtn=(leg as HTMLElement).querySelector('[data-restore]');
      if (restoreBtn) {
        restoreBtn.addEventListener('mousedown', e=>{
          e.stopPropagation();
          state.legend.hidden=[];
          renderLegend();
        });
      }

      // Remove individual colour from legend
      (leg as HTMLElement).querySelectorAll('[data-remove]').forEach(btn=>{
        (btn as HTMLElement).addEventListener('mousedown', e=>{
          e.stopPropagation();
          const theme=(btn as HTMLElement).dataset.remove!;
          state.legend.hidden=[...hidden, theme];
          renderLegend();
        });
        (btn as HTMLElement).addEventListener('click', e=>e.stopPropagation());
      });

      // Editable labels
      (leg as HTMLElement).querySelectorAll('.leg-lbl').forEach(lbl=>{
        const theme=(lbl as HTMLElement).dataset.theme!;
        (lbl as HTMLElement).addEventListener('blur',()=>{
          state.legend.labels[theme]=(lbl as HTMLElement).textContent?.trim()||theme;
        });
        // Prevent drag when interacting with text
        (lbl as HTMLElement).addEventListener('mousedown',e=>e.stopPropagation());
        (lbl as HTMLElement).addEventListener('click',e=>e.stopPropagation());
      });
    }

    function bindLegendDrag(leg: HTMLElement) {
      let sx=0,sy=0,ox=0,oy=0;
      leg.addEventListener('mousedown', ev=>{
        const t=ev.target as HTMLElement;
        if (t.isContentEditable||t.tagName==='BUTTON') return;
        ev.stopPropagation();
        sx=ev.clientX; sy=ev.clientY; ox=state.legend.x; oy=state.legend.y;
        function mv(e: MouseEvent) {
          state.legend.x=Math.round(ox+(e.clientX-sx)/zoom);
          state.legend.y=Math.round(oy+(e.clientY-sy)/zoom);
          leg.style.left=state.legend.x+'px';
          leg.style.top=state.legend.y+'px';
        }
        function up(){ document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); }
        document.addEventListener('mousemove',mv);
        document.addEventListener('mouseup',up);
      });
    }

    // ── Hierarchy text → flow ──────────────────────────────────────────────
    function showHierarchyModal() {
      const overlay=document.createElement('div');
      overlay.className='pfb-overlay';
      document.body.appendChild(overlay);

      const panel=document.createElement('div');
      panel.className='pfb-panel';
      panel.style.maxWidth='520px';
      panel.innerHTML=`
        <h3>Build from Hierarchy</h3>
        <p>Type your hierarchy below. Indent child items with 2 spaces or a tab. Each line becomes a box.</p>
        <textarea id="pfb-hier-text" rows="10" placeholder="Start\n  Step A\n    Sub-step 1\n    Sub-step 2\n  Step B\n  Step C\nEnd"></textarea>
        <div style="margin:8px 0 4px;font-size:11px;color:#888">
          Tip: Use — or * at the start of a line for bullets (stripped automatically).<br>
          Each indentation level picks a different colour theme.
        </div>
        <div class="pfb-btn-row">
          <button class="pfb-btn-primary" id="pfb-hier-build">Build Flow →</button>
          <button class="pfb-cancel" id="pfb-hier-cancel">Cancel</button>
        </div>`;
      document.body.appendChild(panel);

      const close=()=>{ panel.remove(); overlay.remove(); };
      overlay.addEventListener('click', close);
      (panel.querySelector('#pfb-hier-cancel') as HTMLButtonElement).onclick=close;
      (panel.querySelector('#pfb-hier-build') as HTMLButtonElement).onclick=()=>{
        const text=(panel.querySelector('#pfb-hier-text') as HTMLTextAreaElement).value;
        if (text.trim()) { buildFromHierarchy(text); close(); }
      };
      setTimeout(()=>(panel.querySelector('#pfb-hier-text') as HTMLTextAreaElement).focus(), 50);
    }

    function buildFromHierarchy(text: string) {
      const lines=text.split('\n').filter(l=>l.trimEnd().length>0);
      if (!lines.length) return;

      // Detect indent unit from first indented line
      let unit=2;
      for (const l of lines) {
        if (l[0]==='\t') { unit=1; break; }
        const sp=l.match(/^( +)/)?.[1]?.length||0;
        if (sp>0) { unit=sp; break; }
      }

      const LEVEL_THEMES=['start','blue','green','grey','amber','purple','red'];
      const created: {id:string; level:number}[]=[];

      lines.forEach(raw=>{
        const expanded=raw.replace(/\t/g,' '.repeat(unit));
        const sp=expanded.match(/^( *)/)?.[1]?.length||0;
        const level=Math.floor(sp/unit);
        const title=expanded.trim().replace(/^[-*•]\s*/,'') || 'Step';
        const theme=LEVEL_THEMES[Math.min(level,LEVEL_THEMES.length-1)];
        const n=makeNode({title, theme});
        created.push({id:n.id, level});
      });

      // Connect each node to its nearest ancestor (level-1)
      for (let i=1;i<created.length;i++) {
        const lvl=created[i].level;
        for (let j=i-1;j>=0;j--) {
          if (created[j].level===lvl-1) {
            state.edges.push({
              id:'e'+edgeId++, from:created[j].id, to:created[i].id,
              fromSide:null, toSide:null, label:''
            });
            break;
          }
          // If we pass a node at same or lower level, stop
          if (created[j].level<lvl-1) break;
        }
      }

      sel=null;
      autoLayout();
    }

    // ── Auto layout ────────────────────────────────────────────────────────
    function autoLayout() {
      const dir=state.dir, wrap=+state.wrap;
      const ind: Record<string,number>={}, out: Record<string,string[]>={};
      state.nodes.forEach(n=>{ ind[n.id]=0; out[n.id]=[]; });
      state.edges.forEach(e=>{ if(ind[e.to]!=null){ind[e.to]++; out[e.from]?.push(e.to);} });

      const depth: Record<string,number>={};
      const roots=state.nodes.filter(n=>ind[n.id]===0).map(n=>n.id);
      roots.forEach(r=>depth[r]=0);
      const queue=[...roots], indc={...ind};
      let guard=0;
      while(queue.length&&guard++<5000){
        const id=queue.shift()!;
        (out[id]||[]).forEach(t=>{
          depth[t]=Math.max(depth[t]??0,(depth[id]??0)+1);
          if(--indc[t]===0) queue.push(t);
        });
      }
      state.nodes.forEach(n=>{ if(depth[n.id]==null) depth[n.id]=0; });

      const levels: Record<number,Node[]>={};
      state.nodes.forEach(n=>(levels[depth[n.id]]=levels[depth[n.id]]||[]).push(n));

      const colW=250, rowH=130, padX=60, padY=60, gapMain=70;
      const keys=Object.keys(levels).map(Number).sort((a,b)=>a-b);
      let mainPos=padY;
      keys.forEach(lk=>{
        const grp=levels[lk];
        let maxMain=0;
        grp.forEach((n,i)=>{
          if(dir==='TB'){ n.x=padX+i*colW; n.y=mainPos; maxMain=Math.max(maxMain,n.h||74); }
          else           { n.y=padY+i*rowH; n.x=mainPos; maxMain=Math.max(maxMain,n.w); }
        });
        mainPos+=maxMain+(dir==='TB'?gapMain:gapMain+30);
      });

      applyChainWrap(dir,wrap);
      state.edges.forEach(e=>{ e.fromSide=null; e.toSide=null; });
      render(); fit();
    }

    function applyChainWrap(dir: string, wrap: number) {
      if (!wrap) return;
      const outMap: Record<string,string[]>={}, inMap: Record<string,string[]>={};
      state.nodes.forEach(n=>{ outMap[n.id]=[]; inMap[n.id]=[]; });
      state.edges.forEach(e=>{ outMap[e.from]?.push(e.to); inMap[e.to]?.push(e.from); });
      const isLinear=state.nodes.every(n=>outMap[n.id].length<=1&&inMap[n.id].length<=1)&&state.edges.length>0;
      if (!isLinear) return;
      const start=state.nodes.find(n=>inMap[n.id].length===0)||state.nodes[0];
      const order: Node[]=[]; let cur: string|undefined=start.id; let g=0;
      while(cur&&g++<1000){ const nd=state.nodes.find(n=>n.id===cur); if(!nd) break; order.push(nd); cur=outMap[cur][0]; }
      const colWw=250,rowHh=130,padX2=60,padY2=60;
      order.forEach((n,i)=>{
        const band=Math.floor(i/wrap), idx=i%wrap;
        const pos=band%2===0?idx:wrap-1-idx;
        if(dir==='TB'){ n.x=padX2+pos*colWw; n.y=padY2+band*rowHh; }
        else           { n.x=padX2+band*colWw*1.2; n.y=padY2+pos*rowHh; }
      });
    }

    // ── Zoom / fit ─────────────────────────────────────────────────────────
    function applyZoom() {
      canvas.style.transform=`scale(${zoom})`;
      (document.getElementById('zi') as HTMLElement).textContent=Math.round(zoom*100)+'%';
    }
    function fit() {
      if (!state.nodes.length) return;
      let minx=1e9,miny=1e9,maxx=0,maxy=0;
      state.nodes.forEach(n=>{ minx=Math.min(minx,n.x); miny=Math.min(miny,n.y); maxx=Math.max(maxx,n.x+n.w); maxy=Math.max(maxy,n.y+n.h); });
      const pad=60;
      zoom=Math.min(1,(cw.clientWidth-40)/(maxx-minx+pad),(cw.clientHeight-40)/(maxy-miny+pad));
      zoom=Math.max(.25,zoom); applyZoom();
      cw.scrollTo({left:(minx-30)*zoom, top:(miny-30)*zoom});
    }

    // ── PNG export ─────────────────────────────────────────────────────────
    function exportPNG() {
      if (!state.nodes.length) { alert('Nothing to export.'); return; }
      let minx=1e9,miny=1e9,maxx=0,maxy=0;
      state.nodes.forEach(n=>{ minx=Math.min(minx,n.x); miny=Math.min(miny,n.y); maxx=Math.max(maxx,n.x+n.w); maxy=Math.max(maxy,n.y+n.h); });
      const pad=40, W=maxx-minx+pad*2, H=maxy-miny+pad*2;
      const c=document.createElement('canvas'); c.width=W*2; c.height=H*2;
      const x=c.getContext('2d')!; x.scale(2,2); x.fillStyle='#ffffff'; x.fillRect(0,0,W,H);
      x.translate(-minx+pad,-miny+pad);
      // Edges
      state.edges.forEach(e=>{
        const a=state.nodes.find(n=>n.id===e.from), b=state.nodes.find(n=>n.id===e.to);
        if(!a||!b) return;
        let s=e.fromSide,t=e.toSide;
        if(!s||!t){const ss=autoSides(a,b);s=ss[0];t=ss[1];}
        const p1=port(a,s!),p2=port(b,t!),e1=stub(p1,s!,22),e2=stub(p2,t!,22);
        const col=e.color||'#5a6159';
        x.strokeStyle=col; x.lineWidth=e.style==='thick'?4:2;
        if(e.style==='dashed') x.setLineDash([8,4]);
        else if(e.style==='dotted') x.setLineDash([2,4]);
        else x.setLineDash([]);
        x.beginPath(); x.moveTo(p1.x,p1.y);
        if(s==='b'||s==='t'){const my=(e1.y+e2.y)/2;x.lineTo(e1.x,e1.y);x.lineTo(e1.x,my);x.lineTo(e2.x,my);x.lineTo(e2.x,e2.y);}
        else{const mx=(e1.x+e2.x)/2;x.lineTo(e1.x,e1.y);x.lineTo(mx,e1.y);x.lineTo(mx,e2.y);x.lineTo(e2.x,e2.y);}
        x.lineTo(p2.x,p2.y); x.stroke(); x.setLineDash([]);
        const ang=Math.atan2(p2.y-e2.y,p2.x-e2.x);
        x.beginPath(); x.moveTo(p2.x,p2.y);
        x.lineTo(p2.x-8*Math.cos(ang-.4),p2.y-8*Math.sin(ang-.4));
        x.lineTo(p2.x-8*Math.cos(ang+.4),p2.y-8*Math.sin(ang+.4));
        x.closePath(); x.fillStyle=col; x.fill();
        if(e.label){
          const m=midOf(p1,p2); const tw=e.label.length*6.6+12;
          x.fillStyle='#fff'; x.fillRect(m.x-tw/2,m.y-9,tw,18);
          x.strokeStyle='#d9ddd6'; x.lineWidth=1; x.strokeRect(m.x-tw/2,m.y-9,tw,18);
          x.fillStyle='#3a403a'; x.font='11.5px sans-serif'; x.textAlign='center'; x.fillText(e.label,m.x,m.y+4);
        }
      });
      // Nodes
      const fills: Record<string,string>={start:'#0C2721',blue:'#dbe9f8',green:'#d8efe2',grey:'#eceae3',amber:'#f7eccf',purple:'#e2e0f5',red:'#f8e2dd'};
      const strokes: Record<string,string>={start:'#0C2721',blue:'#7aa9d6',green:'#7cc4a0',grey:'#c2c0b6',amber:'#d8b65e',purple:'#9b96d6',red:'#d69a8c'};
      const inks: Record<string,string>={start:'#fff',blue:'#1d4e79',green:'#1f6b4a',grey:'#4a4a44',amber:'#8a6a14',purple:'#403a86',red:'#9a3e2c'};
      state.nodes.forEach(n=>{
        const r=n.shape==='pill'?n.h/2:12;
        rr(x,n.x,n.y,n.w,n.h,r); x.fillStyle=fills[n.theme]||fills.blue; x.fill();
        x.lineWidth=2; x.strokeStyle=n.border||strokes[n.theme]||strokes.blue; x.stroke();
        x.fillStyle=inks[n.theme]||inks.blue; x.textAlign='center';
        x.font='600 13.5px '+(n.font||'sans-serif');
        const tl=wrapText(x,n.title,n.x+n.w/2,n.y+(n.sub?24:n.h/2+5),n.w-24,16);
        if(n.sub){x.font='11.5px '+(n.font||'sans-serif');wrapText(x,n.sub,n.x+n.w/2,n.y+24+tl*16+4,n.w-24,15);}
        if(n.badge){x.font='17px sans-serif';x.textAlign='center';x.fillText(n.badge,n.x+n.w-2,n.y+6);}
      });
      c.toBlob(b=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(b!); a.download='process-flow.png'; a.click(); });
    }
    function rr(c: CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
      c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();
    }
    function wrapText(c: CanvasRenderingContext2D,t:string,x:number,y:number,maxw:number,lh:number){
      let yy=y,count=0;
      t.split('\n').forEach(para=>{
        const words=para.split(' '); let line='';
        words.forEach(w=>{const test=line+w+' ';if(c.measureText(test).width>maxw&&line){c.fillText(line.trim(),x,yy);line=w+' ';yy+=lh;count++;}else line=test;});
        c.fillText(line.trim(),x,yy);yy+=lh;count++;
      });
      return count;
    }

    // ── Toolbar wiring ─────────────────────────────────────────────────────
    (document.getElementById('zoomIn') as HTMLButtonElement).onclick =()=>{ zoom=Math.min(2,zoom+.1); applyZoom(); };
    (document.getElementById('zoomOut') as HTMLButtonElement).onclick=()=>{ zoom=Math.max(.2,zoom-.1); applyZoom(); };
    (document.getElementById('fit') as HTMLButtonElement).onclick=fit;
    (document.getElementById('autoLayout') as HTMLButtonElement).onclick=autoLayout;

    // ── FIX: place new node at centre of visible canvas area ───────────────
    (document.getElementById('addNode') as HTMLButtonElement).onclick=()=>{
      const rect=cw.getBoundingClientRect();
      const cx=Math.max(20, Math.round((cw.scrollLeft+rect.width/2)/zoom-105));
      const cy=Math.max(20, Math.round((cw.scrollTop+rect.height/2)/zoom-37));
      // Small stagger so multiple clicks don't stack exactly
      const stagger=(state.nodes.length%4)*40-60;
      const n=makeNode({x:cx+stagger, y:cy+stagger});
      sel=n.id;
      render();
      // Scroll to show the new node
      cw.scrollTo({left:Math.max(0,(n.x*zoom)-rect.width/2+105), top:Math.max(0,(n.y*zoom)-rect.height/2+37), behavior:'smooth'});
    };

    (document.getElementById('hierarchyBtn') as HTMLButtonElement).onclick=showHierarchyModal;

    (document.getElementById('legendBtn') as HTMLButtonElement).onclick=()=>{
      state.legend.visible=!state.legend.visible;
      (document.getElementById('legendBtn') as HTMLButtonElement).style.background=
        state.legend.visible ? 'rgba(102,204,0,.35)' : '';
      renderLegend();
    };

    // Canvas background colour
    const bgPicker=document.getElementById('canvasBgPicker') as HTMLInputElement;
    bgPicker.oninput=e=>{
      state.canvasBg=(e.target as HTMLInputElement).value;
      cw.style.background=state.canvasBg;
    };

    (document.getElementById('dir') as HTMLSelectElement).onchange=e=>{
      state.dir=(e.target as HTMLSelectElement).value;
    };
    (document.getElementById('wrap') as HTMLSelectElement).onchange=e=>{
      const v=(e.target as HTMLSelectElement).value;
      const ci=document.getElementById('wrapCustom') as HTMLInputElement;
      if(v==='custom'){ci.style.display='inline-block';state.wrap=+ci.value||0;}
      else{ci.style.display='none';state.wrap=+v;}
    };
    (document.getElementById('wrapCustom') as HTMLInputElement).oninput=e=>{
      state.wrap=+(e.target as HTMLInputElement).value||0;
    };
    (document.getElementById('clear') as HTMLButtonElement).onclick=()=>{
      if(confirm('Clear the whole canvas?')){
        [...canvas.querySelectorAll('.node')].forEach(el=>el.remove());
        document.getElementById('pfb-legend')?.remove();
        state={nodes:[],edges:[],dir:state.dir,wrap:state.wrap,legend:defaultLegend(),canvasBg:state.canvasBg};
        sel=null; idc=1; edgeId=1; render();
      }
    };
    (document.getElementById('png') as HTMLButtonElement).onclick=exportPNG;

    // ── Named Save / Load ──────────────────────────────────────────────────
    const PFB_PREFIX='pfb_flow_';
    function stateToSave(): AppState {
      // Ensure legend is always in saved state
      return {...state, legend: state.legend||defaultLegend()};
    }
    function loadState(loaded: AppState) {
      [...canvas.querySelectorAll('.node')].forEach(el=>el.remove());
      document.getElementById('pfb-legend')?.remove();
      const leg=loaded.legend||defaultLegend();
      if (!leg.hidden) leg.hidden=[];
      state={...loaded, legend: leg, canvasBg: loaded.canvasBg||'#ffffff'};
      idc=state.nodes.length?Math.max(...state.nodes.map(n=>+n.id.replace('n','')))+1:1;
      edgeId=state.edges.length?Math.max(...state.edges.map(e=>+e.id.replace('e','')))+1:1;
      // Apply canvas bg
      cw.style.background=state.canvasBg;
      (document.getElementById('canvasBgPicker') as HTMLInputElement).value=state.canvasBg;
      sel=null; render(); fit();
    }

    (document.getElementById('saveLocal') as HTMLButtonElement).onclick=()=>{
      const name=window.prompt('Name this flow:');
      if (!name?.trim()) return;
      localStorage.setItem(PFB_PREFIX+name.trim(), JSON.stringify(stateToSave()));
      const btn=document.getElementById('saveLocal') as HTMLButtonElement;
      const orig=btn.textContent!; btn.textContent='✓ Saved!';
      setTimeout(()=>btn.textContent=orig, 1500);
    };

    (document.getElementById('loadLocal') as HTMLButtonElement).onclick=()=>{
      const keys=Object.keys(localStorage).filter(k=>k.startsWith(PFB_PREFIX));
      const names=keys.map(k=>k.slice(PFB_PREFIX.length));
      const overlay=document.createElement('div'); overlay.className='pfb-overlay'; document.body.appendChild(overlay);
      const panel=document.createElement('div'); panel.className='pfb-panel'; document.body.appendChild(panel);
      panel.innerHTML=`<h3>Load Flow</h3>
        <div id="pfb-list">${names.length
          ? names.map(n=>`<div class="pfb-flow-item" data-name="${n}"><span>${n}</span><button class="pfb-del" data-del="${n}">Delete</button></div>`).join('')
          : '<p class="pfb-empty-msg">No saved flows yet.</p>'}</div>
        <div class="pfb-btn-row"><button class="pfb-cancel" id="pfb-close">Cancel</button></div>`;
      const close=()=>{ panel.remove(); overlay.remove(); };
      overlay.addEventListener('click',close);
      (panel.querySelector('#pfb-close') as HTMLButtonElement).onclick=close;
      panel.querySelectorAll('.pfb-flow-item').forEach(item=>{
        (item as HTMLElement).addEventListener('click',e=>{
          const btn=(e.target as HTMLElement).closest('[data-del]');
          if (btn) {
            const name=(btn as HTMLElement).dataset.del!;
            if(confirm(`Delete "${name}"?`)){ localStorage.removeItem(PFB_PREFIX+name); (item as HTMLElement).remove(); }
            return;
          }
          const saved=localStorage.getItem(PFB_PREFIX+(item as HTMLElement).dataset.name!);
          if(saved){ try{ loadState(JSON.parse(saved)); close(); }catch{ alert('Could not load.'); } }
        });
      });
    };

    (document.getElementById('downloadJson') as HTMLButtonElement).onclick=()=>{
      const blob=new Blob([JSON.stringify(stateToSave(),null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='process-flow.json'; a.click();
    };

    (document.getElementById('importJson') as HTMLButtonElement).onclick=()=>{
      const inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
      inp.onchange=()=>{
        const f=inp.files![0]; const r=new FileReader();
        r.onload=()=>{ try{ loadState(JSON.parse(r.result as string)); }catch{ alert('Could not read file.'); } };
        r.readAsText(f);
      };
      inp.click();
    };

    // ── Seed demo ──────────────────────────────────────────────────────────
    function seed() {
      makeNode({id:'n1',title:'What do you need?',theme:'start',shape:'pill',x:430,y:40,w:230});
      makeNode({id:'n2',title:'Goods / cat ID items',sub:'Material to a PO',theme:'blue',x:160,y:180,w:230});
      makeNode({id:'n3',title:'Services',sub:'With start / end dates',theme:'green',x:600,y:180,w:230});
      makeNode({id:'n4',title:'Create Material Request (MR)',sub:'All cat ID flows through an MR',theme:'blue',x:150,y:330,w:250});
      makeNode({id:'n5',title:'Create Contract Req (CR)',sub:'In AS9 CMM',theme:'green',x:590,y:330,w:230});
      makeNode({id:'n6',title:'PO created from the MR',theme:'grey',x:165,y:470,w:210});
      makeNode({id:'n7',title:'Contract Order (CO) created',theme:'grey',x:590,y:470,w:230});
      idc=8;
      state.edges=[
        {id:'e1',from:'n1',to:'n2',fromSide:'b',toSide:'t',label:''},
        {id:'e2',from:'n1',to:'n3',fromSide:'b',toSide:'t',label:''},
        {id:'e3',from:'n2',to:'n4',fromSide:'b',toSide:'t',label:''},
        {id:'e4',from:'n3',to:'n5',fromSide:'b',toSide:'t',label:''},
        {id:'e5',from:'n4',to:'n6',fromSide:'b',toSide:'t',label:''},
        {id:'e6',from:'n5',to:'n7',fromSide:'b',toSide:'t',label:''},
      ];
      edgeId=7;
    }

    seed(); render(); applyZoom();
    // Apply initial canvas background
    cw.style.background = state.canvasBg;

    // ── Cleanup ────────────────────────────────────────────────────────────
    return ()=>{
      initRef.current=false;
      styleEl.remove();
      document.removeEventListener('keydown',keyHandler);
      cw.removeEventListener('mousedown',cwClick);
      [...canvas.querySelectorAll('.node')].forEach(el=>el.remove());
      svg.innerHTML='';
      document.querySelectorAll('.pfb-overlay,.pfb-panel,#pfb-legend').forEach(el=>el.remove());
    };
  }, []);

  return <div id="pfb-root" dangerouslySetInnerHTML={{__html: HTML}} />;
}
