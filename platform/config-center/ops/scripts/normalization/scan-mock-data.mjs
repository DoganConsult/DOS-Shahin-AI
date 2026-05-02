#!/usr/bin/env node
/**
 * scan-mock-data.mjs — Find tables that contain mock/stub/seed data and
 * must be replaced with real data before production cutover.
 *
 * Heuristics per table:
 *   A) row_count = 0                       → empty stub (must be seeded or DROPPED)
 *   B) row_count > 0 AND all rows match    → "demo only" (test/lorem/example)
 *      a `test|demo|mock|sample|example|lorem|foo|bar|baz|placeholder|tbd`
 *      pattern in any text column
 *   C) row_count > 0 AND ≥1 critical text column is 100% NULL or '' → stub data
 *   D) row_count = 1 AND name contains 'sample'/'demo'/'default' → singleton seed
 *
 * Usage:
 *   DATABASE_URL=... node ops/scripts/normalization/scan-mock-data.mjs <schema>
 *
 * Output:
 *   ops/scripts/normalization/reports/mock-data-<schema>.{md,json}
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

const MOCK_PATTERNS = [
  '\\mtest\\M', '\\mdemo\\M', '\\mmock\\M', '\\msample\\M', '\\mexample\\M',
  '\\mlorem\\M', '\\mipsum\\M', '\\mfoo\\M', '\\mbar\\M', '\\mbaz\\M',
  '\\mplaceholder\\M', '\\mtbd\\M', '\\mtodo\\M', '\\mxxxx?\\M', '\\mfake\\M',
];
const REGEX = `(${MOCK_PATTERNS.join('|')})`;

async function listTables() {
  const r = await safeQuery(`
    SELECT table_name
      FROM information_schema.tables
     WHERE table_schema=$1 AND table_type='BASE TABLE'
       AND table_name NOT LIKE 'pg_%'
     ORDER BY table_name`, [SCHEMA]);
  return r.rows.map(r => r.table_name);
}

async function rowCount(table) {
  try {
    const r = await safeQuery(`SELECT count(*)::bigint AS n FROM "${SCHEMA}"."${table}"`);
    return Number(r.rows[0].n);
  } catch { return -1; }
}

async function textColumns(table) {
  const r = await safeQuery(`
    SELECT column_name FROM information_schema.columns
     WHERE table_schema=$1 AND table_name=$2
       AND data_type IN ('text','character varying','character')
     ORDER BY ordinal_position`, [SCHEMA, table]);
  return r.rows.map(r => r.column_name);
}

async function rowsMatchingMockPattern(table, cols) {
  if (!cols.length) return 0;
  const orExprs = cols.map(c => `coalesce("${c}"::text,'') ~* '${REGEX}'`).join(' OR ');
  try {
    const r = await safeQuery(`SELECT count(*)::bigint AS n FROM "${SCHEMA}"."${table}" WHERE ${orExprs}`);
    return Number(r.rows[0].n);
  } catch { return -1; }
}

async function criticalColumnsAllNull(table) {
  // Critical columns are: name, title, description, email, code, label
  const cols = await safeQuery(`
    SELECT column_name FROM information_schema.columns
     WHERE table_schema=$1 AND table_name=$2
       AND data_type IN ('text','character varying')
       AND column_name IN ('name','title','description','email','code','label','display_name')
     ORDER BY column_name`, [SCHEMA, table]);
  const res = {};
  for (const { column_name } of cols.rows) {
    try {
      const r = await safeQuery(`SELECT count(*) FILTER (WHERE "${column_name}" IS NULL OR "${column_name}"::text='') AS nulls, count(*) AS total FROM "${SCHEMA}"."${table}"`);
      const n = Number(r.rows[0].nulls);
      const t = Number(r.rows[0].total);
      if (t > 0 && n === t) res[column_name] = `${n}/${t} (100% NULL/empty)`;
    } catch {}
  }
  return res;
}

async function main() {
  console.log(`\n=== Mock-data scan: schema "${SCHEMA}" ===\n`);
  const tables = await listTables();
  const findings = {
    empty: [],            // row_count = 0
    demoOnly: [],         // every row matches mock pattern
    mostlyMock: [],       // ≥50% rows match mock pattern
    criticalNullSweep: [],// critical cols 100% NULL
    singletonSeed: [],    // 1 row, name matches default/sample/demo
    healthy: [],          // looks real
  };

  let i = 0;
  for (const t of tables) {
    i++;
    if (i % 50 === 0) process.stdout.write(`  scanned ${i}/${tables.length}\r`);
    const n = await rowCount(t);
    if (n === 0) { findings.empty.push(t); continue; }
    if (n < 0) continue;

    const cols = await textColumns(t);
    if (cols.length) {
      const m = await rowsMatchingMockPattern(t, cols);
      if (m === n) { findings.demoOnly.push({ table: t, rows: n, mockRows: m }); continue; }
      if (m > 0 && m / n >= 0.5) findings.mostlyMock.push({ table: t, rows: n, mockRows: m, pct: Math.round(m/n*100) });
    }

    const nulls = await criticalColumnsAllNull(t);
    if (Object.keys(nulls).length) findings.criticalNullSweep.push({ table: t, columns: nulls });

    if (n === 1) {
      // Check if the single row looks like a default/sample
      try {
        const probe = await safeQuery(`SELECT * FROM "${SCHEMA}"."${t}" LIMIT 1`);
        const row = probe.rows[0];
        const matches = Object.entries(row || {})
          .filter(([_, v]) => typeof v === 'string' && /^(default|sample|demo|example|test)/i.test(v));
        if (matches.length) findings.singletonSeed.push({ table: t, sampleRow: Object.fromEntries(matches) });
      } catch {}
    }

    if (
      !findings.empty.includes(t) &&
      !findings.demoOnly.find(x => x.table === t) &&
      !findings.mostlyMock.find(x => x.table === t) &&
      !findings.criticalNullSweep.find(x => x.table === t) &&
      !findings.singletonSeed.find(x => x.table === t)
    ) {
      findings.healthy.push({ table: t, rows: n });
    }
  }
  process.stdout.write(`  scanned ${tables.length}/${tables.length}\n`);

  const summary = {
    total: tables.length,
    empty: findings.empty.length,
    demoOnly: findings.demoOnly.length,
    mostlyMock: findings.mostlyMock.length,
    criticalNullSweep: findings.criticalNullSweep.length,
    singletonSeed: findings.singletonSeed.length,
    healthy: findings.healthy.length,
  };

  const report = { schema: SCHEMA, generatedAt: new Date().toISOString(), summary, findings };
  const jsonPath = `${OUT_DIR}/mock-data-${SCHEMA}.json`;
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  let md = `# Mock-data audit — schema \`${SCHEMA}\`\n\nGenerated ${report.generatedAt}\n\n`;
  md += `## Summary\n\n| Bucket | Count |\n|---|---|\n`;
  for (const [k, v] of Object.entries(summary)) md += `| **${k}** | ${v} |\n`;
  md += `\n## Empty tables (must be seeded with real data, or DROPPED)\n\n`;
  md += findings.empty.length
    ? '```\n' + findings.empty.slice(0, 200).join('\n') + (findings.empty.length > 200 ? `\n... (${findings.empty.length - 200} more)` : '') + '\n```\n'
    : '_none_\n';
  md += `\n## Demo-only tables (every row matches mock pattern)\n\n`;
  md += findings.demoOnly.length
    ? '```json\n' + JSON.stringify(findings.demoOnly.slice(0, 50), null, 2) + '\n```\n'
    : '_none_\n';
  md += `\n## Mostly-mock tables (≥50% rows match mock pattern)\n\n`;
  md += findings.mostlyMock.length
    ? '```json\n' + JSON.stringify(findings.mostlyMock.slice(0, 50), null, 2) + '\n```\n'
    : '_none_\n';
  md += `\n## Critical-column null sweep (name/title/email all NULL)\n\n`;
  md += findings.criticalNullSweep.length
    ? '```json\n' + JSON.stringify(findings.criticalNullSweep.slice(0, 50), null, 2) + '\n```\n'
    : '_none_\n';
  md += `\n## Singleton seeds (1 row, default/sample/demo prefix)\n\n`;
  md += findings.singletonSeed.length
    ? '```json\n' + JSON.stringify(findings.singletonSeed.slice(0, 50), null, 2) + '\n```\n'
    : '_none_\n';
  writeFileSync(`${OUT_DIR}/mock-data-${SCHEMA}.md`, md);

  console.log(`\nSummary:`, summary);
  console.log(`\nReport: ${jsonPath}`);
  console.log(`Report: ${OUT_DIR}/mock-data-${SCHEMA}.md`);
  await closePool();
}

main().catch(err => { console.error('FATAL', err); process.exit(1); });
