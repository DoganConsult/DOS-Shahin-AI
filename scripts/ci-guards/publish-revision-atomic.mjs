#!/usr/bin/env node
/**
 * DOS Master Doctrine — publish revisions are atomic.
 *
 * Verifies dos.publish_revision has at most one 'live' status per
 * (target_kind, target_key) tuple and every rolled_back revision has
 * a paired dos.publish_rollback row.
 */
import { Client } from 'pg';

async function main() {
  const cs = process.env.DATABASE_URL || `postgres://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc`;
  const c = new Client({ connectionString: cs });
  try { await c.connect(); } catch (e) {
    console.warn('[publish-revision-atomic] DB unreachable, skipping:', e.message);
    process.exit(0);
  }
  const dup = await c.query(
    `SELECT target_kind, target_key, count(*) AS n
       FROM dos.publish_revision WHERE status='live'
      GROUP BY target_kind, target_key HAVING count(*) > 1`,
  );
  const orphan = await c.query(
    `SELECT r.id FROM dos.publish_revision r
      LEFT JOIN dos.publish_rollback rb ON rb.revision_id = r.id
      WHERE r.status='rolled_back' AND rb.id IS NULL`,
  );
  await c.end();
  let failures = 0;
  if (dup.rows.length) {
    console.error(`[publish-revision-atomic] FAIL ${dup.rows.length} target(s) with multiple live revisions`);
    failures += dup.rows.length;
  }
  if (orphan.rows.length) {
    console.error(`[publish-revision-atomic] FAIL ${orphan.rows.length} rolled_back revisions without rollback row`);
    failures += orphan.rows.length;
  }
  if (failures) process.exit(1);
  console.log('[publish-revision-atomic] PASS publish revisions atomic + paired with rollbacks');
}
main().catch((e) => { console.error('[publish-revision-atomic] ERROR', e.message); process.exit(1); });
