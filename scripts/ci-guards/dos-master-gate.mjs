#!/usr/bin/env node
/**
 * DOS Master release gate — runs every DOS Master CI guard in sequence.
 * Exit non-zero if any guard fails.
 */
import { spawnSync } from 'node:child_process';

const GUARDS = [
  'dos-master-only.mjs',
  'ppd-ring-required.mjs',
  'forbid-legacy-accessstore.mjs',
  'single-access-store-import.mjs',
  'forbid-direct-bootstrap-fan-out.mjs',
  'cli-ui-parity.mjs',
  'doctrine-acknowledged.mjs',
  'fake-green-detector.mjs',
  'service-port-allocated.mjs',
  'trust-zone-isolation.mjs',
  'service-manifest-required.mjs',
  'tenant-context-required.mjs',
  'rls-policy-present.mjs',
  'audit-event-on-write.mjs',
  'keycloak-realm-isolation.mjs',
  'decision-ledger-immutable.mjs',
  'cookie-domain-isolation.mjs',
  'redis-db-isolation.mjs',
  'static-route-ban.mjs',
  'no-archive-imports.mjs',
  'bootstrap-cache-key-coherent.mjs',
  'mtls-required-on-admin-zone.mjs',
  'publish-revision-atomic.mjs',
  'provisioning-job-idempotent.mjs',
  // Phase 4 (L33..L37) additions.
  'cert-expiry-baseline.mjs',
  'tenant-zone-cert-isolation.mjs',
  'slo-row-per-active-service.mjs',
  'customer-zone-pkce-only.mjs',
  // 2026-05-04 — bridge gate for tenant authorization + workspace shell.
  'tenant-completeness.mjs',
];

let pass = 0, fail = 0;
for (const g of GUARDS) {
  const r = spawnSync('node', [`scripts/ci-guards/${g}`], { stdio: 'inherit' });
  if (r.status === 0) pass++; else fail++;
}
console.log(`\n[dos-master-gate] ${pass}/${GUARDS.length} guards PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
