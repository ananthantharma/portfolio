#!/usr/bin/env node
'use strict';
const fs = require('fs');

function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  if (!inPath || !outPath) { console.error('usage: script <input.json> <output.json>'); process.exit(1); }
  const data = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  const fileNodes = data.fileNodes || [];
  const importEdges = data.importEdges || [];
  const allEdges = data.allEdges || [];

  const idToNode = new Map();
  for (const n of fileNodes) idToNode.set(n.id, n);

  const paths = fileNodes.map(n => n.filePath || '').filter(Boolean);

  // Common prefix (directory-segment based)
  function commonDirPrefix(list) {
    if (!list.length) return '';
    const split = list.map(p => p.split('/'));
    let prefix = [];
    for (let i = 0; i < split[0].length - 1; i++) {
      const seg = split[0][i];
      if (split.every(s => s.length - 1 > i && s[i] === seg)) prefix.push(seg);
      else break;
    }
    return prefix.length ? prefix.join('/') + '/' : '';
  }
  const prefix = commonDirPrefix(paths);

  function groupOf(fp) {
    let rest = fp;
    if (rest.startsWith('src/')) rest = rest.slice(4);
    else if (prefix && rest.startsWith(prefix)) rest = rest.slice(prefix.length);
    const parts = rest.split('/');
    if (parts.length === 1) return '(root)';
    const top = parts[0];
    // Go one level deeper for large container dirs
    if ((top === 'app' || top === 'components' || top === 'pages') && parts.length > 2) {
      if (top === 'app' && parts[1] === 'api') return 'app/api';
      if (top === 'pages' && parts[1] === 'api') return 'pages/api';
      if (top === 'pages' && parts[1] === 'admin') return 'pages/admin';
      if (top === 'pages' && parts[1] === 'supplier-risk') return 'pages/supplier-risk';
      return top + '/' + parts[1];
    }
    return top;
  }

  // A. Directory grouping
  const directoryGroups = {};
  for (const n of fileNodes) {
    const g = groupOf(n.filePath || n.id);
    (directoryGroups[g] = directoryGroups[g] || []).push(n.id);
  }

  // B. Node type grouping
  const nodeTypeGroups = {};
  for (const n of fileNodes) {
    const t = n.type || 'file';
    (nodeTypeGroups[t] = nodeTypeGroups[t] || []).push(n.id);
  }

  // C. Adjacency (imports only)
  const fanOut = {}, fanIn = {};
  for (const n of fileNodes) { fanOut[n.id] = 0; fanIn[n.id] = 0; }
  const importSet = importEdges.filter(e => idToNode.has(e.source) && idToNode.has(e.target));
  for (const e of importSet) { fanOut[e.source]++; fanIn[e.target]++; }

  const groupById = {};
  for (const n of fileNodes) groupById[n.id] = groupOf(n.filePath || n.id);

  // E. Inter-group import frequency
  const interMap = {};
  for (const e of importSet) {
    const a = groupById[e.source], b = groupById[e.target];
    if (a === b) continue;
    const k = a + ' -> ' + b;
    interMap[k] = (interMap[k] || 0) + 1;
  }
  const interGroupImports = Object.entries(interMap)
    .map(([k, count]) => ({ from: k.split(' -> ')[0], to: k.split(' -> ')[1], count }))
    .sort((x, y) => y.count - x.count);

  // F. Intra-group density
  const intraGroupDensity = {};
  const groupTotalEdges = {};
  const groupInternalEdges = {};
  for (const g of Object.keys(directoryGroups)) { groupTotalEdges[g] = 0; groupInternalEdges[g] = 0; }
  for (const e of importSet) {
    const a = groupById[e.source], b = groupById[e.target];
    if (a === b) { groupInternalEdges[a]++; groupTotalEdges[a]++; }
    else { groupTotalEdges[a]++; groupTotalEdges[b]++; }
  }
  for (const g of Object.keys(directoryGroups)) {
    const tot = groupTotalEdges[g];
    intraGroupDensity[g] = {
      internalEdges: groupInternalEdges[g],
      totalEdges: tot,
      density: tot ? +(groupInternalEdges[g] / tot).toFixed(3) : 0
    };
  }

  // D. Cross-category edges
  const ccMap = {};
  for (const e of allEdges) {
    const s = idToNode.get(e.source), t = idToNode.get(e.target);
    if (!s || !t) continue;
    if ((s.type || 'file') === (t.type || 'file')) continue;
    const k = (s.type || 'file') + '|' + (t.type || 'file') + '|' + (e.type || 'rel');
    ccMap[k] = (ccMap[k] || 0) + 1;
  }
  const crossCategoryEdges = Object.entries(ccMap).map(([k, count]) => {
    const [fromType, toType, edgeType] = k.split('|');
    return { fromType, toType, edgeType, count };
  }).sort((a, b) => b.count - a.count);

  // G. Directory pattern matching
  const dirPatterns = [
    [/^(routes|api|controllers|endpoints|handlers|controller|routers|blueprints|serializers)$/i, 'api'],
    [/^(services|core|lib|domain|logic|signals|composables|mailers|jobs|channels)$/i, 'service'],
    [/^(models|db|data|persistence|repository|entities|entity|migrations)$/i, 'data'],
    [/^(components|views|pages|ui|layouts|screens)$/i, 'ui'],
    [/^(middleware|plugins|interceptors|guards)$/i, 'middleware'],
    [/^(utils|helpers|common|shared|tools|templatetags|pkg)$/i, 'utility'],
    [/^(config|constants|env|settings|management|commands)$/i, 'config'],
    [/^(__tests__|test|tests|spec|specs)$/i, 'test'],
    [/^(types|interfaces|schemas|contracts|dtos|dto|request|response)$/i, 'types'],
    [/^hooks$/i, 'hooks'],
    [/^(store|state|reducers|actions|slices)$/i, 'state'],
    [/^(assets|static|public|images|img)$/i, 'assets'],
    [/^(cmd|bin)$/i, 'entry'],
    [/^internal$/i, 'service'],
    [/^(docs|documentation|wiki)$/i, 'documentation'],
    [/^(deploy|deployment|infra|infrastructure|docker|k8s|kubernetes|helm|charts|terraform|tf)$/i, 'infrastructure'],
    [/^(\.github|\.gitlab|\.circleci)$/i, 'ci-cd'],
    [/^(sql|database)$/i, 'data'],
    [/^scripts$/i, 'infrastructure']
  ];
  const patternMatches = {};
  for (const g of Object.keys(directoryGroups)) {
    for (const [re, label] of dirPatterns) {
      if (re.test(g)) { patternMatches[g] = label; break; }
    }
  }

  // File-level pattern matches
  const filePatternMatches = {};
  function filePattern(fp, name) {
    if (/\.(test|spec)\.[jt]sx?$/.test(fp) || /^test_.*\.py$/.test(name) || /_test\.go$/.test(fp) || /Test\.java$/.test(name) || /_spec\.rb$/.test(name) || /Tests\.cs$/.test(name)) return 'test';
    if (/\.d\.ts$/.test(fp)) return 'types';
    if (/\.(graphql|gql|proto)$/.test(fp)) return 'types';
    if (/\.sql$/.test(fp)) return 'data';
    if (/\.(md|rst)$/.test(fp)) return 'documentation';
    if (/^(Dockerfile|docker-compose)/.test(name)) return 'infrastructure';
    if (/\.(tf|tfvars)$/.test(fp)) return 'infrastructure';
    if (/^Makefile$/.test(name)) return 'infrastructure';
    if (/(\.gitlab-ci\.yml|Jenkinsfile)$/.test(name) || /\.github\/workflows\//.test(fp)) return 'ci-cd';
    if (/^(package\.json|tsconfig.*\.json|.*\.toml|go\.mod|Gemfile|pom\.xml|build\.gradle|composer\.json|next\.config\.js|tailwind\.config\.js|vercel\.json|postcss\.config\.js|jest\.config\.js|\.eslintrc.*)$/.test(name)) return 'config';
    if (/^(index\.[jt]sx?|__init__\.py)$/.test(name)) return 'entry';
    return null;
  }
  for (const n of fileNodes) {
    const p = filePattern(n.filePath || '', n.name || '');
    if (p) filePatternMatches[n.id] = p;
  }

  // H. Deployment topology
  const infraFiles = [];
  let hasDockerfile = false, hasCompose = false, hasK8s = false, hasTerraform = false, hasCI = false;
  for (const n of fileNodes) {
    const fp = n.filePath || '', nm = n.name || '';
    if (/^Dockerfile/.test(nm)) { hasDockerfile = true; infraFiles.push(fp); }
    if (/^docker-compose/.test(nm)) { hasCompose = true; infraFiles.push(fp); }
    if (/\.(ya?ml)$/.test(fp) && /(k8s|kubernetes|helm|deployment|manifest)/i.test(fp)) { hasK8s = true; infraFiles.push(fp); }
    if (/\.tf$/.test(fp)) { hasTerraform = true; infraFiles.push(fp); }
    if (/\.github\/workflows\//.test(fp) || /(\.gitlab-ci\.yml|Jenkinsfile)$/.test(nm)) { hasCI = true; infraFiles.push(fp); }
    if (/^vercel\.json$/.test(nm)) { infraFiles.push(fp); }
  }

  // I. Data pipeline detection
  const schemaFiles = [], migrationFiles = [], dataModelFiles = [], apiHandlerFiles = [];
  for (const n of fileNodes) {
    const fp = n.filePath || '';
    const tags = (n.tags || []).join(' ');
    if (/\.(sql|graphql|gql|proto|prisma)$/.test(fp)) schemaFiles.push(fp);
    if (/migrations?\//.test(fp)) migrationFiles.push(fp);
    if (/\/models\//.test(fp) || /schema/i.test(tags) && /model/i.test(tags)) dataModelFiles.push(fp);
    if (/\/api\//.test(fp) || /route\.ts$/.test(fp) || /api-handler/.test(tags)) apiHandlerFiles.push(fp);
  }

  // J. Documentation coverage
  const groupsWithDocs = new Set();
  for (const n of fileNodes) {
    if (/\.(md|rst)$/.test(n.filePath || '')) groupsWithDocs.add(groupById[n.id]);
  }
  const totalGroups = Object.keys(directoryGroups).length;
  const undocumentedGroups = Object.keys(directoryGroups).filter(g => !groupsWithDocs.has(g));

  // K. Dependency direction
  const pairAgg = {};
  for (const ig of interGroupImports) {
    const key = [ig.from, ig.to].sort().join('||');
    pairAgg[key] = pairAgg[key] || {};
    pairAgg[key][ig.from + '>' + ig.to] = ig.count;
  }
  const dependencyDirection = [];
  for (const ig of interGroupImports) {
    const rev = interMap[ig.to + ' -> ' + ig.from] || 0;
    if (ig.count > rev) dependencyDirection.push({ dependent: ig.from, dependsOn: ig.to, count: ig.count, reverse: rev });
  }
  // dedupe
  const seen = new Set();
  const depDir = dependencyDirection.filter(d => {
    const k = d.dependent + '>' + d.dependsOn;
    if (seen.has(k)) return false; seen.add(k); return true;
  });

  // Stats
  const filesPerGroup = {};
  for (const [g, arr] of Object.entries(directoryGroups)) filesPerGroup[g] = arr.length;
  const nodeTypeCounts = {};
  for (const [t, arr] of Object.entries(nodeTypeGroups)) nodeTypeCounts[t] = arr.length;

  const topFanIn = Object.entries(fanIn).sort((a, b) => b[1] - a[1]).slice(0, 30);
  const topFanOut = Object.entries(fanOut).sort((a, b) => b[1] - a[1]).slice(0, 30);

  const out = {
    scriptCompleted: true,
    commonPrefix: prefix,
    directoryGroups,
    nodeTypeGroups,
    crossCategoryEdges,
    interGroupImports,
    intraGroupDensity,
    patternMatches,
    filePatternMatches,
    deploymentTopology: { hasDockerfile, hasCompose, hasK8s, hasTerraform, hasCI, infraFiles: [...new Set(infraFiles)] },
    dataPipeline: {
      schemaFiles: [...new Set(schemaFiles)],
      migrationFiles: [...new Set(migrationFiles)],
      dataModelFiles: [...new Set(dataModelFiles)].slice(0, 60),
      apiHandlerFiles: [...new Set(apiHandlerFiles)].slice(0, 120)
    },
    docCoverage: {
      groupsWithDocs: groupsWithDocs.size,
      totalGroups,
      coverageRatio: totalGroups ? +(groupsWithDocs.size / totalGroups).toFixed(2) : 0,
      undocumentedGroups
    },
    dependencyDirection: depDir,
    fileStats: {
      totalFileNodes: fileNodes.length,
      filesPerGroup,
      nodeTypeCounts
    },
    fileFanIn: Object.fromEntries(topFanIn),
    fileFanOut: Object.fromEntries(topFanOut)
  };
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('done. groups=' + totalGroups + ' files=' + fileNodes.length);
}
try { main(); } catch (e) { console.error(e && e.stack || String(e)); process.exit(1); }
