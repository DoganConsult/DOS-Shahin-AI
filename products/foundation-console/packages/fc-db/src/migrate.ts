// @fc/db migrate — idempotent runner over products/foundation-console/db/migrations/*.sql
// Tracks applied migrations in fc_ui_os.schema_migrations.
import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadFcConfig } from '@fc/config';
import { createLogger } from '@fc/logger';

const log = createLogger({ service: 'fc-db-migrate' });

async function main(): Promise<void> {
  const cfg = loadFcConfig();
  const here = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = resolve(here, '../../../db/migrations');

  log.info({ migrationsDir, dbUrl: cfg.db.url.replace(/:[^:@]*@/, ':***@') }, 'starting migrations');

  const pool = new pg.Pool({ connectionString: cfg.db.url });
  try {
    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const f of files) {
      const id = f.replace(/\.sql$/, '');
      const exists = await pool.query(
        'SELECT 1 FROM fc_ui_os.schema_migrations WHERE id = $1',
        [id],
      );
      if ((exists.rowCount ?? 0) > 0) {
        log.info({ id }, 'migration already applied — skip');
        continue;
      }
      const sql = await readFile(join(migrationsDir, f), 'utf8');
      log.info({ id }, 'applying migration');
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query(
          'INSERT INTO fc_ui_os.schema_migrations (id, description) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
          [id, `Applied by @fc/db at ${new Date().toISOString()}`],
        );
        await pool.query('COMMIT');
        log.info({ id }, 'migration applied');
      } catch (e) {
        await pool.query('ROLLBACK');
        throw e;
      }
    }
    log.info('all migrations applied');
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  log.error({ err: e instanceof Error ? e.message : String(e) }, 'migration failed');
  process.exit(1);
});
