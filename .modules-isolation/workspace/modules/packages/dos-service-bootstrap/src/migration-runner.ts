import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { recordMigration } from '@dos/platform-core/observability';

export interface MigrationRunnerOptions {
  serviceCode: string;
  connectionString: string;
  migrationsDir?: string;
  enabled?: boolean;
}

async function ensureTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS dos;
    CREATE TABLE IF NOT EXISTS dos.service_migrations (
      id SERIAL PRIMARY KEY,
      service_code TEXT NOT NULL,
      filename TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      execution_time_ms INTEGER,
      UNIQUE(service_code, filename)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dos.migration_history (
      id SERIAL PRIMARY KEY,
      action TEXT,
      name TEXT,
      executed_by TEXT,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

function fileChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function collectMigrationFiles(rootDir: string): string[] {
  return fs.readdirSync(rootDir, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return collectMigrationFiles(absolutePath);
      }
      if (!entry.isFile() || !entry.name.endsWith('.sql') || entry.name.endsWith('_down.sql')) {
        return [];
      }
      return [absolutePath];
    })
    .sort((left, right) => left.localeCompare(right));
}

export async function runServiceMigrations(options: MigrationRunnerOptions): Promise<{ applied: number; skipped: number }> {
  if (options.enabled === false) return { applied: 0, skipped: 0 };

  const migrationsDir = options.migrationsDir
    || path.resolve(process.cwd(), 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    return { applied: 0, skipped: 0 };
  }

  const files = collectMigrationFiles(migrationsDir);

  if (files.length === 0) return { applied: 0, skipped: 0 };

  const pool = new Pool({ connectionString: options.connectionString });
  let applied = 0;
  let skipped = 0;

  try {
    await ensureTable(pool);

    const { rows } = await pool.query(
      `SELECT filename FROM dos.service_migrations WHERE service_code = $1`,
      [options.serviceCode],
    );
    const appliedSet = new Set(rows.map((r: { filename: string }) => r.filename));

    for (const filePath of files) {
      const relativeFile = path.relative(migrationsDir, filePath).replace(/\\/g, '/');
      if (appliedSet.has(relativeFile)) { skipped++; continue; }

      const sql = fs.readFileSync(filePath, 'utf8');
      const hash = fileChecksum(sql);
      const start = Date.now();

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          `INSERT INTO dos.service_migrations (service_code, filename, checksum, execution_time_ms)
           VALUES ($1, $2, $3, $4)`,
          [options.serviceCode, relativeFile, hash, Date.now() - start],
        );
        await client.query(
          `INSERT INTO dos.migration_history (action, name, executed_by)
           VALUES ($1, $2, CURRENT_USER)`,
          ['APPLY', `${options.serviceCode}/${relativeFile}`],
        );
        await client.query('COMMIT');
        applied++;
        recordMigration(options.serviceCode, 'success');
      } catch (err) {
        await client.query('ROLLBACK');
        recordMigration(options.serviceCode, 'failure');
        throw new Error(`Migration ${relativeFile} failed for ${options.serviceCode}: ${(err as Error).message}`);
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }

  return { applied, skipped };
}

function collectDownFiles(rootDir: string): string[] {
  return fs.readdirSync(rootDir, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return collectDownFiles(absolutePath);
      }
      if (!entry.isFile() || !entry.name.endsWith('_down.sql')) {
        return [];
      }
      return [absolutePath];
    })
    .sort((left, right) => right.localeCompare(left)); // reverse order for rollback
}

export async function rollbackServiceMigrations(options: MigrationRunnerOptions): Promise<{ rolledBack: number }> {
  const migrationsDir = options.migrationsDir
    || path.resolve(process.cwd(), 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    return { rolledBack: 0 };
  }

  const downFiles = collectDownFiles(migrationsDir);
  if (downFiles.length === 0) return { rolledBack: 0 };

  const pool = new Pool({ connectionString: options.connectionString });
  let rolledBack = 0;

  try {
    await ensureTable(pool);

    for (const filePath of downFiles) {
      const upFilename = path.relative(migrationsDir, filePath)
        .replace(/_down\.sql$/, '.sql')
        .replace(/\\/g, '/');

      // Only roll back migrations that were actually applied
      const { rows } = await pool.query(
        `SELECT id FROM dos.service_migrations WHERE service_code = $1 AND filename = $2`,
        [options.serviceCode, upFilename],
      );
      if (rows.length === 0) continue;

      const sql = fs.readFileSync(filePath, 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          `DELETE FROM dos.service_migrations WHERE service_code = $1 AND filename = $2`,
          [options.serviceCode, upFilename],
        );
        await client.query(
          `INSERT INTO dos.migration_history (action, name, executed_by)
           VALUES ($1, $2, CURRENT_USER)`,
          ['ROLLBACK', `${options.serviceCode}/${upFilename}`],
        );
        await client.query('COMMIT');
        rolledBack++;
        recordMigration(options.serviceCode, 'success');
      } catch (err) {
        await client.query('ROLLBACK');
        recordMigration(options.serviceCode, 'failure');
        throw new Error(`Rollback ${filePath} failed for ${options.serviceCode}: ${(err as Error).message}`);
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }

  return { rolledBack };
}
