#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 2 — One BFF for workspace bootstrap.
 *
 * Forbids SPA code from calling /api/access/my-permissions,
 * /api/tenants/me, or /api/trials/current directly. Only the
 * workspace-bff /api/workspace/bootstrap envelope is allowed.
 */
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
    console.error(`[forbid-direct-bootstrap-fan-out] ${path}: ${hits.length} hit(s)`);
    hits.slice(0, 5).forEach((h) => console.error('  ' + h));
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
