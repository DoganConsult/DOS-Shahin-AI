#!/usr/bin/env node
/**
 * DOS Master L33 — admin-zone cert expiry baseline.
 *
 * Walks every leaf cert under platform/config-center/secrets/admin-mtls/
 * (excluding ca.crt) and verifies notAfter is at least
 * CERT_EXPIRY_MIN_DAYS (default 90) days into the future.
 *
 * Doctrine binding: Article 4 (admin trust zone) + Article 5 (no
 * fake-green — expiring certs would silently break the trust hop).
 */
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
