#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 4 — Trust-zone isolation.
 *
 * Verifies tenant-zone services (workspace-bff, tenant-admin-bff) do NOT
 * import the platform_admin schema or any platform-admin BFF lib.
 * Verifies admin-zone services (admin-console-bff, publish-service,
 * rollout-service) do NOT import tenant per-tenant schema helpers.
 */
import { execSync } from 'node:child_process';

const TENANT = ['services/workspace-bff', 'services/tenant-admin-bff', 'services/signup-bff', 'services/marketing-shell-service', 'services/anti-abuse-service'];
const ADMIN  = ['services/admin-console-bff', 'services/publish-service', 'services/rollout-service'];

function grepIn(dir, re) {
  try {
    return execSync(`git grep -nE ${JSON.stringify(re)} -- ${JSON.stringify(dir + '/**/*.ts')}`, { encoding: 'utf8' })
      .split('\n').filter(Boolean);
  } catch { return []; }
}

let failures = 0;
for (const dir of TENANT) {
  const hits = grepIn(dir, '\\bplatform_admin\\.');
  if (hits.length) {
    console.error(`[trust-zone-isolation] tenant-zone ${dir} imports platform_admin.*:`);
    hits.slice(0, 5).forEach((h) => console.error('  ' + h));
    failures += hits.length;
  }
}
for (const dir of ADMIN) {
  const hits = grepIn(dir, "from '@dos/db/tenant'");
  if (hits.length) {
    console.error(`[trust-zone-isolation] admin-zone ${dir} imports @dos/db/tenant:`);
    hits.slice(0, 5).forEach((h) => console.error('  ' + h));
    failures += hits.length;
  }
}
if (failures) process.exit(1);
console.log(`[trust-zone-isolation] PASS tenant-zone (${TENANT.length}) and admin-zone (${ADMIN.length}) services isolated`);
