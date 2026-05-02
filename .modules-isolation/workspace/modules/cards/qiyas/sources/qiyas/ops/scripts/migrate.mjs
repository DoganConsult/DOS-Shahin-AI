#!/usr/bin/env node
/**
 * Qiyas module migration runner using host-provided pg.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIG_DIR = join(__dirname, '..', '..', 'db', 'migrations');
const DRY = process.argv.includes('--dry-run');

async function main() {
  const files = readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('_down.sql'))
    .sort();

  if (DRY) {
    console.log(`[migrate] ${files.length} migration files:`);
    for (const f of files) console.log('  -', f);
    return;
  }

  let pg;
  try {
    pg = await import('pg');
  } catch {
    console.error('[migrate] pg driver not available; install `pg` in host service or call');
    console.error('         the runMigrations(client) export from the dist build instead.');
    process.exit(2);
  }
  const { Client } = pg.default ?? pg;
  const client = new Client();
  await client.connect();
  await client.query(`CREATE TABLE IF NOT EXISTS qiyas_schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const { rows: applied } = await client.query('SELECT filename FROM qiyas_schema_migrations');
  const seen = new Set(applied.map((r) => r.filename));

  let n = 0;
  for (const f of files) {
    if (seen.has(f)) continue;
    const sql = readFileSync(join(MIG_DIR, f), 'utf8');
    console.log(`[migrate] applying ${f}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO qiyas_schema_migrations(filename) VALUES ($1)', [f]);
      await client.query('COMMIT');
      n++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[migrate] FAILED ${f}:`, err);
      await client.end();
      process.exit(1);
    }
  }
  await client.end();
  console.log(`[migrate] OK: ${n} new migrations applied`);
}

main().catch((err) => {
  console.error('[migrate] FATAL', err);
  process.exit(1);
});
