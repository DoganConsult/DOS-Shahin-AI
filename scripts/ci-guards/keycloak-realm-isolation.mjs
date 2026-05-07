#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 4 — Keycloak realm isolation.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/keycloak-realm-isolation.mjs [OPTIONS]

Verifies admin and tenant services reference correct Keycloak realms.

Options:
  --help, -h           Show this help message

Policy:
  Admin-zone services (admin-console-bff, publish-service, rollout-service):
    Must reference platform-ops realm, not tenants realm
  
  Tenant-zone services (workspace-bff, tenant-admin-bff):
    Must reference tenants realm, not platform-ops realm

Exit codes:
  1 — Realm isolation violation detected
  0 — All services realm-isolated

Examples:
  # Run realm isolation check
  node scripts/ci-guards/keycloak-realm-isolation.mjs
`);
  process.exit(0);
}

import { execSync } from 'node:child_process';

const ADMIN  = ['services/admin-console-bff', 'services/publish-service', 'services/rollout-service'];
const TENANT = ['services/workspace-bff', 'services/tenant-admin-bff'];

function grepIn(dir, re) {
  try {
    return execSync(`git grep -nE ${JSON.stringify(re)} -- ${JSON.stringify(dir + '/**/*.ts')} ${JSON.stringify(dir + '/**/*.env*')}`, { encoding: 'utf8' })
      .split('\n').filter(Boolean);
  } catch { return []; }
}

let failures = 0;
for (const dir of ADMIN) {
  const bad = grepIn(dir, "realm.*['\"]tenants['\"]|KEYCLOAK_REALM=tenants");
  if (bad.length) { console.error(`[keycloak-realm-isolation] admin ${dir} references tenants realm`); failures += bad.length; }
}
for (const dir of TENANT) {
  const bad = grepIn(dir, "realm.*['\"]platform-ops['\"]|KEYCLOAK_REALM=platform-ops");
  if (bad.length) { console.error(`[keycloak-realm-isolation] tenant ${dir} references platform-ops realm`); failures += bad.length; }
}
if (failures) process.exit(1);
console.log(`[keycloak-realm-isolation] PASS ${ADMIN.length} admin + ${TENANT.length} tenant services realm-isolated`);
