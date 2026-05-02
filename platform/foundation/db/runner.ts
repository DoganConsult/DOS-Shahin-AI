/**
 * Foundation DB migration runner — accepts any client conforming to DbClient.
 * Usable from a host service that already has a Postgres client wired
 * (no pg dep required at module level).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DbClient } from '../ports/database.port';

const MODULE_DIR = __dirname;

export interface MigrationRecord {
  filename: string;
  appliedAt: string;
}

export interface RunMigrationsResult {
  applied: string[];
  skipped: string[];
}

const DEFAULT_DIR = join(MODULE_DIR, 'migrations');

export async function runMigrations(
  client: DbClient,
  opts: { migrationsDir?: string } = {},
): Promise<RunMigrationsResult> {
  const dir = opts.migrationsDir ?? DEFAULT_DIR;
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('_down.sql'))
    .sort();

  await client.query(`CREATE TABLE IF NOT EXISTS foundation_schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const applied = await client.query<MigrationRecord>(
    'SELECT filename FROM foundation_schema_migrations',
  );
  const seen = new Set(applied.rows.map((r) => r.filename));

  const newlyApplied: string[] = [];
  const skipped: string[] = [];
  for (const f of files) {
    if (seen.has(f)) {
      skipped.push(f);
      continue;
    }
    const sql = readFileSync(join(dir, f), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO foundation_schema_migrations(filename) VALUES ($1)', [f]);
      await client.query('COMMIT');
      newlyApplied.push(f);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }
  return { applied: newlyApplied, skipped };
}
