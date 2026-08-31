'use strict';
const fs = require('fs');
const root = 'C:/Users/anant/OneDrive/Desktop/Coding - Gemini/My-Portfolio-Website-main';
const input = JSON.parse(fs.readFileSync(root + '/.ua/tmp/arch-input.json', 'utf8'));
const res = JSON.parse(fs.readFileSync(root + '/.ua/tmp/ua-arch-results.json', 'utf8'));

function layerFor(group) {
  if (group === 'app/api' || group === 'pages/api') return 'layer:api';
  if (group === 'lib') return 'layer:lib';
  if (group === 'models') return 'layer:data';
  if (group.startsWith('components') || group === 'hooks') return 'layer:ui';
  if (group === 'data' || group === 'images' || group === 'types' || group === 'public') return 'layer:static-data';
  if (group === '(root)' || group === 'scripts' || group === '.claude' || group === '.github') return 'layer:config';
  // remaining: pages, pages/admin, pages/supplier-risk, app/*  -> route entrypoints
  return 'layer:pages';
}

const meta = {
  'layer:pages': {
    name: 'Pages & Route Entrypoints',
    description: 'Next.js App Router and Pages Router page components (feature screens for finance, tasks, notes, anomaly, org charts, PDF autofill, e-signing, supplier risk) that compose feature components into routed views.'
  },
  'layer:api': {
    name: 'API & Route Handlers',
    description: 'Server-side request handlers under src/app/api and src/pages/api that authenticate via NextAuth, talk to MongoDB/Neon and external services (Gemini, OpenAI, Google Drive, HiveMQ), and back every feature.'
  },
  'layer:ui': {
    name: 'Feature UI Components',
    description: 'Client React components grouped by feature (Notes, Tasks, Finance, Anomaly, Organization, SupplierRisk, Invoices, ProcessFlow, Vault, Sections, Icon, Layout) plus shared hooks, forming the bulk of the interface.'
  },
  'layer:data': {
    name: 'Data Models',
    description: 'Mongoose schema definitions for all persisted entities (notes, tasks, invoices, signing documents, finance properties, prompts, org nodes), the high-fan-in persistence contract shared by API handlers and components.'
  },
  'layer:lib': {
    name: 'Core Library & Integrations',
    description: 'Foundational shared modules in src/lib — NextAuth config, dbConnect/mongodb/neon clients, Google Drive, Gemini and OpenAI wrappers, category constants — imported by nearly every API route and feature.'
  },
  'layer:static-data': {
    name: 'Static Data, Types & Assets',
    description: 'Resume/portfolio content data, TypeScript type declarations, and image/static assets consumed by the marketing Sections and other presentational components.'
  },
  'layer:config': {
    name: 'Build, Config & Tooling',
    description: 'Project configuration (next.config.js, tailwind, tsconfig, vercel.json, package.json), the standalone Express contact-form server.js, MongoDB seed/maintenance scripts, and CI/editor tooling files.'
  }
};

const layers = {};
for (const id of Object.keys(meta)) layers[id] = { id, name: meta[id].name, description: meta[id].description, nodeIds: [] };

function groupOf(fp) {
  let rest = fp;
  if (rest.startsWith('src/')) rest = rest.slice(4);
  const parts = rest.split('/');
  if (parts.length === 1) return '(root)';
  const top = parts[0];
  if ((top === 'app' || top === 'components' || top === 'pages') && parts.length > 2) {
    if (top === 'app' && parts[1] === 'api') return 'app/api';
    if (top === 'pages' && parts[1] === 'api') return 'pages/api';
    if (top === 'pages' && parts[1] === 'admin') return 'pages/admin';
    if (top === 'pages' && parts[1] === 'supplier-risk') return 'pages/supplier-risk';
    return top + '/' + parts[1];
  }
  return top;
}

let n = 0;
for (const node of input.fileNodes) {
  const g = groupOf(node.filePath || node.id);
  const L = layerFor(g);
  layers[L].nodeIds.push(node.id);
  n++;
}

const arr = Object.values(layers).filter(l => l.nodeIds.length > 0);
const sum = arr.reduce((s, l) => s + l.nodeIds.length, 0);
console.error('total file nodes:', n, 'assigned:', sum, 'layers:', arr.length);
for (const l of arr) console.error('  ', l.id, l.nodeIds.length);

fs.writeFileSync(root + '/.ua/intermediate/layers.json', JSON.stringify(arr, null, 2));
console.error('written to .ua/intermediate/layers.json');
