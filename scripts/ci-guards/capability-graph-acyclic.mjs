#!/usr/bin/env node
/**
 * CI guard: the cross-module capability graph (consumesFrom → providesToOthers)
 * must be acyclic. Cycles cause boot deadlocks in the capability-broker.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..', '..');

function findManifests() {
  const out = [];
  const walk = (d, depth = 0) => {
    if (depth > 4 || !existsSync(d)) return;
    let entries; try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name.startsWith('.')) continue;
      const full = join(d, ent.name);
      if (ent.isDirectory()) walk(full, depth + 1);
      else if (ent.name === 'module.manifest.json') out.push(full);
    }
  };
  for (const r of [join(REPO, 'modules'), join(REPO, 'platform')]) walk(r);
  return out;
}

const manifests = findManifests().map((p) => {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}).filter(Boolean);

const providers = new Map(); // capability -> moduleCode
for (const m of manifests) {
  for (const p of (m.providesToOthers ?? [])) providers.set(p.capability, m.moduleCode);
}

// Build edges: consumer → provider module
const edges = new Map(); // moduleCode -> Set(moduleCode)
for (const m of manifests) {
  const set = edges.get(m.moduleCode) ?? new Set();
  for (const c of (m.consumesFrom ?? [])) {
    const provider = providers.get(c.capability);
    if (provider && provider !== m.moduleCode) set.add(provider);
  }
  edges.set(m.moduleCode, set);
}

// DFS cycle detection
const WHITE = 0, GRAY = 1, BLACK = 2;
const color = new Map();
let cycle = null;
function dfs(node, stack) {
  if (color.get(node) === GRAY) {
    const i = stack.indexOf(node);
    cycle = stack.slice(i).concat(node);
    return true;
  }
  if (color.get(node) === BLACK) return false;
  color.set(node, GRAY);
  stack.push(node);
  for (const next of (edges.get(node) ?? [])) {
    if (dfs(next, stack)) return true;
  }
  stack.pop();
  color.set(node, BLACK);
  return false;
}

for (const node of edges.keys()) {
  if (color.get(node) !== BLACK && dfs(node, [])) break;
}

if (cycle) {
  console.error(`✗ capability cycle detected: ${cycle.join(' → ')}`);
  process.exit(1);
}
console.log(`[capability-graph] OK — ${manifests.length} manifests, ${[...providers.keys()].length} capabilities, no cycles`);
