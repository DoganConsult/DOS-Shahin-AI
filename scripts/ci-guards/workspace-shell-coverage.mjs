#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTRACTS = join(REPO, 'platform/ui-system/dos-ui-system/src/shell/workspace-shell.contracts.ts');
const SEED_JSON = join(REPO, 'platform/ui-system/module_complete_direct_seed_pack/workspace-shell-complete-direct-seed.json');
const EXPECTED_MIN_COUNT = 60;
const failures = [];

function workspaceLiterals(src) {
  return Array.from(new Set(Array.from(src.matchAll(/['"](workspace\.[a-z0-9.-]+)['"]/g), (m) => m[1])));
}

if (!existsSync(CONTRACTS)) {
  failures.push({ source: 'contracts', reason: 'file not found' });
} else {
  const literals = workspaceLiterals(readFileSync(CONTRACTS, 'utf8'));
  if (literals.length > 0) {
    failures.push({ source: 'contracts', reason: `hardcoded workspace key literal(s) found: ${literals.slice(0, 8).join(', ')}` });
  }
}

let seedKeys = [];
if (!existsSync(SEED_JSON)) {
  failures.push({ source: 'seed-json', reason: 'file not found' });
} else {
  const json = JSON.parse(readFileSync(SEED_JSON, 'utf8'));
  seedKeys = (json.components ?? []).map((c) => c.component_key).filter(Boolean).sort();
  if (seedKeys.length < EXPECTED_MIN_COUNT) {
    failures.push({ source: 'seed-json', reason: `expected >=${EXPECTED_MIN_COUNT} components, found ${seedKeys.length}` });
  }
}

let dbKeys = [];
try {
  const raw = execSync(
    `PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -t -A -c "SELECT component_key FROM dos.dynamic_ui_component_registry WHERE component_key LIKE 'workspace.%' AND approval_status='approved' ORDER BY component_key"`,
    { encoding: 'utf8', timeout: 5000 },
  ).trim();
  dbKeys = raw ? raw.split('\n').map((s) => s.trim()).filter(Boolean).sort() : [];
} catch {
  failures.push({ source: 'db-registry', reason: 'DB unreachable' });
}

if (dbKeys.length < EXPECTED_MIN_COUNT) {
  failures.push({ source: 'db-registry', reason: `expected >=${EXPECTED_MIN_COUNT} approved workspace keys, found ${dbKeys.length}` });
}

if (seedKeys.length > 0 && dbKeys.length > 0) {
  const dbKeySet = new Set(dbKeys);
  for (const key of seedKeys) {
    if (!dbKeySet.has(key)) failures.push({ source: 'cross-check', reason: `seed key '${key}' missing from DB registry` });
  }
}

const enforce = process.env.WORKSPACE_SHELL_COVERAGE_ENFORCE === '1';
console.log(`[workspace-shell-coverage] seed_keys=${seedKeys.length} db_keys=${dbKeys.length} failures=${failures.length}`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ [${f.source}] ${f.reason}`);
  if (enforce) process.exit(1);
  console.error('[workspace-shell-coverage] SHADOW (set WORKSPACE_SHELL_COVERAGE_ENFORCE=1 to fail CI).');
  process.exit(0);
}
console.log('[workspace-shell-coverage] PASS — workspace shell keys are DB/seed driven with no hardcoded TS key roster.');
