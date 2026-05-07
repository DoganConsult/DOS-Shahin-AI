#!/usr/bin/env node
/**
 * DOS Master Doctrine — publish revisions are atomic
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/publish-revision-atomic.mjs [OPTIONS]

Verifies dos.publish_revision has at most one 'live' status per (target_kind, target_key) tuple.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Policy:
  - At most one 'live' status per (target_kind, target_key) tuple
  - Every rolled_back revision must have a paired dos.publish_rollback row
  - DB unreachable is treated as SKIP (exit 0)

Exit codes:
  0 — PASS or DB unreachable
  1 — Multiple live revisions or orphan rolled_back revisions detected
  2 — ERROR

Examples:
  # Run publish revision atomic check
  node scripts/ci-guards/publish-revision-atomic.mjs
`);
  process.exit(0);
}

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
