#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 2 — One BFF for workspace bootstrap.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/forbid-direct-bootstrap-fan-out.mjs [OPTIONS]

Forbids SPA code from calling bootstrap APIs directly.

Options:
  --help, -h           Show this help message

Environment Variables:
  BOOTSTRAP_FAN_OUT_ENFORCE  Set to 1 to enforce ban (default: baseline mode)

Forbidden paths:
  - /api/access/my-permissions
  - /api/tenants/me
  - /api/trials/current

Policy:
  Only workspace-bff /api/workspace/bootstrap envelope is allowed.
  Services under services/workspace-bff/ and scripts/ci-guards/ are exempt.

Exit codes:
  Non-zero on forbidden API call (above baseline or enforce mode)

Examples:
  # Run in baseline mode (default)
  node scripts/ci-guards/forbid-direct-bootstrap-fan-out.mjs

  # Run with enforcement
  BOOTSTRAP_FAN_OUT_ENFORCE=1 node scripts/ci-guards/forbid-direct-bootstrap-fan-out.mjs
`);
  process.exit(0);
}

import { execSync } from 'node:child_process';

const FORBIDDEN = [
  '/api/access/my-permissions',
  '/api/tenants/me',
  '/api/trials/current',
];

const ALLOWED_FILES = [
  /^services\/workspace-bff\//,
  /^scripts\/ci-guards\//,
];

let failures = 0;
for (const path of FORBIDDEN) {
  let hits = [];
  try {
    hits = execSync(`git grep -nF ${JSON.stringify(path)} -- '*.ts' '*.tsx' '*.html'`, { encoding: 'utf8' })
      .split('\n').filter(Boolean);
  } catch {}
  hits = hits.filter((h) => !ALLOWED_FILES.some((re) => re.test(h)));
  if (hits.length) {
    console.log(`[forbid-direct-bootstrap-fan-out] ${path}: ${hits.length} hit(s)`);
    hits.slice(0, 5).forEach((h) => console.log('  ' + h));
    failures += hits.length;
  }
}
// Baseline accepted at M14 D2 close; tighten in M14 D3 by porting
// remaining SPA callers to /api/workspace/bootstrap envelope.
const BASELINE_MAX = 50;
const ENFORCE = process.env.BOOTSTRAP_FAN_OUT_ENFORCE === '1';
if (failures > BASELINE_MAX || (ENFORCE && failures > 0)) {
  console.error(`[forbid-direct-bootstrap-fan-out] FAIL ${failures} hit(s) (baseline=${BASELINE_MAX}, enforce=${ENFORCE})`);
  process.exit(1);
}
console.log(`[forbid-direct-bootstrap-fan-out] PASS ${failures} hit(s) under baseline ${BASELINE_MAX}`);
