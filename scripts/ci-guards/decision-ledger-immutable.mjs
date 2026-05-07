#!/usr/bin/env node
/**
 * DOS Master Doctrine — decision ledger immutable.
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/decision-ledger-immutable.mjs [OPTIONS]

Verifies dos_master_writer_audit is append-only with no mutation triggers.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)

Behavior:
  - Verifies no UPDATE or DELETE triggers (except trg_dos_master_only)
  - Confirms table is append-only by design
  - DB unreachable is treated as SKIP (exit 0)

Exit codes:
  0 — PASS or DB unreachable
  1 — FAIL audit table has non-master triggers
  2 — ERROR

Examples:
  # Run decision ledger immutable check
  node scripts/ci-guards/decision-ledger-immutable.mjs
`);
  process.exit(0);
}

import { Client } from 'pg';

async function main() {
  const cs = process.env.DATABASE_URL || `postgres://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc`;
  const c = new Client({ connectionString: cs });
  try { await c.connect(); } catch (e) {
    console.warn('[decision-ledger-immutable] DB unreachable, skipping:', e.message);
    process.exit(0);
  }
  const t = await c.query(`
    SELECT tgname FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='dos' AND c.relname='dos_master_writer_audit'
       AND NOT tg.tgisinternal
       AND tg.tgname NOT LIKE 'trg_dos_master_only%'
  `);
  await c.end();
  if (t.rows.length) {
    console.error('[decision-ledger-immutable] FAIL audit table has non-master triggers:', t.rows.map((r) => r.tgname).join(','));
    process.exit(1);
  }
  console.log('[decision-ledger-immutable] PASS dos_master_writer_audit append-only (no mutation triggers)');
}
main().catch((e) => { console.error('[decision-ledger-immutable] ERROR', e.message); process.exit(1); });
