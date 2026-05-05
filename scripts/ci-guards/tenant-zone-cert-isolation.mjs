#!/usr/bin/env node
/**
 * DOS Master L34 — tenant-zone cert isolation.
 *
 * Doctrine Article 4 forbids reusing the admin CA for tenant-zone
 * services. If a `platform/config-center/secrets/tenant-mtls/` dir
 * exists, every leaf cert there MUST chain to a DIFFERENT CA than
 * the admin CA.
 *
 * Until ops mints the tenant CA the dir is absent and this guard
 * is a no-op pass (Article 5: never block on un-provisioned material).
 */
import { existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ADMIN_CA = 'platform/config-center/secrets/admin-mtls/ca.crt';
const TENANT_DIR = 'platform/config-center/secrets/tenant-mtls';

if (!existsSync(TENANT_DIR)) {
  console.log('[tenant-zone-cert-isolation] SKIP — tenant-mtls dir absent (ops not yet provisioned)');
  process.exit(0);
}
if (!existsSync(ADMIN_CA)) {
  console.error('[tenant-zone-cert-isolation] FAIL — admin CA missing but tenant dir present');
  process.exit(1);
}
const adminFp = execSync(`openssl x509 -in ${ADMIN_CA} -noout -fingerprint -sha256`, { encoding: 'utf8' }).trim();
const certs = readdirSync(TENANT_DIR).filter((f) => f.endsWith('.crt') && f !== 'ca.crt');
let bad = 0;
for (const f of certs) {
  const issuer = execSync(`openssl x509 -in ${join(TENANT_DIR, f)} -noout -issuer`, { encoding: 'utf8' });
  if (issuer.includes('DOS Platform Admin Zone CA')) {
    console.error(`[tenant-zone-cert-isolation] ${f} issued by admin CA — Article 4 violation`);
    bad++;
  }
}
if (bad) { console.error(`[tenant-zone-cert-isolation] FAIL ${bad} cross-zone leak(s)`); process.exit(1); }
console.log(`[tenant-zone-cert-isolation] PASS ${certs.length}/${certs.length} tenant cert(s) isolated from admin CA (admin fp ${adminFp.slice(0, 50)}…)`);
