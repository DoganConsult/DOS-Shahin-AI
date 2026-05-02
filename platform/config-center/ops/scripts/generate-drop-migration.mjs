#!/usr/bin/env node
// ============================================================================
// generate-drop-migration.mjs
// W1.6 — Generates ops/migrations/tenant/128_drop_scaffolded_stubs.sql
// deterministically from ops/reports/scaffold-triage.csv.
//
// Workflow (enterprise-grade):
//   1. ops/scripts/audit-scaffolded-tables.mjs         (produces CSV)
//   2. ops/scripts/generate-drop-migration.mjs         (this file, emits SQL)
//   3. Review diff and the CSV → commit both together  (git-enforced audit)
//   4. ops/scripts/snapshot-before-drop.sh runs first   (pre-flight dump)
//   5. run-tenant-migrations.sh applies 128_*           (DROP + RESERVE)
//   6. ops/scripts/verify-no-dead-refs.mjs on CI        (regression gate)
//
// The migration embeds every table name classified as DROP or RESERVE.
// No runtime CSV lookup — the SQL is the auditable artefact.
// ============================================================================

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const CSV_PATH = resolve(REPO_ROOT, 'ops', 'reports', 'scaffold-triage.csv');
const OUTPUT_PATH = resolve(
  REPO_ROOT,
  'ops',
  'migrations',
  'tenant',
  '128_drop_scaffolded_stubs.sql',
);

function parseCsv(raw) {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines.shift().split(',');
  return lines.map((line) => {
    // Minimal CSV parser that tolerates quoted fields with commas.
    const fields = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    const row = {};
    header.forEach((key, idx) => {
      row[key.trim()] = fields[idx] ?? '';
    });
    return row;
  });
}

function isValidSqlIdent(name) {
  return /^[a-z_][a-z0-9_]{0,62}$/i.test(name);
}

async function main() {
  if (!existsSync(CSV_PATH)) {
    console.error(`ERROR: ${CSV_PATH} not found. Run audit-scaffolded-tables.mjs first.`);
    process.exit(1);
  }
  const raw = await readFile(CSV_PATH, 'utf8');
  const rows = parseCsv(raw);

  const drops = [];
  const reserves = [];

  for (const r of rows) {
    const table = r.table;
    if (!table || !isValidSqlIdent(table)) {
      console.error(`WARN: skipping invalid identifier: ${JSON.stringify(table)}`);
      continue;
    }
    const module = r.module || 'central';
    if (r.classification === 'DROP') {
      drops.push({ module, table, rationale: r.rationale, source: r.source_file });
    } else if (r.classification === 'RESERVE') {
      reserves.push({ module, table, rationale: r.rationale, source: r.source_file });
    }
  }

  const now = new Date().toISOString();

  const dropEntries = drops
    .map((d) => `    -- ${d.module}: ${d.rationale} (from ${d.source})\n    '${d.table}'`)
    .join(',\n');

  const reserveEntries = reserves
    .map(
      (r) =>
        `    -- ${r.module}: ${r.rationale} (from ${r.source})\n    ROW('${r.table}', '${r.module}')::record`,
    )
    .join(',\n');

  const sql = `-- ============================================================================
-- 128_drop_scaffolded_stubs.sql
-- W1.6 — GENERATED FILE. Do not hand-edit.
--
-- Produced by ops/scripts/generate-drop-migration.mjs from
-- ops/reports/scaffold-triage.csv at ${now}.
-- Workflow:
--   1. audit-scaffolded-tables.mjs  → scaffold-triage.csv
--   2. generate-drop-migration.mjs  → this file
--   3. review CSV + SQL diff, commit both
--   4. snapshot-before-drop.sh runs pre-flight via run-tenant-migrations.sh
--   5. run-tenant-migrations.sh applies 128_*
--   6. verify-no-dead-refs.mjs gates CI regression
--
-- DROP count   : ${drops.length}
-- RESERVE count: ${reserves.length}
--
-- Safety:
--   - All DROP statements wrapped in DROP TABLE IF EXISTS ... CASCADE.
--   - RESERVE renames tables to _reserved_<module>_<table>, preserving rows
--     and RLS so accidental orphans stay tenant-isolated.
--   - snapshot-before-drop.sh MUST have produced a verified pg_dump before
--     this migration is applied to production. run-tenant-migrations.sh
--     refuses to proceed if the snapshot receipt is absent.
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
  reserve_row RECORD;
  drop_tables TEXT[] := ARRAY[
${dropEntries || "    -- (no tables classified DROP)"}
  ];
BEGIN
  FOREACH tbl IN ARRAY drop_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = tbl
    ) THEN
      EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', tbl);
      RAISE NOTICE 'Dropped scaffold stub: %', tbl;
    END IF;
  END LOOP;

  FOR reserve_row IN
    SELECT * FROM (VALUES
${reserveEntries || "      (NULL::text, NULL::text) -- placeholder"}
    ) AS r(table_name, module_name)
    WHERE r.table_name IS NOT NULL
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = reserve_row.table_name
    ) THEN
      -- Ensure tenant_id exists and is NOT NULL so RESERVE tables conform
      -- to tenancy invariants even while dormant.
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64)',
        reserve_row.table_name
      );
      EXECUTE format(
        'UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL',
        reserve_row.table_name,
        (SELECT tenant_id FROM dos.tenants WHERE schema_name = current_schema() LIMIT 1)
      );

      -- Rename to _reserved_<module>_<name> so the identifier frees up while
      -- preserving the row data under a stable, searchable name.
      EXECUTE format(
        'ALTER TABLE %I RENAME TO %I',
        reserve_row.table_name,
        format('_reserved_%s_%s', reserve_row.module_name, reserve_row.table_name)
      );
      RAISE NOTICE 'Reserved scaffold stub: %.% → _reserved_%_%',
        reserve_row.module_name, reserve_row.table_name,
        reserve_row.module_name, reserve_row.table_name;
    END IF;
  END LOOP;
END;
$$;
`;

  await writeFile(OUTPUT_PATH, sql);
  console.error(`Wrote ${OUTPUT_PATH}`);
  console.error(`  DROP   : ${drops.length}`);
  console.error(`  RESERVE: ${reserves.length}`);
}

main().catch((err) => {
  console.error('generate-drop-migration failed:', err);
  process.exit(1);
});
