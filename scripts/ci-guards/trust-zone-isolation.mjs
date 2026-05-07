#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 4 — Trust-zone isolation.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/trust-zone-isolation.mjs [OPTIONS]

Verifies tenant-zone and admin-zone services do not import each other's schemas.

Options:
  --help, -h           Show this help message

Policy:
  Tenant-zone services (workspace-bff, tenant-admin-bff, signup-bff, marketing-shell-service, anti-abuse-service):
    Must NOT import platform_admin schema or admin-zone BFF libs
  
  Admin-zone services (admin-console-bff, publish-service, rollout-service):
    Must NOT import @dos/db/tenant

Exit codes:
  1 — Trust-zone isolation violation detected
  0 — All services isolated

Examples:
  # Run trust zone isolation check
  node scripts/ci-guards/trust-zone-isolation.mjs
`);
  process.exit(0);
}

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
