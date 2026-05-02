#!/usr/bin/env node
/**
 * apply-dynamic-ui-seed.mjs
 *
 * Wave 1A applier — applies a single SQL file to the Dynamic UI database.
 *
 * Reads DATABASE_URL from (in priority order):
 *   1. process.env.DATABASE_URL
 *   2. services/dynamic-ui-service/ecosystem.config.cjs (the deployed config)
 *
 * Usage:
 *   node scripts/ops/apply-dynamic-ui-seed.mjs <relative-or-absolute-sql-path>
 *
 * Exit codes: 0 ok / 1 sql error / 2 harness error.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ECOSYSTEM = path.join(
  REPO_ROOT,
  'services/dynamic-ui-service/ecosystem.config.cjs',
);

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!existsSync(ECOSYSTEM)) return null;
  const require = createRequire(import.meta.url);
  try {
    const cfg = require(ECOSYSTEM);
    const env = cfg?.apps?.[0]?.env;
    return env?.DATABASE_URL ?? null;
  } catch {
    return null;
  }
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node scripts/ops/apply-dynamic-ui-seed.mjs <sql-path>');
    process.exit(2);
  }
  const sqlPath = path.isAbsolute(arg) ? arg : path.join(REPO_ROOT, arg);
  if (!existsSync(sqlPath)) {
    console.error(`[apply-dynamic-ui-seed] file not found: ${sqlPath}`);
    process.exit(2);
  }
  const url = loadDatabaseUrl();
  if (!url) {
    console.error(
      '[apply-dynamic-ui-seed] DATABASE_URL not set and ecosystem.config.cjs missing/unreadable',
    );
    process.exit(2);
  }
  // Lazy-load pg only if we need to. The dynamic-ui-service has it installed.
  const pgPath = path.join(
    REPO_ROOT,
    'services/dynamic-ui-service/node_modules/pg/lib/index.js',
  );
  let pg;
  try {
    pg = (await import(pgPath)).default;
  } catch {
    pg = (await import('pg')).default;
  }
  const sql = readFileSync(sqlPath, 'utf-8');
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    console.log(`[apply-dynamic-ui-seed] applying ${sqlPath}`);
    await client.query(sql);
    console.log('[apply-dynamic-ui-seed] OK');
  } catch (err) {
    console.error('[apply-dynamic-ui-seed] SQL error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[apply-dynamic-ui-seed] harness error:', err);
  process.exit(2);
});
