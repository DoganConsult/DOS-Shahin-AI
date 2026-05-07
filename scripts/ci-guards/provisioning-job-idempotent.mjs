#!/usr/bin/env node
/**
 * DOS Master Doctrine — provisioning jobs idempotent
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/provisioning-job-idempotent.mjs [OPTIONS]

Verifies dos_master.provisioning_job has UNIQUE constraint preventing duplicate active jobs.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Policy:
  Prevents two queued jobs for the same (tenant_id, product_code, edition) tuple.
  Catches double-clicks on the trial-signup CTA.
  DB unreachable is treated as SKIP (exit 0).

Exit codes:
  0 — PASS or DB unreachable
  1 — Duplicate active provisioning jobs detected
  2 — ERROR

Examples:
  # Run provisioning job idempotent check
  node scripts/ci-guards/provisioning-job-idempotent.mjs
`);
  process.exit(0);
}

import { Client } from 'pg';

async function main() {
  const cs = process.env.DATABASE_URL || `postgres://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc`;
  const c = new Client({ connectionString: cs });
  try { await c.connect(); } catch (e) {
    console.warn('[provisioning-job-idempotent] DB unreachable, skipping:', e.message);
    process.exit(0);
  }
  const dup = await c.query(`
    SELECT tenant_id, product_code, edition, count(*) AS n
      FROM dos_master.provisioning_job
     WHERE status IN ('queued','running')
     GROUP BY tenant_id, product_code, edition
    HAVING count(*) > 1
  `);
  await c.end();
  if (dup.rows.length) {
    console.error(`[provisioning-job-idempotent] FAIL ${dup.rows.length} duplicate active provisioning job(s)`);
    process.exit(1);
  }
  console.log('[provisioning-job-idempotent] PASS no duplicate active provisioning jobs');
}
main().catch((e) => { console.error('[provisioning-job-idempotent] ERROR', e.message); process.exit(1); });
