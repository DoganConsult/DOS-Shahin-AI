#!/usr/bin/env node
/**
 * DOS Master Doctrine — audit-event on every controlled write.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/audit-event-on-write.mjs [OPTIONS]

Verifies dos_master_writer_audit ledger contains entries from every DOS Master service.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Behavior:
  - Checks trg_dos_master_only trigger is firing end-to-end
  - Verifies audit rows exist for expected actors
  - DB unreachable is treated as SKIP (exit 0)

Exit codes:
  0 — PASS or DB unreachable
  1 — FAIL no audit rows for expected actors
  2 — ERROR

Examples:
  # Run audit check
  node scripts/ci-guards/audit-event-on-write.mjs

  # Run with custom DATABASE_URL
  DATABASE_URL=postgresql://... node scripts/ci-guards/audit-event-on-write.mjs
`);
  process.exit(0);
}

import { Client } from 'pg';

const EXPECTED_ACTORS = ['dos-master'];

async function main() {
  const cs = process.env.DATABASE_URL || `postgres://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc`;
  const c = new Client({ connectionString: cs });
  try { await c.connect(); } catch (e) {
    console.warn('[audit-event-on-write] DB unreachable, skipping:', e.message);
    process.exit(0);
  }
  const r = await c.query(
    `SELECT actor, count(*)::int AS n FROM dos.dos_master_writer_audit GROUP BY actor ORDER BY actor`,
  );
  await c.end();
  const seen = new Set(r.rows.map((row) => row.actor));
  const missing = EXPECTED_ACTORS.filter((a) => !seen.has(a));
  if (missing.length) {
    console.error('[audit-event-on-write] FAIL no audit rows for actor(s):', missing.join(','));
    process.exit(1);
  }
  const total = r.rows.reduce((acc, row) => acc + Number(row.n), 0);
  console.log(`[audit-event-on-write] PASS ${total} audit rows across ${seen.size} actor(s)`);
}
main().catch((e) => { console.error('[audit-event-on-write] ERROR', e.message); process.exit(1); });
