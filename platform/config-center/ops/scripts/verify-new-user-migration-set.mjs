#!/usr/bin/env node
/**
 * Phase 1 companion (no DATABASE_URL): verifies the new-user vertical slice
 * SQL migration UP files exist under ops/migrations/ and each has a runner-compatible
 * companion *_down.sql per migration/migration-runner.ts resolveDownFilename().
 *
 * Prerequisite migrations (referenced by comments in 0003 / 0010 series):
 *   052_platform_outbox.sql — base outbox table
 *   054_platform_outbox_dead_letter.sql — archive + DLQ columns
 *   055_user_bootstrap_state_view.sql — v_user_bootstrap_state body
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MIG_DIR = join(__dirname, '..', 'migrations');

/** @param {string} upFilename */
function resolveDownFilename(upFilename) {
  if (upFilename.endsWith('_up.sql')) {
    return upFilename.replace(/_up\.sql$/, '_down.sql');
  }
  return upFilename.replace(/\.sql$/, '_down.sql');
}

const NEW_USER_SLICE_UPS = [
  '20260418_0001_users_email_ci_uk.sql',
  '20260418_0002_tenants_orgname_norm_uk.sql',
  '20260418_0003_platform_outbox_index.sql',
  '20260418_0004_refresh_tokens.sql',
  '20260418_0005_users_email_verified_index.sql',
  '20260418_0006_email_verification_tokens_jti.sql',
  '20260418_0007_provisioning_jobs_worker.sql',
  '20260418_0008_provisioning_step_runs.sql',
  '20260418_0009_tenants_lifecycle_state.sql',
  '20260418_0010_bootstrap_state_view_comment.sql',
];

const PREREQ_UPS = [
  '052_platform_outbox.sql',
  '054_platform_outbox_dead_letter.sql',
  '055_user_bootstrap_state_view.sql',
];

let failed = false;
for (const up of [...PREREQ_UPS, ...NEW_USER_SLICE_UPS]) {
  const upPath = join(MIG_DIR, up);
  if (!existsSync(upPath)) {
    console.error(`MISSING: ${upPath}`);
    failed = true;
    continue;
  }
  const down = resolveDownFilename(up);
  const downPath = join(MIG_DIR, down);
  if (!existsSync(downPath)) {
    console.error(`MISSING DOWN: ${downPath} (for ${up})`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  `OK: ${NEW_USER_SLICE_UPS.length} new-user slice migrations + ${PREREQ_UPS.length} prereqs in ${MIG_DIR} each have UP+DOWN.`,
);
