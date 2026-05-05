#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 4 — Redis DB isolation.
 *
 * Public zone = REDIS_DB=0
 * Tenant zone = REDIS_DB=1
 * Admin zone  = REDIS_DB=2
 * Verifies env files do not assign the wrong DB index.
 */
import { existsSync, readFileSync } from 'node:fs';

const MAP = {
  'platform/config-center/env/workspace-bff.env':         { zone: 'tenant', db: 1 },
  'platform/config-center/env/tenant-admin-bff.env':      { zone: 'tenant', db: 1 },
  'platform/config-center/env/admin-console-bff.env':     { zone: 'admin',  db: 2 },
  'platform/config-center/env/publish-service.env':       { zone: 'admin',  db: 2 },
  'platform/config-center/env/rollout-service.env':       { zone: 'admin',  db: 2 },
  'platform/config-center/env/marketing-shell-service.env': { zone: 'public', db: 0 },
  'platform/config-center/env/signup-bff.env':            { zone: 'public', db: 0 },
  'platform/config-center/env/anti-abuse-service.env':    { zone: 'public', db: 0 },
};

let failures = 0, checked = 0;
for (const [path, expected] of Object.entries(MAP)) {
  if (!existsSync(path)) continue;
  checked++;
  const txt = readFileSync(path, 'utf8');
  const m = /^REDIS_DB\s*=\s*(\d+)/m.exec(txt);
  if (!m) continue;
  if (Number(m[1]) !== expected.db) {
    console.error(`[redis-db-isolation] ${path} REDIS_DB=${m[1]} (expected ${expected.db} for ${expected.zone} zone)`);
    failures++;
  }
}
if (failures) process.exit(1);
console.log(`[redis-db-isolation] PASS ${checked}/${Object.keys(MAP).length} env files compliant`);
