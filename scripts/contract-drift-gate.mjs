#!/usr/bin/env node
/**
 * contract-drift-gate.mjs
 *
 * CI gate wrapper around audit-fe-be-routes.mjs.
 * Runs the audit and exits non-zero if the BROKEN (FE->BE 404-risk) count
 * exceeds the allowed ceiling. Use CONTRACT_DRIFT_MAX_BROKEN env var to
 * ratchet down over time (e.g. start at current count, then reduce).
 *
 * Usage:
 *   node scripts/contract-drift-gate.mjs
 *   CONTRACT_DRIFT_MAX_BROKEN=0 node scripts/contract-drift-gate.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATUS_JSON = path.join(REPO_ROOT, 'docs/generated/api-wire.json');
const AUDIT_SCRIPT = path.join(REPO_ROOT, 'scripts/audit-fe-be-routes.mjs');

const maxBroken = Number.isFinite(parseInt(process.env.CONTRACT_DRIFT_MAX_BROKEN ?? '', 10))
  ? parseInt(process.env.CONTRACT_DRIFT_MAX_BROKEN, 10)
  : 0;

try {
  execSync(`node ${JSON.stringify(AUDIT_SCRIPT)}`, { stdio: 'inherit' });
} catch (err) {
  console.error('[contract-drift-gate] audit-fe-be-routes.mjs failed to run');
  process.exit(2);
}

if (!existsSync(STATUS_JSON)) {
  console.error(`[contract-drift-gate] status json not found at ${STATUS_JSON}`);
  process.exit(2);
}

const status = JSON.parse(readFileSync(STATUS_JSON, 'utf-8'));
const broken = status.summary?.broken ?? 0;
const wired = status.summary?.wired ?? 0;
const unused = status.summary?.unused ?? 0;

console.log(`[contract-drift-gate] wired=${wired} broken=${broken} unused=${unused} max=${maxBroken}`);

if (broken > maxBroken) {
  console.error(`[contract-drift-gate] FAIL: ${broken} broken FE->BE contracts exceed ceiling ${maxBroken}`);
  if (Array.isArray(status.brokenByModule)) {
    for (const { mod, count } of status.brokenByModule.slice(0, 20)) {
      console.error(`  - ${mod}: ${count}`);
    }
  }
  process.exit(1);
}

console.log('[contract-drift-gate] PASS');
