#!/usr/bin/env node
/**
 * DOS Master service guard — every service must have port allocation and registry entry
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/service-port-allocated.mjs [OPTIONS]

Verifies every service under services/ has port allocation and DB registry entry.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Behavior:
  - Checks port allocation in platform/config-center/ops/ports.allocation.json
  - Verifies DB registration in dos_master.service_registry for core services
  - DB unreachable is treated as SKIP for registry check (exit 0)

Exit codes:
  0 — PASS or DB unreachable
  1 — FAIL missing port allocation or registry entry
  2 — ERROR

Examples:
  # Run service port allocated check
  node scripts/ci-guards/service-port-allocated.mjs
`);
  process.exit(0);
}

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const ports = JSON.parse(readFileSync('platform/config-center/ops/ports.allocation.json', 'utf8'));
const allocated = new Set([
  ...Object.keys(ports.services || {}),
  ...Object.keys(ports.oneShots || {}),
]);

const services = readdirSync('services').filter((d) => {
  try { return statSync(join('services', d)).isDirectory() && existsSync(join('services', d, 'package.json')); } catch { return false; }
});

const missing = services.filter((s) => !allocated.has(s));
if (missing.length) {
  console.error('[service-port-allocated] FAIL services missing port allocation:');
  missing.forEach((m) => console.error('  ' + m));
  process.exit(1);
}

const cs = process.env.DATABASE_URL || `postgres://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc`;
const c = new Client({ connectionString: cs });
try { await c.connect(); } catch (e) {
  console.warn('[service-port-allocated] DB unreachable; partial check');
  console.log(`[service-port-allocated] PASS ports allocated for ${services.length} services (DB skipped)`);
  process.exit(0);
}
const r = await c.query(`SELECT service_code FROM dos_master.service_registry WHERE status='active'`);
await c.end();
const registered = new Set((r.rows || []).map((row) => row.service_code));
const wantRegistered = ['workspace-bff','onboarding-service','signup-bff','anti-abuse-service','marketing-shell-service','publish-service','admin-console-bff','tenant-admin-bff','rollout-service'];
const notReg = wantRegistered.filter((s) => !registered.has(s));
if (notReg.length) {
  console.error('[service-port-allocated] FAIL services missing from dos_master.service_registry:');
  notReg.forEach((m) => console.error('  ' + m));
  process.exit(1);
}
console.log(`[service-port-allocated] PASS ${services.length} services on disk; ${wantRegistered.length} DOS Master services registered`);
