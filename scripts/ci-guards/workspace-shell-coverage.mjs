#!/usr/bin/env node
/**
 * Phase WS-7 — workspace-shell-coverage gate (60-key taxonomy v3.0).
 *
 * Asserts parity across the three sources of truth for the 60 workspace-shell keys:
 *   1. workspace-shell.contracts.ts  (WORKSPACE_SHELL_KEYS)
 *   2. workspace-shell-complete-direct-seed.json (components[].component_key)
 *   3. workspace-shell.routes.ts (WORKSPACE_SHELL_KEYS)
 *
 * Read-only static check (no DB).
 *
 * Set WORKSPACE_SHELL_COVERAGE_ENFORCE=1 to fail CI; otherwise SHADOW.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONTRACTS = join(REPO, 'platform/ui-system/dos-ui-system/src/shell/workspace-shell.contracts.ts');
const SEED_JSON = join(REPO, 'platform/ui-system/module_complete_direct_seed_pack/workspace-shell-complete-direct-seed.json');
const ROUTES    = join(REPO, 'services/ui-os-service/src/routes/workspace-shell.routes.ts');

const EXPECTED_COUNT = 60;
const failures = [];

// ── 1. Extract keys from contracts TS ──────────────────────────────────────
function extractQuotedKeys(src) {
  const keys = [];
  for (const m of src.matchAll(/'(workspace\.[a-z]+\.[a-z0-9-]+)'/g)) {
    if (!keys.includes(m[1])) keys.push(m[1]);
  }
  return keys;
}

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

// ── 3. Extract keys from routes TS ─────────────────────────────────────────
if (!existsSync(ROUTES)) {
  failures.push({ source: 'routes', reason: 'file not found' });
} else {
  const routesSrc = readFileSync(ROUTES, 'utf8');
  const routeKeys = extractQuotedKeys(routesSrc);
  if (routeKeys.length < EXPECTED_COUNT) {
    failures.push({ source: 'routes', reason: `expected >=${EXPECTED_COUNT} keys, found ${routeKeys.length}` });
  }
}

// ── 4. Cross-check: every seed key must appear in contracts + routes ───────
if (seedKeys.length === EXPECTED_COUNT) {
  const contractsSrc = existsSync(CONTRACTS) ? readFileSync(CONTRACTS, 'utf8') : '';
  const routesSrc    = existsSync(ROUTES) ? readFileSync(ROUTES, 'utf8') : '';

  for (const key of seedKeys) {
    if (!contractsSrc.includes(`'${key}'`)) {
      failures.push({ source: 'cross-check', reason: `seed key '${key}' missing from contracts` });
    }
    if (!routesSrc.includes(`'${key}'`)) {
      failures.push({ source: 'cross-check', reason: `seed key '${key}' missing from routes` });
    }
  }
}

const enforce = process.env.WORKSPACE_SHELL_COVERAGE_ENFORCE === '1';
console.log(`[workspace-shell-coverage] expected=${EXPECTED_COUNT} failures=${failures.length}`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ [${f.source}] ${f.reason}`);
  if (enforce) process.exit(1);
  console.error('[workspace-shell-coverage] SHADOW (set WORKSPACE_SHELL_COVERAGE_ENFORCE=1 to fail CI).');
  process.exit(0);
}
console.log(`[workspace-shell-coverage] PASS — ${EXPECTED_COUNT} keys in parity across contracts + seed-json + routes.`);
process.exit(0);
