#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 3 — DB owns UI
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/static-route-ban.mjs [OPTIONS]

Forbids new hardcoded primary nav arrays in SPA code.

Options:
  --help, -h           Show this help message

Environment Variables:
  STATIC_ROUTE_BAN_BASELINE_MAX  Baseline max hits (default: 200)
  STATIC_ROUTE_BAN_ENFORCE       Set to 1 to enforce zero (default: baseline mode)

Policy:
  Existing hardcoded arrays are tracked under baseline to ratchet down over time.
  DB owns UI — all navigation should come from dynamic-ui contract.

Exit codes:
  Non-zero on static route violation (above baseline or when enforced)

Examples:
  # Run in baseline mode (default)
  node scripts/ci-guards/static-route-ban.mjs

  # Run with enforcement
  STATIC_ROUTE_BAN_ENFORCE=1 node scripts/ci-guards/static-route-ban.mjs
`);
  process.exit(0);
}

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
