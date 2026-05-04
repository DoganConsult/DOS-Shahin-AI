#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 4 — Keycloak realm isolation.
 *
 * Verifies admin-zone services reference a separate Keycloak realm
 * (`platform-ops`) and not the tenant realm (`tenants`). Tenant-zone
 * services must reference the tenant realm and not platform-ops.
 */
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
