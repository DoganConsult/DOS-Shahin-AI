#!/usr/bin/env node
// Foundation-AI structure emitter.
// Reads published Foundation contracts (navigation, routing, agents) and emits STRUCTURE.md.
// Doctrine: zero static / zero invention — every line is derived from a canonical contract.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';
import { sha256 } from './lib/ledger.mjs';

const ROOT = process.cwd();

function readJson(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

const nav = readJson('platform/foundation/contracts/navigation/navigation.json');
const routes = readJson('platform/foundation/contracts/routing/routes.json');
const agentContract = readJson('platform/foundation/contracts/agent.contract.json');
const agentsRegistry = readJson('platform/foundation/contracts/agents/agents.json');

if (!nav || !routes) {
  console.error('missing canonical contracts (navigation/navigation.json or routing/routes.json)');
  process.exit(2);
}

const internalRoutes = (routes.routes ?? []).filter((r) => r.kind === 'platform-internal' && r.moduleCode === 'foundation');
const apiRoutes = (routes.routes ?? []).filter((r) => r.kind === 'api' && r.moduleCode === 'foundation');

const itemsById = new Map((nav.items ?? []).map((i) => [i.id, i]));
const groups = (nav.groups ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const lines = [];
lines.push('# Foundation Module — STRUCTURE');
lines.push('');
lines.push('> Derived artifact. Do not edit by hand.');
lines.push('> Source contracts:');
lines.push('> - `platform/foundation/contracts/navigation/navigation.json`');
lines.push('> - `platform/foundation/contracts/routing/routes.json`');
lines.push('> - `platform/foundation/contracts/agent.contract.json`');
lines.push('> - `platform/foundation/contracts/agents/agents.json`');
lines.push('>');
lines.push('> Doctrine: zero static / zero legacy / Dynamic UI-OS only / DB-driven by published contracts.');
lines.push('');
lines.push(`Module: \`${nav.moduleCode}\` · navigation schemaVersion ${nav.schemaVersion} · routing schemaVersion ${routes.schemaVersion}`);
lines.push('');
lines.push('## Page Roster (by navigation group, source-of-truth order)');
lines.push('');

for (const g of groups) {
  lines.push(`### ${g.id} — \`${g.labelKey}\``);
  lines.push('');
  lines.push('| order | id | route | icon | permission |');
  lines.push('|------:|----|-------|------|------------|');
  const items = (g.items ?? []).map((id) => itemsById.get(id)).filter(Boolean).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  for (const it of items) {
    lines.push(`| ${it.order ?? ''} | \`${it.id}\` | \`${it.route}\` | \`${it.icon ?? ''}\` | \`${it.permission ?? ''}\` |`);
  }
  lines.push('');
}

const grouped = new Set(groups.flatMap((g) => g.items ?? []));
const ungrouped = (nav.items ?? []).filter((i) => !grouped.has(i.id));
if (ungrouped.length) {
  lines.push('### (ungrouped)');
  lines.push('');
  lines.push('| order | id | route | icon | permission |');
  lines.push('|------:|----|-------|------|------------|');
  for (const it of ungrouped.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    lines.push(`| ${it.order ?? ''} | \`${it.id}\` | \`${it.route}\` | \`${it.icon ?? ''}\` | \`${it.permission ?? ''}\` |`);
  }
  lines.push('');
}

lines.push('## Internal Routes (foundation)');
lines.push('');
lines.push('| path | target |');
lines.push('|------|--------|');
for (const r of internalRoutes) lines.push(`| \`${r.path}\` | \`${r.target}\` |`);
lines.push('');

lines.push('## API Routes (foundation)');
lines.push('');
lines.push('| path | target |');
lines.push('|------|--------|');
for (const r of apiRoutes) lines.push(`| \`${r.path}\` | \`${r.target}\` |`);
lines.push('');

if (agentContract) {
  lines.push('## Foundation Agents (module-owned contract)');
  lines.push('');
  lines.push('| agentId | scope | capabilities | allowedActions | requiresHumanApproval |');
  lines.push('|---------|-------|--------------|----------------|-----------------------|');
  for (const a of agentContract.agents ?? []) {
    lines.push(`| \`${a.agentId}\` | ${a.scope} | ${(a.capabilities ?? []).join(', ')} | ${(a.allowedActions ?? []).join(', ')} | ${a.requiresHumanApproval ? 'yes' : 'no'} |`);
  }
  lines.push('');
}

if (agentsRegistry) {
  lines.push('## Agent Registry (canonical bindings)');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(agentsRegistry, null, 2));
  lines.push('```');
  lines.push('');
}

lines.push('## Provenance');
lines.push('');
lines.push('| source | sha256 |');
lines.push('|--------|--------|');
const provenance = [
  ['navigation/navigation.json', nav],
  ['routing/routes.json', routes],
  ['agent.contract.json', agentContract],
  ['agents/agents.json', agentsRegistry],
];
const provenanceTable = provenance
  .filter(([, v]) => v)
  .map(([k, v]) => ({ source: k, hash: sha256(v) }));
for (const p of provenanceTable) lines.push(`| \`${p.source}\` | \`${p.hash}\` |`);
lines.push('');
lines.push(`Emitted by: \`scripts/program/foundation-ai/emit-structure.mjs\` · ${new Date().toISOString()}`);
lines.push('');

const out = lines.join('\n');
const target = join(ROOT, 'STRUCTURE.md');
writeFileSync(target, out);

const payload = {
  schema: 'foundation-ai.structure.v1',
  pages: nav.items?.length ?? 0,
  groups: groups.length,
  internalRoutes: internalRoutes.length,
  apiRoutes: apiRoutes.length,
  agents: (agentContract?.agents ?? []).length,
  provenance: provenanceTable,
  bytes: out.length,
};
console.log(JSON.stringify(payload, null, 2));
emitProof({ phase: 'P0', wave: 0, name: 'structure-emit', payload, status: 'GREEN', kind: 'STRUCTURE' });
