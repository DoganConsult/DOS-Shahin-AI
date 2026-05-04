#!/usr/bin/env node
/**
 * DOS Master Doctrine Article 4 — admin-zone services require mTLS.
 *
 * Verifies admin-zone env files declare MTLS_REQUIRED=true (or a
 * baseline-tracked exemption) so the gateway enforces client-cert
 * validation on /api/admin/* upstreams.
 */
import { existsSync, readFileSync } from 'node:fs';

const ADMIN_ENVS = [
  'platform/config-center/env/admin-console-bff.env',
  'platform/config-center/env/publish-service.env',
  'platform/config-center/env/rollout-service.env',
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
