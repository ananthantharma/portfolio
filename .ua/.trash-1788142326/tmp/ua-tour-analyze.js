#!/usr/bin/env node
"use strict";
const fs = require("fs");

function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  if (!inPath || !outPath) {
    console.error("usage: ua-tour-analyze.js <input.json> <output.json>");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(inPath, "utf8"));
  const nodes = data.nodes || [];
  const edges = data.edges || [];
  const layers = data.layers || [];

  const nodeById = new Map();
  for (const n of nodes) nodeById.set(n.id, n);

  const fanIn = new Map();
  const fanOut = new Map();
  for (const n of nodes) { fanIn.set(n.id, 0); fanOut.set(n.id, 0); }

  const importCallAdj = new Map(); // forward adjacency for imports+calls
  for (const n of nodes) importCallAdj.set(n.id, []);

  for (const e of edges) {
    if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue;
    fanOut.set(e.source, (fanOut.get(e.source) || 0) + 1);
    fanIn.set(e.target, (fanIn.get(e.target) || 0) + 1);
    if (e.type === "imports" || e.type === "calls") {
      importCallAdj.get(e.source).push(e.target);
    }
  }

  const nameOf = (id) => (nodeById.get(id) || {}).name || id;
  const summaryOf = (id) => (nodeById.get(id) || {}).summary || "";

  // A. Fan-in ranking
  const fanInRanking = [...fanIn.entries()]
    .map(([id, v]) => ({ id, fanIn: v, name: nameOf(id) }))
    .sort((a, b) => b.fanIn - a.fanIn)
    .slice(0, 20);

  // B. Fan-out ranking
  const fanOutRanking = [...fanOut.entries()]
    .map(([id, v]) => ({ id, fanOut: v, name: nameOf(id) }))
    .sort((a, b) => b.fanOut - a.fanOut)
    .slice(0, 20);

  // C. Entry point candidates
  const codeEntryNames = new Set([
    "index.ts","index.js","index.tsx","index.jsx","main.ts","main.js","app.ts","app.js",
    "app.tsx","_app.tsx","_app.js","server.ts","server.js","mod.rs","main.go","main.py",
    "main.rs","manage.py","app.py","wsgi.py","asgi.py","run.py","__main__.py",
    "Application.java","Main.java","Program.cs","config.ru","index.php","App.swift",
    "Application.kt","main.cpp","main.c","layout.tsx","layout.ts",
  ]);
  const fanOutSorted = [...fanOut.values()].sort((a, b) => b - a);
  const fanOutP90 = fanOutSorted[Math.floor(fanOutSorted.length * 0.1)] || 0;
  const fanInSorted = [...fanIn.values()].sort((a, b) => a - b);
  const fanInP25 = fanInSorted[Math.floor(fanInSorted.length * 0.25)] || 0;

  const epScores = [];
  for (const n of nodes) {
    let score = 0;
    const fp = n.filePath || "";
    const depth = fp.split("/").length;
    if (n.type === "document") {
      if (/^readme\.md$/i.test(n.name) && depth === 1) score += 5;
      else if (/\.md$/i.test(n.name) && depth === 1) score += 2;
    } else {
      if (codeEntryNames.has(n.name)) score += 3;
      if (depth <= 2) score += 1;
      if ((fanOut.get(n.id) || 0) >= fanOutP90 && fanOutP90 > 0) score += 1;
      if ((fanIn.get(n.id) || 0) <= fanInP25) score += 1;
    }
    if (score > 0) epScores.push({ id: n.id, score, name: n.name, summary: summaryOf(n.id) });
  }
  epScores.sort((a, b) => b.score - a.score);
  const entryPointCandidates = epScores.slice(0, 8);

  // D. BFS from top code entry point
  const codeCandidates = epScores.filter((c) => (nodeById.get(c.id) || {}).type !== "document");
  // prefer _app.tsx / layout.tsx style bootstrap; else first
  let startNode = null;
  const preferredOrder = ["_app.tsx", "layout.tsx", "app.tsx", "index.tsx", "index.ts", "main.ts"];
  for (const pn of preferredOrder) {
    const hit = codeCandidates.find((c) => nameOf(c.id) === pn);
    if (hit) { startNode = hit.id; break; }
  }
  if (!startNode && codeCandidates.length) startNode = codeCandidates[0].id;
  if (!startNode && nodes.length) startNode = nodes[0].id;

  const order = [];
  const depthMap = {};
  if (startNode) {
    const q = [startNode];
    depthMap[startNode] = 0;
    while (q.length) {
      const cur = q.shift();
      order.push(cur);
      for (const nb of importCallAdj.get(cur) || []) {
        if (!(nb in depthMap)) {
          depthMap[nb] = depthMap[cur] + 1;
          q.push(nb);
        }
      }
    }
  }
  const byDepth = {};
  for (const [id, d] of Object.entries(depthMap)) {
    (byDepth[d] = byDepth[d] || []).push(id);
  }

  // E. Non-code file inventory
  const nonCodeFiles = { documentation: [], infrastructure: [], data: [], config: [] };
  for (const n of nodes) {
    const entry = { id: n.id, name: n.name, type: n.type, summary: summaryOf(n.id) };
    if (n.type === "document") nonCodeFiles.documentation.push(entry);
    else if (["service", "pipeline", "resource"].includes(n.type)) nonCodeFiles.infrastructure.push(entry);
    else if (["table", "schema", "endpoint"].includes(n.type)) nonCodeFiles.data.push(entry);
    else if (n.type === "config") nonCodeFiles.config.push(entry);
  }

  // F. Tightly coupled clusters
  const pairKey = (a, b) => (a < b ? a + "|||" + b : b + "|||" + a);
  const directed = new Set();
  for (const e of edges) {
    if (e.type === "imports" || e.type === "calls") directed.add(e.source + "|||" + e.target);
  }
  const clustersSeed = [];
  const seen = new Set();
  for (const e of edges) {
    if (!(e.type === "imports" || e.type === "calls")) continue;
    if (directed.has(e.target + "|||" + e.source)) {
      const k = pairKey(e.source, e.target);
      if (!seen.has(k)) { seen.add(k); clustersSeed.push([e.source, e.target]); }
    }
  }
  // adjacency for expansion (undirected imports+calls)
  const undAdj = new Map();
  for (const n of nodes) undAdj.set(n.id, new Set());
  for (const e of edges) {
    if (!(e.type === "imports" || e.type === "calls")) continue;
    if (!undAdj.has(e.source) || !undAdj.has(e.target)) continue;
    undAdj.get(e.source).add(e.target);
    undAdj.get(e.target).add(e.source);
  }
  const clusters = [];
  for (const seed of clustersSeed) {
    const cl = new Set(seed);
    let changed = true;
    while (changed && cl.size < 5) {
      changed = false;
      const candidates = new Map();
      for (const m of cl) {
        for (const nb of undAdj.get(m) || []) {
          if (cl.has(nb)) continue;
          candidates.set(nb, (candidates.get(nb) || 0) + 1);
        }
      }
      for (const [c, cnt] of candidates) {
        if (cnt >= 2 && cl.size < 5) { cl.add(c); changed = true; }
      }
    }
    let edgeCount = 0;
    const arr = [...cl];
    for (let i = 0; i < arr.length; i++)
      for (let j = 0; j < arr.length; j++)
        if (i !== j && directed.has(arr[i] + "|||" + arr[j])) edgeCount++;
    clusters.push({ nodes: arr, edgeCount });
  }
  clusters.sort((a, b) => b.edgeCount - a.edgeCount);
  const dedupClusters = [];
  const clusterSigs = new Set();
  for (const c of clusters) {
    const sig = [...c.nodes].sort().join("|");
    if (clusterSigs.has(sig)) continue;
    clusterSigs.add(sig);
    dedupClusters.push(c);
    if (dedupClusters.length >= 10) break;
  }

  // G. Layers
  const layerOut = {
    count: layers.length,
    list: layers.map((l) => ({ id: l.id, name: l.name, description: l.description || "" })),
  };

  // H. Node summary index
  const nodeSummaryIndex = {};
  for (const n of nodes) {
    nodeSummaryIndex[n.id] = { name: n.name, type: n.type, summary: summaryOf(n.id) };
  }

  const result = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking,
    fanOutRanking,
    bfsTraversal: { startNode, order, depthMap, byDepth },
    nonCodeFiles,
    clusters: dedupClusters,
    layers: layerOut,
    nodeSummaryIndex,
    totalNodes: nodes.length,
    totalEdges: edges.length,
  };
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.error("done: " + nodes.length + " nodes, " + edges.length + " edges, bfs reached " + order.length);
  process.exit(0);
}

try { main(); } catch (e) { console.error(e && e.stack || String(e)); process.exit(1); }
