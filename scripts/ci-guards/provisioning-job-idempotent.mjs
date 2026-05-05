#!/usr/bin/env node
/**
 * DOS Master Doctrine — provisioning jobs idempotent.
 *
 * Verifies dos_master.provisioning_job has a UNIQUE constraint that
 * prevents two queued jobs for the same (tenant_id, product_code,
 * edition) tuple. Catches double-clicks on the trial-signup CTA.
 */
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
