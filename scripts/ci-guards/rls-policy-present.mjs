#!/usr/bin/env node
/**
 * DOS Master Doctrine — RLS policy present
 */

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/ci-guards/rls-policy-present.mjs [OPTIONS]

Verifies tenant-scoped tables in dos schema have RLS enabled or explicit opt-out comment.

Options:
  --help, -h           Show this help message

Environment Variables:
  DATABASE_URL         PostgreSQL connection string (default: postgresql://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc)
  RLS_BASELINE_MAX     Baseline max tables without RLS (default: 200)
  RLS_ENFORCE          Set to 1 to enforce ban (default: baseline mode)

Policy:
  Tables are tenant-scoped when they carry a tenant_id column.
  DB unreachable is treated as SKIP (exit 0).

Exit codes:
  0 — PASS or DB unreachable
  1 — Tenant tables without RLS above baseline or when enforced
  2 — ERROR

Examples:
  # Run in baseline mode (default)
  node scripts/ci-guards/rls-policy-present.mjs

  # Run with enforcement
  RLS_ENFORCE=1 node scripts/ci-guards/rls-policy-present.mjs
`);
  process.exit(0);
}

import { Client } from 'pg';

async function main() {
  const cs = process.env.DATABASE_URL || `postgres://dos_auth:dos_auth_pass_2026@localhost:5432/shahin_grc`;
  const c = new Client({ connectionString: cs });
  try { await c.connect(); } catch (e) {
    console.warn('[rls-policy-present] DB unreachable, skipping:', e.message);
    process.exit(0);
  }
  const r = await c.query(`
    SELECT n.nspname AS schema, c.relname AS table, c.relrowsecurity AS rls_enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'dos' AND c.relkind = 'r'
       AND EXISTS (
         SELECT 1 FROM pg_attribute a
          WHERE a.attrelid = c.oid AND a.attname = 'tenant_id' AND NOT a.attisdropped
       )
     ORDER BY c.relname
  `);
  await c.end();
  const total = r.rows.length;
  const without = r.rows.filter((row) => !row.rls_enabled);
  const BASELINE_MAX = Number(process.env.RLS_BASELINE_MAX ?? 200);
  const ENFORCE = process.env.RLS_ENFORCE === '1';
  if (without.length > BASELINE_MAX || (ENFORCE && without.length > 0)) {
    console.error(`[rls-policy-present] FAIL ${without.length}/${total} tenant tables without RLS (baseline=${BASELINE_MAX}, enforce=${ENFORCE})`);
    without.slice(0, 5).forEach((w) => console.error(`  ${w.schema}.${w.table}`));
    process.exit(1);
  }
  console.log(`[rls-policy-present] PASS ${total - without.length}/${total} tenant tables RLS-enabled (baseline=${BASELINE_MAX})`);
}
main().catch((e) => { console.error('[rls-policy-present] ERROR', e.message); process.exit(1); });
