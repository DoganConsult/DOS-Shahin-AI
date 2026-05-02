#!/usr/bin/env tsx
/**
 * Drift detection across every live tenant schema.
 *
 * For each tenant_<id> schema (and the public/dos schemas), introspects
 * information_schema to build a normalized shape per table, hashes it,
 * then groups tables by hash to collapse identical shapes.
 *
 * Output:
 *   ops/normalization/snapshots/<UTC-ISO>/
 *     ├── per-tenant/<schema>.json     # full shape per schema
 *     ├── drift-matrix.json            # table -> {hash -> [tenants]}
 *     └── drift-matrix.md              # human-readable summary
 *
 * Read-only. Never writes to the database.
 *
 * Usage:
 *   tsx ops/normalization/scripts/drift-detect.ts
 *   tsx ops/normalization/scripts/drift-detect.ts --include-public
 *   tsx ops/normalization/scripts/drift-detect.ts --tenants tenant_acme,tenant_foo
 */

import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getPool } from '@dos/db';

interface ColumnShape {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  generated: boolean;
}
interface ConstraintShape {
  type: 'PRIMARY KEY' | 'UNIQUE' | 'FOREIGN KEY' | 'CHECK';
  name: string;
  columns: string[];
  references?: { schema: string; table: string; columns: string[] };
  expression?: string;
}
interface IndexShape {
  name: string;
  unique: boolean;
  columns: string[];
  predicate?: string;
}
interface TableShape {
  schema: string;
  table: string;
  columns: ColumnShape[];
  constraints: ConstraintShape[];
  indexes: IndexShape[];
}

const POOL = getPool();

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex').slice(0, 16);
}

