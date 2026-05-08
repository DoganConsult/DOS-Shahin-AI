// @fc/db — pg pool factory + migration runner. fc_app role only. No legacy dos.* writes.
import pg from 'pg';
import type { FcConfig } from '@fc/config';

export type FcPool = pg.Pool;

export function createPool(cfg: FcConfig): FcPool {
  const pool = new pg.Pool({
    connectionString: cfg.db.url,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  return pool;
}

export async function pingDb(pool: FcPool): Promise<{ ok: boolean; serverVersion?: string }> {
  try {
    const r = await pool.query('SELECT version() AS v');
    return { ok: true, serverVersion: String(r.rows[0]?.v ?? '') };
  } catch {
    return { ok: false };
  }
}

export async function ensureSchemas(pool: FcPool, schemas: readonly string[]): Promise<void> {
  for (const s of schemas) {
    if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error(`[fc-db] illegal schema name: ${s}`);
    const r = await pool.query(
      'SELECT 1 FROM information_schema.schemata WHERE schema_name = $1',
      [s],
    );
    if (r.rowCount === 0) {
      throw new Error(`[fc-db] required schema missing: ${s}. Run migrations first.`);
    }
  }
}
