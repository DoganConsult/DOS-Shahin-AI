/**
 * Phase 5 follow-up — Legacy token invalidation proof.
 *
 * The 006 auth-service migration must:
 *   1. Rename the legacy `token` column to `token_hash` on upgrade DBs.
 *   2. Invalidate every row that was written under the legacy shape
 *      so no plaintext token (sitting in a column now named
 *      `token_hash`) can verify after the migration runs.
 *
 * Strategy proven here: expire + mark-consumed. Rows persist for
 * audit; verifyEmail's `expires_at > NOW() AND used_at IS NULL` gate
 * rejects them. Fresh DBs must not have any rows affected.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const ADMIN_URL = process.env.DATABASE_URL!;
const MIGRATION_006 = path.resolve(
  process.cwd(),
  'platform/dauth/migrations/public/006_hash_email_verification_tokens.sql',
);

async function dropRecreateDatabase(adminPool: Pool, dbName: string): Promise<void> {
  await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  await adminPool.query(`CREATE DATABASE "${dbName}"`);
}

function seedLegacyShape(pool: Pool): Promise<void> {
  return (async () => {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await pool.query(`
      CREATE TABLE public.email_verification_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     VARCHAR(64) NOT NULL,
        tenant_id   VARCHAR(16),
        token       TEXT NOT NULL,
        purpose     VARCHAR(50) NOT NULL DEFAULT 'verify_email',
        expires_at  TIMESTAMPTZ NOT NULL,
        used_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX idx_evt_token ON public.email_verification_tokens(token)`);
    // Two rows: one pending (used_at IS NULL), one already consumed.
    await pool.query(
      `INSERT INTO public.email_verification_tokens(user_id, token, expires_at, used_at)
       VALUES ('pending-u',  'plaintext-pending',  NOW() + INTERVAL '1 day', NULL),
              ('consumed-u', 'plaintext-consumed', NOW() + INTERVAL '1 day', NOW())`,
    );
  })();
}

function seedFreshShape(pool: Pool): Promise<void> {
  return (async () => {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await pool.query(`
      CREATE TABLE public.email_verification_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     VARCHAR(64) NOT NULL,
        tenant_id   VARCHAR(16),
        token_hash  TEXT NOT NULL,
        purpose     VARCHAR(50) NOT NULL DEFAULT 'verify_email',
        expires_at  TIMESTAMPTZ NOT NULL,
        used_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX idx_evt_token_hash ON public.email_verification_tokens(token_hash)`);
  })();
}

async function runMigration006(pool: Pool): Promise<void> {
  const sql = fs.readFileSync(MIGRATION_006, 'utf8');
  await pool.query(sql);
}

describe('006 hash-email-verification-tokens — legacy invalidation', () => {
  let adminPool: Pool;

  beforeAll(() => {
    adminPool = new Pool({ connectionString: ADMIN_URL });
  });

  afterAll(async () => {
    await adminPool.end();
  });

  it('UPGRADE path: renames token→token_hash AND expires every legacy pending row', async () => {
    const dbName = 'shahin_006_upgrade_test';
    await dropRecreateDatabase(adminPool, dbName);
    const dbUrl = ADMIN_URL.replace(/\/[^/?]+(?=\?|$)/, `/${dbName}`);
    const pool = new Pool({ connectionString: dbUrl });
    try {
      await seedLegacyShape(pool);
      await runMigration006(pool);

      const cols = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema='public' AND table_name='email_verification_tokens' ORDER BY column_name`,
      );
      const colSet = new Set(cols.rows.map(r => r.column_name));
      expect(colSet.has('token_hash')).toBe(true);
      expect(colSet.has('token')).toBe(false);

      // Pending legacy row must have been expired+marked consumed.
      const pending = await pool.query(
        `SELECT expires_at, used_at FROM public.email_verification_tokens WHERE user_id='pending-u'`,
      );
      expect(pending.rows[0].used_at).not.toBeNull();
      expect(new Date(pending.rows[0].expires_at).getTime()).toBeLessThanOrEqual(Date.now());

      // Already-consumed row must be left alone (used_at still set, expires_at untouched).
      const consumed = await pool.query(
        `SELECT expires_at, used_at FROM public.email_verification_tokens WHERE user_id='consumed-u'`,
      );
      expect(consumed.rows[0].used_at).not.toBeNull();
      expect(new Date(consumed.rows[0].expires_at).getTime()).toBeGreaterThan(Date.now());

      // No row may still carry a plaintext token that a runtime
      // `WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL`
      // lookup could honour.
      const live = await pool.query(
        `SELECT COUNT(*)::int AS c
         FROM public.email_verification_tokens
         WHERE used_at IS NULL AND expires_at > NOW()`,
      );
      expect(live.rows[0].c).toBe(0);

      // And the old index must be gone, the hash index present.
      const idx = await pool.query(
        `SELECT indexname FROM pg_indexes WHERE tablename='email_verification_tokens'`,
      );
      const idxNames = idx.rows.map(r => r.indexname);
      expect(idxNames).toContain('idx_evt_token_hash');
      expect(idxNames).not.toContain('idx_evt_token');
    } finally {
      await pool.end();
      await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    }
  }, 30_000);

  it('FRESH path: no token column exists, no rows, migration is a clean no-op on data', async () => {
    const dbName = 'shahin_006_fresh_test';
    await dropRecreateDatabase(adminPool, dbName);
    const dbUrl = ADMIN_URL.replace(/\/[^/?]+(?=\?|$)/, `/${dbName}`);
    const pool = new Pool({ connectionString: dbUrl });
    try {
      await seedFreshShape(pool);
      await runMigration006(pool);

      const cols = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema='public' AND table_name='email_verification_tokens' ORDER BY column_name`,
      );
      const colSet = new Set(cols.rows.map(r => r.column_name));
      expect(colSet.has('token_hash')).toBe(true);
      expect(colSet.has('token')).toBe(false);

      const rows = await pool.query(`SELECT COUNT(*)::int AS c FROM public.email_verification_tokens`);
      expect(rows.rows[0].c).toBe(0);
    } finally {
      await pool.end();
      await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    }
  }, 30_000);

  it('RE-APPLY path: running 006 a second time on an already-migrated DB is idempotent', async () => {
    const dbName = 'shahin_006_reapply_test';
    await dropRecreateDatabase(adminPool, dbName);
    const dbUrl = ADMIN_URL.replace(/\/[^/?]+(?=\?|$)/, `/${dbName}`);
    const pool = new Pool({ connectionString: dbUrl });
    try {
      await seedLegacyShape(pool);
      await runMigration006(pool);
      // Insert a valid post-migration row (hash-shaped value).
      await pool.query(
        `INSERT INTO public.email_verification_tokens(user_id, token_hash, expires_at)
         VALUES ('post-u', repeat('a', 64), NOW() + INTERVAL '1 day')`,
      );
      // Re-apply — must not rename again, must not re-sweep the post-row.
      await runMigration006(pool);

      const live = await pool.query(
        `SELECT user_id FROM public.email_verification_tokens
         WHERE used_at IS NULL AND expires_at > NOW()`,
      );
      expect(live.rows.map(r => r.user_id)).toEqual(['post-u']);
    } finally {
      await pool.end();
      await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    }
  }, 30_000);
});
