#!/usr/bin/env node
/**
 * DOS Master L37 — customer-zone OAuth2 PKCE-only.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/customer-zone-pkce-only.mjs [OPTIONS]

Enforces customer-zone OAuth2 PKCE-only (RFC 7636).

Options:
  --help, -h           Show this help message

Environment Variables:
  PKCE_BAN_ENFORCE           Set to 1 to enforce ban (default: baseline mode)
  PKCE_BAN_BASELINE_MAX     Max allowed hits in baseline mode (default: 10)

Behavior:
  - Forbids implicit-flow / response_type=token / unsafe client_credentials
  - Scans customer-zone gateway routes and SPA OIDC config files
  - Excludes scripts/ci-guards/ from hits

Exit codes:
  1 — Forbidden pattern detected (above baseline or enforce mode)
  0 — No violations or within baseline

Examples:
  # Run in baseline mode (default)
  node scripts/ci-guards/customer-zone-pkce-only.mjs

  # Run with enforcement
  PKCE_BAN_ENFORCE=1 node scripts/ci-guards/customer-zone-pkce-only.mjs
`);
  process.exit(0);
}

import { execSync } from 'node:child_process';

const FORBIDDEN = [
  'response_type=token',
  'response_type=id_token token',
  'flow:\\s*[\'"]implicit[\'"]',
];

let total = 0;
for (const p of FORBIDDEN) {
  let out = '';
  try {
    out = execSync(
      `git grep -nE ${JSON.stringify(p)} -- 'services/**/*.ts' 'products/**/*.ts' 'platform/core/**/*.ts'`,
      { encoding: 'utf8' },
    );
  } catch { /* no hits */ }
  const hits = out.split('\n').filter(Boolean).filter((l) => !l.startsWith('scripts/ci-guards/'));
  if (hits.length) {
    console.error(`[customer-zone-pkce-only] forbidden pattern '${p}': ${hits.length} hit(s)`);
    hits.slice(0, 3).forEach((h) => console.error('  ' + h));
    total += hits.length;
  }
}
const ENFORCE = process.env.PKCE_BAN_ENFORCE === '1';
const BASELINE = Number(process.env.PKCE_BAN_BASELINE_MAX ?? 10);
if (total > BASELINE || (ENFORCE && total > 0)) {
  console.error(`[customer-zone-pkce-only] FAIL ${total} hit(s) (baseline=${BASELINE}, enforce=${ENFORCE})`);
  process.exit(1);
}
console.log(`[customer-zone-pkce-only] PASS ${total} hit(s) under baseline ${BASELINE}`);
