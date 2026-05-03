// scripts/module/lib/db.mjs — pg pool factory for the contract publisher.
// DATABASE_URL is read from platform/config-center/env/auth-service.env (the
// same file AGENTS.md verified). The publisher always runs `SET LOCAL
// dos.publisher_session = 'contract-publisher@v1'` inside its transactions
// so trg_published_by_only accepts the writes.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ENV_FILE = resolve(REPO, 'platform/config-center/env/auth-service.env');

export function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!existsSync(ENV_FILE)) {
    throw new Error(`[publisher.db] env file not found: ${ENV_FILE}`);
  }
  const txt = readFileSync(ENV_FILE, 'utf8');
  const m = txt.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
  if (!m) throw new Error('[publisher.db] DATABASE_URL not found in env file');
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

export function makePool() {
  const connectionString = loadDatabaseUrl();
  return new pg.Pool({ connectionString, max: 4 });
}

export async function withPublisherTx(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL dos.publisher_session = 'contract-publisher@v1'");
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}
