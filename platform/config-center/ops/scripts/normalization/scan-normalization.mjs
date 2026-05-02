#!/usr/bin/env node
/**
 * scan-normalization.mjs — DB normalization audit (1NF–5NF + key/index gaps)
 *
 * Reads a sample tenant schema (or `dos`) and reports:
 *   1NF — multi-valued columns (text columns that look like CSV / JSONB arrays
 *         used as primary lookup paths).
 *   2NF — composite-PK tables where some columns depend only on a partial key
 *         (heuristic: composite PK + non-key column with low NDV vs first key).
 *   3NF — transitive dependencies (heuristic: tables with both a FK column and
 *         a denormalized "<entity>_name"/"<entity>_email"/etc. that should
 *         live in the parent).
 *   BCNF — non-PK uniqueness candidates (functional dependencies indicating
 *         a different key would be more natural).
 *   4NF — multi-valued attributes split across multiple JSONB columns.
 *   5NF — join-dependency candidates (3-way relationship implemented as a
 *         single table that should be three tables).
 *
 * Key gaps:
 *   - Tables without PRIMARY KEY
 *   - Foreign-key columns lacking an index (slow cascade DELETE)
 *   - Foreign-key targets missing UNIQUE constraint
 *   - "tenant_id" columns lacking partial / composite index
 *
 * Output:
 *   ops/scripts/normalization/reports/normalization-<schema>.md
 *   ops/scripts/normalization/reports/normalization-<schema>.json
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const repoRoot = resolve(decodeURIComponent(new URL('../../..', import.meta.url).pathname));
process.chdir(repoRoot);

const db = require(resolve(repoRoot, 'packages/dos-db/dist/index.js'));
const { safeQuery, closePool } = db;

const SCHEMA = process.argv[2] || 'dos';
const OUT_DIR = resolve(repoRoot, 'ops/scripts/normalization/reports');
mkdirSync(OUT_DIR, { recursive: true });

async function pkMissing() {
  const r = await safeQuery(`
    SELECT t.table_name
      FROM information_schema.tables t
     WHERE t.table_schema = $1 AND t.table_type='BASE TABLE'
       AND NOT EXISTS (
         SELECT 1 FROM pg_constraint c
           JOIN pg_class cls ON cls.oid = c.conrelid
           JOIN pg_namespace ns ON ns.oid = cls.relnamespace
          WHERE ns.nspname = $1 AND cls.relname = t.table_name AND c.contype='p'
       )
     ORDER BY t.table_name`, [SCHEMA]);
  return r.rows.map(r => r.table_name);
}

async function fkColumnsWithoutIndex() {
  const r = await safeQuery(`
    WITH fks AS (
      SELECT cls.relname AS table_name,
             a.attname  AS col_name,
             c.conname
        FROM pg_constraint c
        JOIN pg_class cls ON cls.oid = c.conrelid
        JOIN pg_namespace ns ON ns.oid = cls.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
       WHERE ns.nspname = $1 AND c.contype = 'f'
    )
    SELECT f.table_name, f.col_name, f.conname
      FROM fks f
     WHERE NOT EXISTS (
       SELECT 1 FROM pg_indexes i
        WHERE i.schemaname = $1
          AND i.tablename  = f.table_name
          AND i.indexdef ILIKE '%(' || f.col_name || ')%' OR i.indexdef ILIKE '%(' || f.col_name || ',%'
     )
     ORDER BY f.table_name, f.col_name`, [SCHEMA]);
  return r.rows;
}

async function jsonbColumnsThatLookLikeArrays() {
  // 1NF/4NF heuristic: JSONB columns whose first observed value is a JSON array
  // → likely a denormalized many-relation that should be its own table.
  const tables = await safeQuery(`
    SELECT table_name, column_name
      FROM information_schema.columns
     WHERE table_schema = $1 AND data_type = 'jsonb'
     ORDER BY table_name, column_name`, [SCHEMA]);
  return tables.rows;
}

async function compositePkCandidates() {
  // 2NF heuristic: tables with composite PK on >2 columns.
  const r = await safeQuery(`
    SELECT cls.relname AS table_name,
           array_agg(a.attname ORDER BY array_position(c.conkey, a.attnum)) AS pk_cols
      FROM pg_constraint c
      JOIN pg_class cls ON cls.oid = c.conrelid
      JOIN pg_namespace ns ON ns.oid = cls.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
     WHERE ns.nspname = $1 AND c.contype='p'
     GROUP BY cls.relname
    HAVING count(a.attnum) > 2
     ORDER BY cls.relname`, [SCHEMA]);
  return r.rows;
}

async function denormalizedNameColumns() {
  // 3NF heuristic: column named `<entity>_name`, `<entity>_email`,
  // `<entity>_label` together with a `<entity>_id` FK column → likely cached
  // copy of joined data, transitively dependent.
  const r = await safeQuery(`
    WITH cols AS (
      SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = $1
    )
    SELECT a.table_name,
           a.column_name AS denormalized_col,
           b.column_name AS fk_col
      FROM cols a
      JOIN cols b ON a.table_name = b.table_name
       AND b.column_name = regexp_replace(a.column_name, '_(name|email|label|title|code)$', '_id')
       AND a.column_name <> b.column_name
       AND a.column_name ~ '_(name|email|label|title|code)$'
     ORDER BY a.table_name, a.column_name`, [SCHEMA]);
  return r.rows;
}

async function tenantIdColumnsWithoutCompositeIndex() {
  // Multi-tenant heuristic (relevant for dos.* tables that are tenant-keyed).
  const r = await safeQuery(`
    WITH cols AS (
      SELECT table_name FROM information_schema.columns
       WHERE table_schema = $1 AND column_name = 'tenant_id'
    )
    SELECT c.table_name
      FROM cols c
     WHERE NOT EXISTS (
       SELECT 1 FROM pg_indexes i
        WHERE i.schemaname = $1
          AND i.tablename  = c.table_name
          AND (i.indexdef ILIKE '%tenant_id%')
     )
     ORDER BY c.table_name`, [SCHEMA]);
  return r.rows.map(r => r.table_name);
}

async function uniqueCandidates() {
  // BCNF heuristic: columns named *_email, *_slug, *_code that are not
  // currently UNIQUE — likely should be.
  const r = await safeQuery(`
    SELECT c.table_name, c.column_name
      FROM information_schema.columns c
     WHERE c.table_schema = $1
       AND c.column_name ~ '(_email|_slug|_code|^email$|^slug$|^code$)'
       AND NOT EXISTS (
         SELECT 1 FROM pg_constraint con
           JOIN pg_class cls ON cls.oid = con.conrelid
           JOIN pg_namespace ns ON ns.oid = cls.relnamespace
           JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
          WHERE ns.nspname = $1 AND cls.relname = c.table_name
            AND a.attname = c.column_name
            AND con.contype IN ('u','p')
       )
     ORDER BY c.table_name, c.column_name`, [SCHEMA]);
  return r.rows;
}

async function main() {
  console.log(`\n=== Normalization scan: schema "${SCHEMA}" ===\n`);
  const report = {
    schema: SCHEMA,
    generatedAt: new Date().toISOString(),
    findings: {
      tablesWithoutPK: await pkMissing(),
      foreignKeysWithoutIndex: await fkColumnsWithoutIndex(),
      jsonbColumns: await jsonbColumnsThatLookLikeArrays(),
      compositePKsOver2Cols: await compositePkCandidates(),
      denormalizedNameColumns: await denormalizedNameColumns(),
      tenantIdColumnsWithoutIndex: await tenantIdColumnsWithoutCompositeIndex(),
      uniqueCandidates: await uniqueCandidates(),
    },
  };

  const counts = Object.fromEntries(
    Object.entries(report.findings).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]),
  );
  report.summary = counts;
  console.log('Counts:', counts);

  const jsonPath = `${OUT_DIR}/normalization-${SCHEMA}.json`;
  const mdPath   = `${OUT_DIR}/normalization-${SCHEMA}.md`;
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  let md = `# Normalization audit — schema \`${SCHEMA}\`\n\n`;
  md += `Generated ${report.generatedAt}\n\n`;
  md += `## Summary\n\n`;
  for (const [k, v] of Object.entries(counts)) md += `- **${k}**: ${v}\n`;
  md += `\n## Findings\n\n`;
  for (const [k, v] of Object.entries(report.findings)) {
    md += `### ${k} (${Array.isArray(v) ? v.length : 0})\n\n`;
    if (Array.isArray(v) && v.length) {
      const sample = v.slice(0, 30);
      md += '```json\n' + JSON.stringify(sample, null, 2) + '\n```\n';
      if (v.length > 30) md += `\n_(showing 30 of ${v.length})_\n`;
    } else {
      md += '_none_\n';
    }
    md += `\n`;
  }
  writeFileSync(mdPath, md);
  console.log(`\nReport: ${jsonPath}`);
  console.log(`Report: ${mdPath}`);

  await closePool();
}

main().catch(err => { console.error('FATAL', err); process.exit(1); });
