#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 4 — cookie domain isolation.
 *
 * Tenant zone cookie name = 'dos_session'.
 * Admin zone cookie name = 'dos_admin_session'.
 * Verifies admin services never set 'dos_session' and tenant services
 * never set 'dos_admin_session'.
 */
import { execSync } from 'node:child_process';

const ADMIN  = ['services/admin-console-bff', 'services/publish-service', 'services/rollout-service'];
const TENANT = ['services/workspace-bff', 'services/tenant-admin-bff'];

function hits(dir, re) {
  try {
    return execSync(`git grep -nE ${JSON.stringify(re)} -- ${JSON.stringify(dir + '/**/*.ts')}`, { encoding: 'utf8' })
      .split('\n').filter(Boolean);
  } catch { return []; }
}

let failures = 0;
for (const d of ADMIN) {
  const h = hits(d, "['\"]dos_session['\"]");
  if (h.length) { console.error(`[cookie-domain-isolation] admin ${d} sets dos_session`); failures += h.length; }
}
for (const d of TENANT) {
  const h = hits(d, "['\"]dos_admin_session['\"]");
  if (h.length) { console.error(`[cookie-domain-isolation] tenant ${d} sets dos_admin_session`); failures += h.length; }
}
if (failures) process.exit(1);
console.log(`[cookie-domain-isolation] PASS ${ADMIN.length} admin + ${TENANT.length} tenant services cookie-isolated`);