function canonicalize(t: TableShape): TableShape {
  return {
    schema: t.schema,
    table: t.table,
    columns: [...t.columns].sort((a, b) => a.name.localeCompare(b.name)),
    constraints: [...t.constraints].sort((a, b) => `${a.type}|${a.columns.join(',')}`.localeCompare(`${b.type}|${b.columns.join(',')}`)),
    indexes: [...t.indexes].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function hashTable(t: TableShape): string {
  const c = canonicalize(t);
  // Hash excludes schema/name so identical shapes across schemas collide.
  return sha256({ columns: c.columns, constraints: c.constraints.map((x) => ({ ...x, name: undefined })), indexes: c.indexes.map((x) => ({ ...x, name: undefined })) });
}

async function listSchemas(filterPrefix: string, only?: Set<string>): Promise<string[]> {
  const res = await POOL.query<{ schema_name: string }>(
    `SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE $1 AND schema_name NOT LIKE 'pg\\_%' ESCAPE '\\'
      ORDER BY schema_name`,
    [`${filterPrefix}%`],
  );
  const out = res.rows.map((r) => r.schema_name);
  return only ? out.filter((s) => only.has(s)) : out;
}

async function shapeForSchema(schema: string): Promise<TableShape[]> {
  const cols = await POOL.query<{
    table_name: string; column_name: string; data_type: string; is_nullable: 'YES' | 'NO';
    column_default: string | null; is_generated: 'NEVER' | 'ALWAYS';
  }>(
    `SELECT table_name, column_name, data_type, is_nullable, column_default, is_generated
       FROM information_schema.columns
      WHERE table_schema = $1
      ORDER BY table_name, ordinal_position`,
    [schema],
  );

  const cons = await POOL.query<{
    table_name: string; constraint_name: string; constraint_type: string;
    columns: string[]; ref_schema: string | null; ref_table: string | null; ref_columns: string[] | null;
    check_clause: string | null;
  }>(
    `SELECT
       tc.table_name,
       tc.constraint_name,
       tc.constraint_type,
       array_agg(kcu.column_name ORDER BY kcu.ordinal_position) FILTER (WHERE kcu.column_name IS NOT NULL) AS columns,
       MAX(ccu.table_schema) AS ref_schema,
       MAX(ccu.table_name)   AS ref_table,
       array_agg(DISTINCT ccu.column_name) FILTER (WHERE tc.constraint_type = 'FOREIGN KEY') AS ref_columns,
       MAX(cc.check_clause)  AS check_clause
       FROM information_schema.table_constraints tc
       LEFT JOIN information_schema.key_column_usage kcu
              ON kcu.constraint_name = tc.constraint_name AND kcu.constraint_schema = tc.constraint_schema
       LEFT JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
              AND tc.constraint_type = 'FOREIGN KEY'
       LEFT JOIN information_schema.check_constraints cc
              ON cc.constraint_name = tc.constraint_name AND cc.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = $1
        AND tc.constraint_type IN ('PRIMARY KEY','UNIQUE','FOREIGN KEY','CHECK')
      GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
      ORDER BY tc.table_name, tc.constraint_name`,
    [schema],
  );

  const idx = await POOL.query<{ table_name: string; index_name: string; is_unique: boolean; cols: string; predicate: string | null }>(
    `SELECT t.relname AS table_name,
            i.relname AS index_name,
            ix.indisunique AS is_unique,
            pg_get_indexdef(ix.indexrelid) AS cols,
            pg_get_expr(ix.indpred, ix.indrelid) AS predicate
       FROM pg_index ix
       JOIN pg_class i ON i.oid = ix.indexrelid
       JOIN pg_class t ON t.oid = ix.indrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = $1 AND ix.indisprimary = false
      ORDER BY t.relname, i.relname`,
    [schema],
  );

  const byTable = new Map<string, TableShape>();
  for (const r of cols.rows) {
    if (!byTable.has(r.table_name)) byTable.set(r.table_name, { schema, table: r.table_name, columns: [], constraints: [], indexes: [] });
    byTable.get(r.table_name)!.columns.push({
      name: r.column_name,
      type: r.data_type,
      nullable: r.is_nullable === 'YES',
      default: r.column_default,
      generated: r.is_generated === 'ALWAYS',
    });
  }
  for (const r of cons.rows) {
    const t = byTable.get(r.table_name);
    if (!t) continue;
    t.constraints.push({
      type: r.constraint_type as ConstraintShape['type'],
      name: r.constraint_name,
      columns: r.columns ?? [],
      ...(r.ref_table ? { references: { schema: r.ref_schema!, table: r.ref_table, columns: r.ref_columns ?? [] } } : {}),
      ...(r.check_clause ? { expression: r.check_clause } : {}),
    });
  }
  for (const r of idx.rows) {
    const t = byTable.get(r.table_name);
    if (!t) continue;
    t.indexes.push({ name: r.index_name, unique: r.is_unique, columns: [r.cols], ...(r.predicate ? { predicate: r.predicate } : {}) });
  }
  return Array.from(byTable.values());
}

interface DriftMatrix {
  generatedAt: string;
  schemasScanned: string[];
  tables: Record<string, Record<string, string[]>>; // table -> hash -> [schemas]
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const includePublic = args.has('--include-public');
  const tenantsArgIdx = process.argv.indexOf('--tenants');
  const onlyTenants = tenantsArgIdx > 0 ? new Set(process.argv[tenantsArgIdx + 1].split(',')) : undefined;

  const tenantSchemas = await listSchemas('tenant_', onlyTenants);
  const targetSchemas = includePublic ? ['public', 'dos', ...tenantSchemas] : tenantSchemas;

  if (targetSchemas.length === 0) {
    console.error('drift-detect: no schemas found to scan. Use --include-public or check the database.');
    process.exit(2);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = join(process.cwd(), 'ops/normalization/snapshots', ts);
  mkdirSync(join(outDir, 'per-tenant'), { recursive: true });
  console.error(`drift-detect: scanning ${targetSchemas.length} schemas into ${outDir}`);

  const matrix: DriftMatrix = { generatedAt: new Date().toISOString(), schemasScanned: targetSchemas, tables: {} };

  for (const schema of targetSchemas) {
    const tables = await shapeForSchema(schema);
    writeFileSync(join(outDir, 'per-tenant', `${schema}.json`), JSON.stringify(tables, null, 2));
    for (const t of tables) {
      const h = hashTable(t);
      matrix.tables[t.table] ??= {};
      matrix.tables[t.table][h] ??= [];
      matrix.tables[t.table][h].push(schema);
    }
    console.error(`  ${schema}: ${tables.length} tables`);
  }

  writeFileSync(join(outDir, 'drift-matrix.json'), JSON.stringify(matrix, null, 2));
  writeFileSync(join(outDir, 'drift-matrix.md'), renderMarkdown(matrix));

  const drifted = Object.entries(matrix.tables).filter(([, hashes]) => Object.keys(hashes).length > 1);
  console.error(`\ndrift-detect: ${Object.keys(matrix.tables).length} distinct table names, ${drifted.length} drifted across schemas`);
  console.error(`Report: ${outDir}/drift-matrix.md`);

  await POOL.end();
}

function renderMarkdown(m: DriftMatrix): string {
  const lines: string[] = [];
  lines.push(`# Drift Matrix`);
  lines.push(`Generated: ${m.generatedAt}`);
  lines.push(`Schemas scanned: ${m.schemasScanned.length}`);
  lines.push('');
  const allTables = Object.keys(m.tables).sort();
  const drifted = allTables.filter((t) => Object.keys(m.tables[t]).length > 1);
  const stable = allTables.filter((t) => Object.keys(m.tables[t]).length === 1);
  lines.push(`## Summary`);
  lines.push(`- Total table names: **${allTables.length}**`);
  lines.push(`- Drifted (≥2 distinct shapes across schemas): **${drifted.length}**`);
  lines.push(`- Stable (identical shape everywhere it exists): **${stable.length}**`);
  lines.push('');
  lines.push(`## Drifted Tables`);
  if (drifted.length === 0) {
    lines.push('_None — every table has a single canonical shape across all scanned schemas._');
  } else {
    for (const t of drifted) {
      lines.push(`### \`${t}\``);
      const variants = Object.entries(m.tables[t]).sort((a, b) => b[1].length - a[1].length);
      for (const [hash, schemas] of variants) {
        lines.push(`- **${hash}** (${schemas.length} schema${schemas.length === 1 ? '' : 's'}): ${schemas.slice(0, 8).join(', ')}${schemas.length > 8 ? `, ... +${schemas.length - 8}` : ''}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

main().catch((err) => {
  console.error('drift-detect: fatal', err);
  process.exit(1);
});
