#!/usr/bin/env node
/**
 * DOS Master L33 — admin-zone cert expiry baseline.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/cert-expiry-baseline.mjs [OPTIONS]

Verifies admin-zone certs have sufficient expiry days.

Options:
  --help, -h           Show this help message

Environment Variables:
  CERT_EXPIRY_MIN_DAYS  Minimum days remaining (default: 90)

Behavior:
  - Walks every leaf cert under platform/config-center/secrets/admin-mtls/
  - Excludes ca.crt
  - Verifies notAfter is at least CERT_EXPIRY_MIN_DAYS in future
  - Skips if admin-mtls dir absent (dev env)

Exit codes:
  0 — All certs meet baseline or dir absent
  1 — Cert expiry below baseline

Examples:
  # Run cert expiry baseline check
  node scripts/ci-guards/cert-expiry-baseline.mjs

  # Custom minimum days
  CERT_EXPIRY_MIN_DAYS=180 node scripts/ci-guards/cert-expiry-baseline.mjs
`);
  process.exit(0);
}

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const DIR = 'platform/config-center/secrets/admin-mtls';
const MIN_DAYS = Number(process.env.CERT_EXPIRY_MIN_DAYS ?? 90);

if (!existsSync(DIR)) {
  console.log('[cert-expiry-baseline] SKIP — admin-mtls dir absent (dev env)');
  process.exit(0);
}

const certs = readdirSync(DIR).filter((f) => f.endsWith('.crt') && f !== 'ca.crt');
let fail = 0, ok = 0;
for (const f of certs) {
  try {
    const out = execSync(`openssl x509 -in ${join(DIR, f)} -noout -enddate`, { encoding: 'utf8' });
    const m = out.match(/notAfter=(.+)/);
    if (!m) { console.error(`[cert-expiry-baseline] ${f}: no notAfter`); fail++; continue; }
    const exp = new Date(m[1]);
    const days = Math.floor((exp.getTime() - Date.now()) / 86400000);
    if (days < MIN_DAYS) {
      console.error(`[cert-expiry-baseline] ${f}: ${days}d remaining (min=${MIN_DAYS})`);
      fail++;
    } else {
      ok++;
    }
  } catch (e) {
    console.error(`[cert-expiry-baseline] ${f}: parse failed: ${(e).message}`);
    fail++;
  }
}
if (fail) {
  console.error(`[cert-expiry-baseline] FAIL ${fail}/${certs.length} certs under ${MIN_DAYS}d`);
  process.exit(1);
}
console.log(`[cert-expiry-baseline] PASS ${ok}/${certs.length} admin certs ≥ ${MIN_DAYS}d`);
