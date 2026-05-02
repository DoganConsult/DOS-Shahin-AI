import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = any>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  release?(): void;
}

export interface MigrationRecord {
  filename: string;
  appliedAt: string;
}

export interface RunMigrationsResult {
  applied: string[];
  skipped: string[];
}

const MODULE_DIR = __dirname;
const DEFAULT_PUBLIC_DIR = join(MODULE_DIR, 'public', 'migrations');
const DEFAULT_TENANT_DIR = join(MODULE_DIR, 'tenant', 'migrations');

export async function runMigrations(
  client: DbClient,
  opts: {
    kind?: 'public' | 'tenant';
    migrationsDir?: string;
    tenantSchema?: string;
    exclude?: RegExp[];
  } = {},
): Promise<RunMigrationsResult> {
  const kind = opts.kind ?? 'tenant';
  const dir = opts.migrationsDir ?? (kind === 'public' ? DEFAULT_PUBLIC_DIR : DEFAULT_TENANT_DIR);
  const tenantSchema = opts.tenantSchema ?? 'public';
  const exclude = opts.exclude ?? [];
  const tableName = kind === 'public' ? 'risk_public_schema_migrations' : 'risk_tenant_schema_migrations';

  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('_down.sql'))
    .filter((f) => !exclude.some((re) => re.test(f)))
    .sort();

  if (tenantSchema !== 'public') {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${tenantSchema}"`);
  }

  await client.query(`CREATE TABLE IF NOT EXISTS ${tableName} (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const applied = await client.query<{ filename: string }>(`SELECT filename FROM ${tableName}`);
  const seen = new Set(applied.rows.map((r) => r.filename));

  const newlyApplied: string[] = [];
  const skipped: string[] = [];
  for (const f of files) {
    if (seen.has(f)) {
      skipped.push(f);
      continue;
    }
    const raw = readFileSync(join(dir, f), 'utf8');
    const sql = raw
      .replace(/"__TENANT_SCHEMA__"/g, `"${tenantSchema}"`)
      .replace(/__TENANT_SCHEMA__/g, `"${tenantSchema}"`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(`INSERT INTO ${tableName}(filename) VALUES ($1)`, [f]);
      await client.query('COMMIT');
      newlyApplied.push(f);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  return { applied: newlyApplied, skipped };
}

