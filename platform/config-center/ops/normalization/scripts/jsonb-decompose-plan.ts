#!/usr/bin/env tsx
/**
 * JSONB decomposition planner (Phase 4).
 *
 * Two modes:
 *   1. catalog-only (default): scan catalog.yml for `jsonb-column:*` smells,
 *      apply heuristic classification (keep / promote-to-columns / promote-
 *      to-child), and emit a decision matrix.
 *   2. --sample <schema>: also connect and SELECT * FROM <schema>.<table>
 *      LIMIT N to inspect actual key shapes per JSONB column. Stable shapes
 *      with low cardinality => candidates for promotion.
 *
 * Heuristic defaults (catalog-only mode):
 *   - column name in {settings, metadata, config, default_config, layout,
 *     definition, default_filters, dimensions, thresholds,
 *     zone_definitions, modules, dashboard_widgets, levels, tags,
 *     entries, roles, sectors}
 *       => KEEP-JSONB (legitimate document storage)
 *   - column name ends in _data, contains 'state' or 'snapshot'
 *       => KEEP-JSONB (event-sourced payload)
 *   - column has the suffix `_audit`, `_log`
 *       => KEEP-JSONB
 *   - everything else
 *       => REVIEW (operator decides; the script defaults to REVIEW so we
 *          don't auto-promote anything)
 *
 * Output:
 *   ops/normalization/proposals/jsonb-decompose/decisions.md
 *   ops/normalization/proposals/jsonb-decompose/<table>-<column>.sample.json
 *     (only when --sample is used)
 *
 * Usage:
 *   tsx ops/normalization/scripts/jsonb-decompose-plan.ts
 *   tsx ops/normalization/scripts/jsonb-decompose-plan.ts --sample tenant_acme --limit 200
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();
const CATALOG_PATH = join(REPO_ROOT, 'ops/normalization/catalog.yml');
const OUT_DIR = join(REPO_ROOT, 'ops/normalization/proposals/jsonb-decompose');

if (!existsSync(CATALOG_PATH)) {
  console.error('catalog.yml not found. Run catalog-build.ts first.');
  process.exit(2);
}

interface JsonbCol { table: string; column: string; layer: string }

const KEEP_NAMES = new Set([
  'settings', 'metadata', 'config', 'default_config', 'layout', 'definition',
  'default_filters', 'dimensions', 'thresholds', 'zone_definitions', 'modules',
  'dashboard_widgets', 'levels', 'tags', 'entries', 'roles', 'sectors',
]);
const KEEP_SUFFIXES = ['_data', '_audit', '_log', '_state', '_snapshot', '_payload'];

function classify(col: string): 'KEEP' | 'REVIEW' {
  if (KEEP_NAMES.has(col)) return 'KEEP';
  for (const sfx of KEEP_SUFFIXES) if (col.endsWith(sfx) || col.includes(sfx.replace(/^_/, ''))) return 'KEEP';
  return 'REVIEW';
}

function parseJsonbColumns(): JsonbCol[] {
  const text = readFileSync(CATALOG_PATH, 'utf-8');
  const rows: JsonbCol[] = [];
  let curName = '';
  let curLayer = 'unknown';
  for (const line of text.split('\n')) {
    const m = line.match(/^  - name:\s*(.+)$/);
    if (m) { curName = m[1].trim(); curLayer = 'unknown'; continue; }
    const lm = line.match(/^    layer:\s*(\S+)/);
    if (lm) curLayer = lm[1];
    const sm = line.match(/^      - jsonb-column:(.+)$/);
    if (sm && curName) rows.push({ table: curName, column: sm[1].trim(), layer: curLayer });
  }
  return rows;
}

interface SampleStats {
  rowsSampled: number;
  nullRows: number;
  nonNullRows: number;
  keyFrequency: Array<{ key: string; count: number; pct: number }>;
  topKeyOverlapPct: number; // % of sampled rows whose top-level keys match the dominant shape
}

async function sampleColumn(
  schema: string,
  table: string,
  column: string,
  limit: number,
): Promise<SampleStats | null> {
  const { getPool } = await import('@dos/db');
  const pool = getPool();
  const safeIdent = (id: string): string => {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) throw new Error(`unsafe identifier: ${id}`);
    return id;
  };
  const safeSchema = (s: string): string => {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)) throw new Error(`unsafe schema: ${s}`);
    return s;
  };
  try {
    const res = await pool.query<{ payload: Record<string, unknown> | null }>(
      `SELECT "${safeIdent(column)}" AS payload FROM "${safeSchema(schema)}"."${safeIdent(table)}" LIMIT $1`,
      [limit],
    );
    const rowsSampled = res.rows.length;
    const nonNull = res.rows.filter((r) => r.payload && typeof r.payload === 'object');
    const keyCounts = new Map<string, number>();
    const shapeFreq = new Map<string, number>();
    for (const r of nonNull) {
      const keys = Object.keys(r.payload as Record<string, unknown>).sort();
      const shape = keys.join(',');
      shapeFreq.set(shape, (shapeFreq.get(shape) ?? 0) + 1);
      for (const k of keys) keyCounts.set(k, (keyCounts.get(k) ?? 0) + 1);
    }
    const dominant = [...shapeFreq.entries()].sort((a, b) => b[1] - a[1])[0];
    const dominantCount = dominant ? dominant[1] : 0;
    return {
      rowsSampled,
      nullRows: rowsSampled - nonNull.length,
      nonNullRows: nonNull.length,
      keyFrequency: [...keyCounts.entries()]
        .map(([key, count]) => ({ key, count, pct: nonNull.length > 0 ? Math.round((count / nonNull.length) * 100) : 0 }))
        .sort((a, b) => b.count - a.count),
      topKeyOverlapPct: nonNull.length > 0 ? Math.round((dominantCount / nonNull.length) * 100) : 0,
    };
  } catch (err) {
    console.error(`  sample failed for ${schema}.${table}.${column}:`, (err as Error).message);
    return null;
  }
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const sampleIdx = process.argv.indexOf('--sample');
  const sampleSchema = sampleIdx > 0 ? process.argv[sampleIdx + 1] : null;
  const limitIdx = process.argv.indexOf('--limit');
  const sampleLimit = limitIdx > 0 ? parseInt(process.argv[limitIdx + 1], 10) : 200;

  const cols = parseJsonbColumns();
  console.error(`jsonb-decompose-plan: ${cols.length} JSONB columns detected`);

  const md: string[] = [];
  md.push('# JSONB Decomposition — Decision Matrix');
  md.push(`Generated: ${new Date().toISOString()}`);
  md.push(`Total JSONB columns: **${cols.length}**`);
  if (sampleSchema) md.push(`Live samples: **${sampleSchema}** (limit ${sampleLimit})`);
  md.push('');
  md.push('Default rule: REVIEW unless the column name signals legitimate document storage.');
  md.push('Decision values: KEEP (stay JSONB) | PROMOTE-COLS (extract to typed columns) | PROMOTE-CHILD (extract to child table) | REVIEW (need more info)');
  md.push('');
  md.push('| Table | Column | Layer | Heuristic | Sampled rows | Top-shape overlap | Decision | Notes |');
  md.push('|---|---|---|---|---|---|---|---|');

  for (const c of cols.sort((a, b) => a.table.localeCompare(b.table) || a.column.localeCompare(b.column))) {
    const heur = classify(c.column);
    let sampled: SampleStats | null = null;
    if (sampleSchema) {
      sampled = await sampleColumn(sampleSchema, c.table, c.column, sampleLimit);
      if (sampled) {
        writeFileSync(
          join(OUT_DIR, `${c.table}-${c.column}.sample.json`),
          JSON.stringify({ schema: sampleSchema, ...sampled }, null, 2),
        );
      }
    }
    const rowsCell = sampled ? `${sampled.rowsSampled} (${sampled.nonNullRows} non-null)` : '_(catalog only)_';
    const overlapCell = sampled ? `${sampled.topKeyOverlapPct}%` : '—';
    md.push(`| ${c.table} | ${c.column} | ${c.layer} | ${heur} | ${rowsCell} | ${overlapCell} | ${heur === 'KEEP' ? 'KEEP' : ''} |  |`);
  }

  writeFileSync(join(OUT_DIR, 'decisions.md'), md.join('\n') + '\n');
  console.error(`Wrote: ${OUT_DIR}/decisions.md`);

  if (sampleSchema) {
    const { getPool } = await import('@dos/db');
    await getPool().end();
  }
}

main().catch((err) => {
  console.error('jsonb-decompose-plan: fatal', err);
  process.exit(1);
});
