#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 3 — DB owns UI.
 *
 * Forbids new hardcoded primary nav arrays in SPA code. Existing
 * hardcoded arrays are tracked under a baseline so we ratchet down
 * over time. Set STATIC_ROUTE_BAN_ENFORCE=1 to enforce zero.
 */
import { execSync } from 'node:child_process';

const PATTERNS = [
  'STATIC_PRIMARY_NAV',
  'STATIC_SHELL_NAV',
  'BASE_PRIMARY_NAV',
  'defaultModules',
];

let total = 0;
for (const p of PATTERNS) {
  let out = '';
  try { out = execSync(`git grep -nF ${JSON.stringify(p)} -- '*.ts' '*.tsx' '*.html'`, { encoding: 'utf8' }); } catch {}
  const hits = out.split('\n').filter(Boolean).filter((l) => !l.startsWith('scripts/ci-guards/'));
  if (hits.length) {
    console.error(`[static-route-ban] ${p}: ${hits.length} hit(s)`);
    hits.slice(0, 3).forEach((h) => console.error('  ' + h));
    total += hits.length;
  }
}
const BASELINE_MAX = Number(process.env.STATIC_ROUTE_BAN_BASELINE_MAX ?? 200);
const ENFORCE = process.env.STATIC_ROUTE_BAN_ENFORCE === '1';
if (total > BASELINE_MAX || (ENFORCE && total > 0)) {
  console.error(`[static-route-ban] FAIL ${total} hit(s) (baseline=${BASELINE_MAX}, enforce=${ENFORCE})`);
  process.exit(1);
}
console.log(`[static-route-ban] PASS ${total} hit(s) under baseline ${BASELINE_MAX}`);
