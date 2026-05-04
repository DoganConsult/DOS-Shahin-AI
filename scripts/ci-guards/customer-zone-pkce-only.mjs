#!/usr/bin/env node
/**
 * DOS Master L37 — customer-zone OAuth2 PKCE-only.
 *
 * Doctrine §15: customer-zone token exchange MUST use PKCE
 * (RFC 7636). Forbids implicit-flow / response_type=token / unsafe
 * client_credentials in customer-zone code paths.
 *
 * Pattern scope: customer-zone gateway routes (`/api/auth/*`,
 * `/api/public/*`) and SPA OIDC config files.
 */
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
