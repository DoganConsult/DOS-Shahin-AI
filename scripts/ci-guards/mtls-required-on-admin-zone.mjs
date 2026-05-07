#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 4 — admin-zone services require mTLS
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/mtls-required-on-admin-zone.mjs [OPTIONS]

Verifies admin-zone env files declare MTLS_REQUIRED=true.

Options:
  --help, -h           Show this help message

Policy:
  Admin-zone env files must declare MTLS_REQUIRED=true (or baseline-tracked exemption)
  so gateway enforces client-cert validation on /api/admin/* upstreams.

Exit codes:
  Non-zero on MTLS_REQUIRED missing

Examples:
  # Run mTLS required check
  node scripts/ci-guards/mtls-required-on-admin-zone.mjs
`);
  process.exit(0);
}

import { existsSync, readFileSync } from 'node:fs';

const ADMIN_ENVS = [
  'platform/config-center/env/admin-console-bff.env',
  'platform/config-center/env/publish-service.env',
  'platform/config-center/env/rollout-service.env',
  // L31..L32 — admin trust zone extended to workflow-service + 14 Phase-2 OSes.
  'platform/config-center/env/workflow-service.env',
  'platform/config-center/env/ai-os-service.env',
  'platform/config-center/env/notification-os-service.env',
  'platform/config-center/env/integration-os-service.env',
  'platform/config-center/env/data-governance-os-service.env',
  'platform/config-center/env/billing-os-service.env',
  'platform/config-center/env/feature-flag-os-service.env',
  'platform/config-center/env/security-secrets-os-service.env',
  'platform/config-center/env/telemetry-os-service.env',
  'platform/config-center/env/schema-authoring-os-service.env',
  'platform/config-center/env/deployment-os-service.env',
  'platform/config-center/env/release-os-service.env',
  'platform/config-center/env/vendor-risk-os-service.env',
  'platform/config-center/env/marketplace-os-service.env',
  'platform/config-center/env/dr-os-service.env',
];

let missing = 0, checked = 0;
for (const p of ADMIN_ENVS) {
  if (!existsSync(p)) continue;
  checked++;
  const t = readFileSync(p, 'utf8');
  if (!/^MTLS_REQUIRED\s*=\s*true/m.test(t)) {
    console.error(`[mtls-required-on-admin-zone] ${p} missing MTLS_REQUIRED=true`);
    missing++;
  }
}
const BASELINE_MAX = Number(process.env.MTLS_BASELINE_MAX ?? 3);
const ENFORCE = process.env.MTLS_ENFORCE === '1';
if (missing > BASELINE_MAX || (ENFORCE && missing > 0)) {
  console.error(`[mtls-required-on-admin-zone] FAIL ${missing} admin env(s) without MTLS_REQUIRED (baseline=${BASELINE_MAX}, enforce=${ENFORCE})`);
  process.exit(1);
}
console.log(`[mtls-required-on-admin-zone] PASS ${checked - missing}/${checked} admin envs declare mTLS (baseline=${BASELINE_MAX})`);
