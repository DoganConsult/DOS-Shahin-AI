/**
 * Qiyas DB migration runner — accepts any client conforming to DbClient.
 */
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
const DEFAULT_DIR = join(MODULE_DIR, 'migrations');

export async function runMigrations(
  client: DbClient,
  opts: { migrationsDir?: string; tenantSchema?: string; exclude?: RegExp[] } = {},
): Promise<RunMigrationsResult> {
  const dir = opts.migrationsDir ?? DEFAULT_DIR;
  const tenantSchema = opts.tenantSchema ?? 'public';
  const exclude = opts.exclude ?? [];
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('_down.sql'))
    .filter((f) => !exclude.some((re) => re.test(f)))
    .sort();
  if (tenantSchema !== 'public') {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${tenantSchema}"`);
  }

  await client.query(`CREATE TABLE IF NOT EXISTS qiyas_schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const applied = await client.query<MigrationRecord>(
    'SELECT filename FROM qiyas_schema_migrations',
  );
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
      await client.query('INSERT INTO qiyas_schema_migrations(filename) VALUES ($1)', [f]);
      await client.query('COMMIT');
      newlyApplied.push(f);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }
  return { applied: newlyApplied, skipped };
}
