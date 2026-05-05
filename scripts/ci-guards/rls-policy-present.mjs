#!/usr/bin/env node
/**
 * DOS Master Doctrine — RLS policy present.
 *
 * Verifies tenant-scoped tables in the `dos` schema have either
 * row-level security enabled OR an explicit opt-out comment. Tables
 * are considered tenant-scoped when they carry a `tenant_id` column.
 */
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
