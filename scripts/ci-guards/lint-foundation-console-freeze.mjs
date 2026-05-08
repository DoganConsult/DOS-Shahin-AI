#!/usr/bin/env node
/**
 * Foundation-Console Freeze Window Guard
 *
 * Doctrine: while Foundation Console is being built and shipped to production,
 * the legacy Shahin app + its modules + its services are in MAINTENANCE MODE.
 * No feature work allowed on legacy paths. Only:
 *   - Security fixes (commit message must contain [SECURITY])
 *   - Foundation Console work (under products/foundation-console/**)
 *   - DB migrations scoped to fc_* schemas
 *   - CI/proof artifacts
 *
 * Usage:
 *   node scripts/ci-guards/lint-foundation-console-freeze.mjs [--base <ref>]
 *
 * Env:
 *   FREEZE_BASE_REF   default "origin/main"
 *   FREEZE_OFF=1      bypass (emergency only — must be justified in PR body)
 */

import { spawnSync } from 'node:child_process';

const ARGS = process.argv.slice(2);
const baseIdx = ARGS.indexOf('--base');
const BASE_REF =
  (baseIdx >= 0 ? ARGS[baseIdx + 1] : null) ||
  process.env.FREEZE_BASE_REF ||
  'origin/main';

if (process.env.FREEZE_OFF === '1') {
  console.warn('[freeze-guard] FREEZE_OFF=1 — bypass active. Document justification in PR.');
  process.exit(0);
}

const FROZEN_PREFIXES = [
  'platform/core/platform/shell/',
  'platform/core/platform/navigation/',
  'platform/core/platform/dynamic-ui/',
  'platform/core/services/platform/',
  'platform/ui-system/dos-ui-system/src/shell/',
  'platform/ui-system/dos-ui-system/src/components/nav-item.component.ts',
  'platform/ui-system/dos-ui-contracts/src/',
  'platform/foundation/ui/',
  'platform/app/',
  'services/ui-os-service/',
  'services/dynamic-ui-service/',
  'modules/',
  'products/shahin-ai/',
  'products/dogan-ai/',
  'products/doganconsult/',
  'products/doganhub/',
  'products/doganlab/',
  'products/tuwaiq-ai/',
];

const ALLOWED_PREFIXES = [
  'products/foundation-console/',
  'platform/dos/migrations/foundation-console/',
  'scripts/ci-guards/',
  'proofs/',
  'ops/db-snapshots/',
  'AGENTS.md',
];

function gitDiff(base) {
  const r = spawnSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' });
  if (r.status !== 0) {
    // Fallback: HEAD against working tree (uncommitted)
    const r2 = spawnSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' });
    return r2.stdout.split('\n').filter(Boolean);
  }
  return r.stdout.split('\n').filter(Boolean);
}

function commitMsg() {
  const r = spawnSync('git', ['log', '-1', '--pretty=%B'], { encoding: 'utf8' });
  return r.stdout || '';
}

function isFrozen(path) {
  return FROZEN_PREFIXES.some((p) => path.startsWith(p));
}

function isAllowed(path) {
  return ALLOWED_PREFIXES.some((p) => path.startsWith(p));
}

const changed = gitDiff(BASE_REF);
const msg = commitMsg();
const securityExempt = /\[SECURITY\]/i.test(msg);

const violations = [];
for (const f of changed) {
  if (isAllowed(f)) continue;
  if (isFrozen(f)) {
    if (securityExempt) continue;
    violations.push(f);
  }
}

if (violations.length === 0) {
  console.log(`[freeze-guard] OK — ${changed.length} files changed, none violate the freeze.`);
  process.exit(0);
}

console.error('[freeze-guard] FAIL — frozen paths modified without [SECURITY] tag:');
for (const v of violations) console.error('  ' + v);
console.error('\nFoundation Console freeze is in effect. Allowed roots:');
for (const a of ALLOWED_PREFIXES) console.error('  ' + a);
console.error('\nTo bypass for security: prefix commit subject with "[SECURITY]".');
process.exit(1);
