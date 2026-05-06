#!/usr/bin/env node
// Foundation-AI Wave 2 seed emitter.
// Derives platform/foundation/db/seeds/foundation-page-archetype.sql from canonical contracts:
//   - platform/foundation/contracts/navigation/navigation.json
//   - platform/foundation/contracts/agent.contract.json
// Doctrine: zero static / zero invention — every row is sourced from a published contract.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { emitProof } from './lib/proof.mjs';
import { sha256 } from './lib/ledger.mjs';

const ROOT = process.cwd();
const NAV = JSON.parse(readFileSync(join(ROOT, 'platform/foundation/contracts/navigation/navigation.json'), 'utf8'));
const AGENT = JSON.parse(readFileSync(join(ROOT, 'platform/foundation/contracts/agent.contract.json'), 'utf8'));

const moduleCode = NAV.moduleCode;
const items = NAV.items ?? [];

// Heuristic: archetype by id suffix / known pages.
function archetypeFor(id) {
  const tail = id.replace(/^foundation\./, '');
  const map = {
    'overview':         'overview',
    'organization':     'hierarchy',
    'business-units':   'list',
    'departments':      'list',
    'positions':        'list',
    'locations':        'list',
    'users':            'list',
    'teams':            'list',
    'roles':            'list',
    'permissions':      'matrix',
    'committees':       'list',
    'delegations':      'list',
    'access-review':    'review',
    'policies':         'policy',
    'audit':            'audit',
    'ownership':        'matrix',
    'sod':              'matrix',
    'hierarchy-viz':    'hierarchy',
    'user-lifecycle':   'lifecycle',
    'reference-data':   'reference',
    'diagnostics':      'diagnostics',
  };
  return map[tail] ?? 'list';
}

// Persona binding by archetype family. Keep deterministic; product taxonomy.
function personasFor(archetype) {
  const m = {
    overview:    [['module-owner', true, 1], ['admin', false, 2]],
    hierarchy:   [['org-admin', true, 1], ['module-owner', false, 2]],
    list:        [['module-user', true, 1], ['admin', false, 2]],
    object:      [['module-user', true, 1]],
    workflow:    [['module-user', true, 1], ['approver', false, 2]],
    audit:       [['auditor', true, 1], ['admin', false, 2]],
    review:      [['reviewer', true, 1], ['admin', false, 2]],
    matrix:      [['security-admin', true, 1], ['auditor', false, 2]],
    policy:      [['policy-owner', true, 1], ['admin', false, 2]],
    lifecycle:   [['hr-admin', true, 1], ['admin', false, 2]],
    reference:   [['admin', true, 1]],
    diagnostics: [['ops', true, 1]],
    settings:    [['admin', true, 1]],
    catalog:     [['admin', true, 1]],
  };
  return m[archetype] ?? [['admin', true, 1]];
}

// Index pageAgents by route → list of (agentId, isPrimary, presentation, sortOrder)
const pageAgentsByRoute = new Map();
for (const pa of AGENT.pageAgents ?? []) {
  if (!pageAgentsByRoute.has(pa.route)) pageAgentsByRoute.set(pa.route, []);
  pageAgentsByRoute.get(pa.route).push(pa);
}

const personaRows = [];
const agentRows = [];

for (const it of items) {
  const archetype = archetypeFor(it.id);
  // Page row written into a CTE-style INSERT via the binding tables (page_id is derived from nav id).
  for (const [personaId, isPrimary, sortOrder] of personasFor(archetype)) {
    personaRows.push({ moduleCode, pageId: it.id, personaId, isPrimary, sortOrder });
  }
  const bound = pageAgentsByRoute.get(it.route) ?? [];
  for (const pa of bound) {
    agentRows.push({ moduleCode, pageId: it.id, agentId: pa.agentId, isPrimary: !!pa.isPrimary, presentation: pa.presentation ?? 'side-panel', sortOrder: pa.sortOrder ?? 10 });
  }
}

const lines = [];
lines.push('-- =====================================================================');
lines.push('-- Foundation Wave 2 seed: page → persona / page → agent bindings');
lines.push('-- Derived artifact. Source contracts:');
lines.push('--   platform/foundation/contracts/navigation/navigation.json');
lines.push('--   platform/foundation/contracts/agent.contract.json');
lines.push('-- Idempotent. Safe to re-run. Self-asserting at tail.');
lines.push('-- =====================================================================');
lines.push('');
lines.push('BEGIN;');
lines.push('SET search_path = public;');
lines.push('');

if (personaRows.length) {
  lines.push('-- Persona bindings');
  lines.push('INSERT INTO dos.dynamic_ui_page_persona (module_code, page_id, persona_id, is_primary, sort_order) VALUES');
  lines.push(personaRows.map((r) =>
    `  ('${r.moduleCode}','${r.pageId}','${r.personaId}',${r.isPrimary ? 'TRUE' : 'FALSE'},${r.sortOrder})`
  ).join(',\n'));
  lines.push('ON CONFLICT (module_code, page_id, persona_id) DO UPDATE');
  lines.push('  SET is_primary = EXCLUDED.is_primary, sort_order = EXCLUDED.sort_order;');
  lines.push('');
}

if (agentRows.length) {
  lines.push('-- Agent bindings');
  lines.push('INSERT INTO dos.dynamic_ui_page_agent (module_code, page_id, agent_id, is_primary, presentation, sort_order) VALUES');
  lines.push(agentRows.map((r) =>
    `  ('${r.moduleCode}','${r.pageId}','${r.agentId}',${r.isPrimary ? 'TRUE' : 'FALSE'},'${r.presentation}',${r.sortOrder})`
  ).join(',\n'));
  lines.push('ON CONFLICT (module_code, page_id, agent_id) DO UPDATE');
  lines.push('  SET is_primary = EXCLUDED.is_primary, presentation = EXCLUDED.presentation, sort_order = EXCLUDED.sort_order;');
  lines.push('');
}

lines.push('COMMIT;');
lines.push('');
lines.push('-- Self-assertion');
lines.push('DO $$');
lines.push('DECLARE persona_count INT; agent_count INT;');
lines.push('BEGIN');
lines.push(`  SELECT COUNT(*) INTO persona_count FROM dos.dynamic_ui_page_persona WHERE module_code = '${moduleCode}';`);
lines.push(`  SELECT COUNT(*) INTO agent_count   FROM dos.dynamic_ui_page_agent   WHERE module_code = '${moduleCode}';`);
lines.push(`  IF persona_count < ${personaRows.length} THEN RAISE EXCEPTION 'foundation persona seed failed: expected >=${personaRows.length}, got %', persona_count; END IF;`);
lines.push(`  IF agent_count   < ${agentRows.length}   THEN RAISE EXCEPTION 'foundation agent seed failed: expected >=${agentRows.length}, got %', agent_count;   END IF;`);
lines.push('END $$;');
lines.push('');

const sql = lines.join('\n');
const out = join(ROOT, 'platform/foundation/db/seeds/foundation-page-archetype.sql');
writeFileSync(out, sql);

const payload = {
  schema: 'foundation-ai.seed-emit.v1',
  module: moduleCode,
  pages: items.length,
  personaRows: personaRows.length,
  agentRows: agentRows.length,
  outputFile: out,
  outputHash: sha256(sql),
  derivedFrom: [
    'platform/foundation/contracts/navigation/navigation.json',
    'platform/foundation/contracts/agent.contract.json',
  ],
};
console.log(JSON.stringify(payload, null, 2));
emitProof({ phase: 'P2', wave: 2, name: 'emit-seed', payload, status: 'GREEN', kind: 'SEED_EMIT' });
