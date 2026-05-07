#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 4 — cookie domain isolation.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/cookie-domain-isolation.mjs [OPTIONS]

Verifies admin and tenant services use correct cookie names.

Options:
  --help, -h           Show this help message

Policy:
  Tenant zone cookie name = 'dos_session'
  Admin zone cookie name = 'dos_admin_session'
  Admin services must never set 'dos_session'
  Tenant services must never set 'dos_admin_session'

Exit codes:
  1 — Cookie isolation violation detected
  0 — All services cookie-isolated

Examples:
  # Run cookie domain isolation check
  node scripts/ci-guards/cookie-domain-isolation.mjs
`);
  process.exit(0);
}

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
