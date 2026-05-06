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
  // 2026-05-05 Wave 7.5 — product composition-only enforcement.
  'product-no-runtime.mjs',
  // Canonical SPA (@dos/platform-app) + nav roots — no static nav as runtime truth.
  'lint-no-static-nav-fallback.mjs',
  // Hard-kill legacy mode — no DB DTOs, no legacy adapters in frontend shell.
  'lint-no-legacy-uios-shell.mjs',
  'lint-no-hardcoded-shell-labels.mjs',
  // 2026-05-06 — block hardcoded GRC/demo placeholder strings from leaking
  // into live workspace runtime (binding.props, override.patch, source).
  'lint-no-demo-placeholder-runtime.mjs',
  // 2026-05-08 — Carbon-native shell adoption. Visual shell surfaces
  // and ShellHost must compose Carbon UIShell + Tile primitives, not
  // hand-rolled <button>/<ul role="menu">/<input>/<select>.
  'lint-no-raw-shell-primitives.mjs',
];

let pass = 0, fail = 0;
for (const g of GUARDS) {
  const r = spawnSync('node', [`scripts/ci-guards/${g}`], { stdio: 'inherit' });
  if (r.status === 0) pass++; else fail++;
}
console.log(`\n[dos-master-gate] ${pass}/${GUARDS.length} guards PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
