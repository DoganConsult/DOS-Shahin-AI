#!/usr/bin/env tsx
/**
 * Validate previously-NOT-VALID foreign keys.
 *
 * NOT VALID FKs are cheap to add (no full-table scan, no row lock for
 * existing data) but Postgres won't enforce them on new writes until
 * they're VALIDATEd. This script runs VALIDATE CONSTRAINT for every FK
 * named `fk_<table>_<column>` in a target schema.
 *
 * Schedule it for low-traffic windows. Each VALIDATE acquires a
 * SHARE UPDATE EXCLUSIVE lock and scans the whole table — bounded
 * but not free.
 *
 * Usage:
 *   tsx ops/normalization/scripts/fk-validate.ts --schema tenant_acme [--apply]
 *   tsx ops/normalization/scripts/fk-validate.ts --schema public --pattern 'fk_%' [--apply]
 */

import { getPool, safeQuery } from '@dos/db';

function arg(flag: string, def?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

async function main(): Promise<void> {
  const schema = arg('--schema');
  const pattern = arg('--pattern', 'fk_%')!;
  const apply = process.argv.includes('--apply');
  if (!schema) { console.error('--schema required'); process.exit(2); }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) { console.error('unsafe schema name'); process.exit(2); }

  const r = await safeQuery<{ table_name: string; constraint_name: string }>(
    `SELECT tc.table_name, tc.constraint_name
       FROM information_schema.table_constraints tc
       JOIN pg_constraint pc
         ON pc.conname = tc.constraint_name
       JOIN pg_namespace ns
         ON ns.oid = pc.connamespace AND ns.nspname = tc.table_schema
      WHERE tc.table_schema = $1
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_name LIKE $2
        AND pc.convalidated = false
      ORDER BY tc.table_name, tc.constraint_name`,
    [schema, pattern],
  );
  console.error(`fk-validate: ${r.rows.length} unvalidated FKs in ${schema} (pattern=${pattern})`);
  if (r.rows.length === 0) { await getPool().end(); return; }
  for (const row of r.rows) console.error(`  - ${row.table_name}.${row.constraint_name}`);
  if (!apply) { console.error('dry-run (pass --apply to execute)'); await getPool().end(); return; }

  let ok = 0; let fail = 0;
  for (const row of r.rows) {
    try {
      const t0 = Date.now();
      await safeQuery(`ALTER TABLE "${schema}"."${row.table_name}" VALIDATE CONSTRAINT "${row.constraint_name}"`);
      console.error(`  validated ${row.constraint_name} in ${Date.now() - t0}ms`);
      ok++;
    } catch (err) {
      console.error(`  FAILED ${row.constraint_name}: ${(err as Error).message}`);
      fail++;
    }
  }
  console.error(`fk-validate: ok=${ok} failed=${fail}`);
  await getPool().end();
  if (fail > 0) process.exit(1);
}

main().catch((err) => { console.error('fk-validate: fatal', err); process.exit(1); });
