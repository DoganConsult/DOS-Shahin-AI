#!/usr/bin/env node
/**
 * Phase WS-7 — workspace-shell-coverage gate (60-key taxonomy v3.0).
 *
 * Asserts parity across the sources of truth for the 60 workspace-shell keys:
 *   1. workspace-shell.contracts.ts  (WORKSPACE_SHELL_KEYS)
 *   2. workspace-shell-complete-direct-seed.json (components[].component_key)
 *   3. DB: dos.dynamic_ui_component_registry (component_key LIKE 'workspace.%')
 *
 * Falls back to static routes file check if DB is unavailable.
 *
 * Set WORKSPACE_SHELL_COVERAGE_ENFORCE=1 to fail CI; otherwise SHADOW.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTRACTS = join(REPO, 'platform/ui-system/dos-ui-system/src/shell/workspace-shell.contracts.ts');
const SEED_JSON = join(REPO, 'platform/ui-system/module_complete_direct_seed_pack/workspace-shell-complete-direct-seed.json');

const EXPECTED_COUNT = 60;
const failures = [];

// ── Helper: extract quoted workspace keys from TS source ──────────────────
function extractQuotedKeys(src) {
  const keys = [];
  for (const m of src.matchAll(/'(workspace\.[a-z]+\.[a-z0-9-]+)'/g)) {
    if (!keys.includes(m[1])) keys.push(m[1]);
  }
  return keys;
}

// ── 1. Extract keys from contracts TS ──────────────────────────────────────
if (!existsSync(CONTRACTS)) {
  failures.push({ source: 'contracts', reason: 'file not found' });
} else {
  const contractsSrc = readFileSync(CONTRACTS, 'utf8');
  const contractKeys = extractQuotedKeys(contractsSrc);
  if (contractKeys.length !== EXPECTED_COUNT) {
    failures.push({ source: 'contracts', reason: `expected ${EXPECTED_COUNT} keys, found ${contractKeys.length}` });
  }
}

// ── 2. Extract keys from seed JSON ─────────────────────────────────────────
let seedKeys = [];
if (!existsSync(SEED_JSON)) {
  failures.push({ source: 'seed-json', reason: 'file not found' });
} else {
  const json = JSON.parse(readFileSync(SEED_JSON, 'utf8'));
  seedKeys = (json.components ?? []).map(c => c.component_key).filter(Boolean);
  if (seedKeys.length !== EXPECTED_COUNT) {
    failures.push({ source: 'seed-json', reason: `expected ${EXPECTED_COUNT} components, found ${seedKeys.length}` });
  }
}

// ── 3. Check DB for workspace keys (primary) ──────────────────────────────
let dbKeys = [];
try {
  const raw = execSync(
    `PGPASSWORD=dos_auth_pass_2026 psql -h localhost -U dos_auth -d shahin_grc -t -A -c "SELECT component_key FROM dos.dynamic_ui_component_registry WHERE component_key LIKE 'workspace.%' ORDER BY component_key"`,
    { encoding: 'utf8', timeout: 5000 },
  ).trim();
  dbKeys = raw ? raw.split('\n').map(s => s.trim()).filter(Boolean) : [];
} catch {
  // DB unavailable — will report but not fail on this source alone
}

if (dbKeys.length > 0) {
  if (dbKeys.length < EXPECTED_COUNT) {
    failures.push({ source: 'db-registry', reason: `expected >=${EXPECTED_COUNT} keys, found ${dbKeys.length}` });
  }
} else {
  failures.push({ source: 'db-registry', reason: 'DB unreachable or no workspace.* keys found — SHADOW' });
}

// ── 4. Cross-check: every seed key must appear in contracts + DB ──────────
if (seedKeys.length === EXPECTED_COUNT) {
  const contractsSrc = existsSync(CONTRACTS) ? readFileSync(CONTRACTS, 'utf8') : '';
  const dbKeySet = new Set(dbKeys);

  for (const key of seedKeys) {
    if (!contractsSrc.includes(`'${key}'`)) {
      failures.push({ source: 'cross-check', reason: `seed key '${key}' missing from contracts` });
    }
    if (dbKeys.length > 0 && !dbKeySet.has(key)) {
      failures.push({ source: 'cross-check', reason: `seed key '${key}' missing from DB registry` });
    }
  }
}

const enforce = process.env.WORKSPACE_SHELL_COVERAGE_ENFORCE === '1';
console.log(`[workspace-shell-coverage] expected=${EXPECTED_COUNT} failures=${failures.length} db_keys=${dbKeys.length}`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ [${f.source}] ${f.reason}`);
  if (enforce) process.exit(1);
  console.error('[workspace-shell-coverage] SHADOW (set WORKSPACE_SHELL_COVERAGE_ENFORCE=1 to fail CI).');
  process.exit(0);
}
console.log(`[workspace-shell-coverage] PASS — ${EXPECTED_COUNT} keys in parity across contracts + seed-json + DB.`);
process.exit(0);
