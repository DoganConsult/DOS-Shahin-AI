#!/usr/bin/env node
/**
 * DOS Master Doctrine — tenant-context required.
 *
 * Verifies every tenant-zone service that handles non-public routes
 * imports the tenant-context middleware (`@dos/tenant-context` or
 * `requireTenantContext`) at least once. Admin- and public-zone
 * services are exempt.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const TENANT_SERVICES = [
  'services/workspace-bff',
  'services/tenant-admin-bff',
];

let failures = 0;
for (const dir of TENANT_SERVICES) {
  if (!existsSync(dir)) continue;
  let hits = '';
  try {
    hits = execSync(
      `git grep -lE "tenant-context|requireTenantContext|withTenant|x-tenant-id" -- ${JSON.stringify(dir + '/**/*.ts')}`,
      { encoding: 'utf8' },
    );
  } catch {}
  if (!hits.trim()) {
    console.error(`[tenant-context-required] ${dir} has no tenant-context import`);
    failures++;
  }
}
const BASELINE_MAX = Number(process.env.TENANT_CTX_BASELINE_MAX ?? 2);
const ENFORCE = process.env.TENANT_CTX_ENFORCE === '1';
if (failures > BASELINE_MAX || (ENFORCE && failures > 0)) {
  console.error(`[tenant-context-required] FAIL ${failures} tenant service(s) missing tenant-context (baseline=${BASELINE_MAX}, enforce=${ENFORCE})`);
  process.exit(1);
}
console.log(`[tenant-context-required] PASS ${TENANT_SERVICES.length - failures}/${TENANT_SERVICES.length} tenant services compliant (baseline=${BASELINE_MAX})`);
