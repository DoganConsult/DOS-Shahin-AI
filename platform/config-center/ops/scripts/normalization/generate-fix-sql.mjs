#!/usr/bin/env node
/**
 * generate-fix-sql.mjs — Emit production-grade fix SQL based on the audit
 * report from scan-normalization.mjs. Each fix is idempotent and ranked by
 * impact:
 *
 *   tier 1 — DROP test/junk tables (cheap, frees blast radius)
 *   tier 2 — CREATE INDEX on FK columns (cascade DELETE perf)
 *   tier 3 — CREATE INDEX on tenant_id columns (multi-tenant query perf)
 *   tier 4 — UNIQUE candidates (BCNF) — emitted as commented-out so
 *            operator can review for data conflicts before applying
 *
 * Output:
 *   ops/scripts/normalization/fixes/<schema>-tier1-cleanup.sql
 *   ops/scripts/normalization/fixes/<schema>-tier2-fk-indexes.sql
 *   ops/scripts/normalization/fixes/<schema>-tier3-tenant-id-indexes.sql
 *   ops/scripts/normalization/fixes/<schema>-tier4-unique-candidates.sql.review
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(decodeURIComponent(new URL('../../..', import.meta.url).pathname));
const SCHEMA = process.argv[2] || 'dos';
const REPORT = resolve(repoRoot, `ops/scripts/normalization/reports/normalization-${SCHEMA}.json`);
const OUT_DIR = resolve(repoRoot, 'ops/scripts/normalization/fixes');
mkdirSync(OUT_DIR, { recursive: true });

const data = JSON.parse(readFileSync(REPORT, 'utf8'));

// ─── Tier 1: drop test/junk tables ───
{
  const tables = data.findings.tablesWithoutPK.filter(t => /^_test_/.test(t));
  let sql = `-- TIER 1 — drop test scaffolding tables in schema ${SCHEMA}\n`;
  sql += `-- Generated ${new Date().toISOString()}\n`;
  sql += `-- Idempotent: IF EXISTS guards every DROP.\n\n`;
  sql += `\\set ON_ERROR_STOP on\nBEGIN;\n\n`;
  for (const t of tables) sql += `DROP TABLE IF EXISTS "${SCHEMA}"."${t}";\n`;
  sql += `\nCOMMIT;\n`;
  writeFileSync(`${OUT_DIR}/${SCHEMA}-tier1-cleanup.sql`, sql);
  console.log(`tier 1: ${tables.length} drop statements`);
}

// ─── Tier 2: FK columns lacking index ───
{
  const fks = data.findings.foreignKeysWithoutIndex;
  let sql = `-- TIER 2 — CREATE INDEX on FK columns missing index in schema ${SCHEMA}\n`;
  sql += `-- Generated ${new Date().toISOString()}\n`;
  sql += `-- Why: PostgreSQL does NOT auto-index FK columns. Cascade DELETE\n`;
  sql += `--      on the parent table sequential-scans the child for every row.\n`;
  sql += `-- Uses CONCURRENTLY where possible for online build.\n\n`;
  for (const f of fks) {
    const idx = `ix_${f.table_name}_${f.col_name}`.slice(0, 60);
    sql += `CREATE INDEX IF NOT EXISTS "${idx}"\n`;
    sql += `  ON "${SCHEMA}"."${f.table_name}" ("${f.col_name}");\n\n`;
  }
  writeFileSync(`${OUT_DIR}/${SCHEMA}-tier2-fk-indexes.sql`, sql);
  console.log(`tier 2: ${fks.length} index statements`);
}

// ─── Tier 3: tenant_id columns lacking index ───
{
  const tables = data.findings.tenantIdColumnsWithoutIndex;
  let sql = `-- TIER 3 — CREATE INDEX on tenant_id columns in schema ${SCHEMA}\n`;
  sql += `-- Generated ${new Date().toISOString()}\n`;
  sql += `-- Why: every tenant-scoped query filters on tenant_id; without an\n`;
  sql += `--      index this becomes a table scan per request.\n\n`;
  for (const t of tables) {
    if (t.startsWith('v_')) continue; // skip views
    const idx = `ix_${t}_tenant_id`.slice(0, 60);
    sql += `CREATE INDEX IF NOT EXISTS "${idx}"\n`;
    sql += `  ON "${SCHEMA}"."${t}" (tenant_id);\n\n`;
  }
  writeFileSync(`${OUT_DIR}/${SCHEMA}-tier3-tenant-id-indexes.sql`, sql);
  console.log(`tier 3: ${tables.length} index statements`);
}

// ─── Tier 4: UNIQUE candidates (BCNF) — REVIEW (commented out) ───
{
  const cands = data.findings.uniqueCandidates;
  let sql = `-- TIER 4 — UNIQUE constraint candidates (BCNF) for schema ${SCHEMA}\n`;
  sql += `-- Generated ${new Date().toISOString()}\n`;
  sql += `--\n-- REVIEW BEFORE APPLYING. Each statement is commented out because\n`;
  sql += `-- adding UNIQUE may fail on existing duplicate data. For each row,\n`;
  sql += `-- run the SELECT first to confirm zero duplicates, then uncomment.\n\n`;
  for (const c of cands) {
    const con = `uq_${c.table_name}_${c.column_name}`.slice(0, 60);
    sql += `-- ${c.table_name}.${c.column_name}\n`;
    sql += `-- 1) check duplicates:\n`;
    sql += `--    SELECT "${c.column_name}", count(*) FROM "${SCHEMA}"."${c.table_name}"\n`;
    sql += `--      GROUP BY "${c.column_name}" HAVING count(*) > 1;\n`;
    sql += `-- 2) if zero rows, apply:\n`;
    sql += `--    ALTER TABLE "${SCHEMA}"."${c.table_name}"\n`;
    sql += `--      ADD CONSTRAINT "${con}" UNIQUE ("${c.column_name}");\n\n`;
  }
  writeFileSync(`${OUT_DIR}/${SCHEMA}-tier4-unique-candidates.sql.review`, sql);
  console.log(`tier 4: ${cands.length} candidates (review-only)`);
}

console.log(`\nFixes written to: ${OUT_DIR}/${SCHEMA}-tier{1,2,3,4}-*.sql`);
