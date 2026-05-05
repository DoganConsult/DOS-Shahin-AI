/**
 * Dynamic platform-secret resolver.
 *
 * Replaces hardcoded process.env reads for Azure / Graph / MFA secrets
 * with a DB-backed store (`dos.platform_secret`). Values are encrypted
 * at-rest with AES-256-GCM using SECRETS_ENCRYPTION_KEY (the same key
 * already used elsewhere in the platform).
 *
 * Resolution order (first hit wins):
 *   1. tenant override row     (scope='tenant',   tenant_id=$tenantId)
 *   2. platform default row    (scope='platform', tenant_id IS NULL)
 *   3. process.env fallback    (only when ALLOW_ENV_FALLBACK=true)
 *
 * Cached for SECRET_CACHE_TTL_MS (default 60s) to keep the hot OTP path
 * snappy without leaking long-lived stale values after a rotation.
 */
import crypto from 'node:crypto';
import { Pool } from 'pg';

const CACHE_TTL_MS = Number(process.env.SECRET_CACHE_TTL_MS || 60_000);
const ALLOW_ENV    = String(process.env.ALLOW_ENV_FALLBACK || 'true').toLowerCase() === 'true';
const ENC_KEY_HEX  = (process.env.SECRETS_ENCRYPTION_KEY || '').trim();

let _pool: Pool | null = null;
function getPool(): Pool | null {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  _pool = new Pool({ connectionString: url, max: 4, idleTimeoutMillis: 10_000 });
  return _pool;
}

function encKey(): Buffer {
  if (!ENC_KEY_HEX) throw new Error('SECRETS_ENCRYPTION_KEY unset');
  // Accept hex (64 chars) or raw 32-byte UTF-8 string.
  const hex = /^[0-9a-fA-F]{64}$/.test(ENC_KEY_HEX);
  const buf = hex ? Buffer.from(ENC_KEY_HEX, 'hex') : Buffer.from(ENC_KEY_HEX, 'utf8');
  if (buf.length !== 32) {
    throw new Error(`SECRETS_ENCRYPTION_KEY must be 32 bytes (got ${buf.length})`);
  }
  return buf;
}

export function encryptSecret(plaintext: string): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag };
}

export function decryptSecret(ciphertext: Buffer, iv: Buffer, tag: Buffer): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString('utf8');
}

interface CacheEntry { value: string | null; expiresAt: number; }
const cache = new Map<string, CacheEntry>();

function cacheKey(secretKey: string, tenantId?: string | null): string {
  return `${secretKey}::${tenantId ?? '__platform__'}`;
}

export function invalidateSecret(secretKey: string, tenantId?: string | null): void {
  cache.delete(cacheKey(secretKey, tenantId));
  if (!tenantId) {
    // Platform-default change can shadow tenant overrides — clear any
    // tenant-keyed entry for this secretKey.
    for (const k of Array.from(cache.keys())) {
      if (k.startsWith(`${secretKey}::`)) cache.delete(k);
    }
  }
}

/**
 * Read one secret. Tenant-scoped value wins over platform default;
 * env fallback wins only when ALLOW_ENV_FALLBACK=true.
 */
export async function resolveSecret(
  secretKey: string,
  opts: { tenantId?: string | null; envName?: string } = {},
): Promise<string | null> {
  const ck = cacheKey(secretKey, opts.tenantId ?? null);
  const hit = cache.get(ck);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  let value: string | null = null;
  const pool = getPool();
  if (pool) {
    try {
      const r = await pool.query<{
        scope: string; tenant_id: string | null;
        value_ciphertext: Buffer | null; value_iv: Buffer | null; value_tag: Buffer | null;
      }>(
        `SELECT scope, tenant_id, value_ciphertext, value_iv, value_tag
           FROM dos.platform_secret
          WHERE secret_key = $1
            AND is_active = true
            AND value_ciphertext IS NOT NULL
            AND (
              (scope = 'tenant'   AND tenant_id = $2) OR
              (scope = 'platform' AND tenant_id IS NULL)
            )
          ORDER BY (scope = 'tenant') DESC
          LIMIT 1`,
        [secretKey, opts.tenantId ?? null],
      );
      const row = r.rows[0];
      if (row && row.value_ciphertext && row.value_iv && row.value_tag) {
        try {
          value = decryptSecret(row.value_ciphertext, row.value_iv, row.value_tag);
        } catch (e) {
          console.warn(`[dynamic-secrets] decrypt failed for ${secretKey}:`, (e as Error).message);
        }
      }
    } catch (e) {
      console.warn(`[dynamic-secrets] DB read failed for ${secretKey}:`, (e as Error).message);
    }
  }

  if (value === null && ALLOW_ENV && opts.envName) {
    const envv = process.env[opts.envName];
    if (typeof envv === 'string' && envv.length > 0) value = envv;
  }

  cache.set(ck, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

/**
 * Upsert a secret. scope='platform' clears tenant_id; scope='tenant'
 * requires tenantId. Plain value="" deactivates the row.
 */
export async function setSecret(
  secretKey: string,
  plainValue: string,
  opts: { scope: 'platform' | 'tenant'; tenantId?: string | null; updatedBy: string },
): Promise<{ ok: boolean; message?: string }> {
  const pool = getPool();
  if (!pool) return { ok: false, message: 'DB_NOT_CONFIGURED' };
  if (opts.scope === 'tenant' && !opts.tenantId) {
    return { ok: false, message: 'TENANT_ID_REQUIRED' };
  }

  // Confirm key exists in the catalog — we never let admins write
  // arbitrary keys; the catalog is the source of truth.
  const def = await pool.query(
    `SELECT 1 FROM dos.platform_secret_definition WHERE secret_key = $1`,
    [secretKey],
  );
  if (!def.rowCount) return { ok: false, message: 'UNKNOWN_SECRET_KEY' };

  if (plainValue === '') {
    await pool.query(
      `UPDATE dos.platform_secret
          SET is_active = false,
              version   = version + 1,
              updated_at = now(),
              updated_by = $4
        WHERE secret_key = $1
          AND scope      = $2
          AND COALESCE(tenant_id, '') = COALESCE($3, '')`,
      [secretKey, opts.scope, opts.tenantId ?? null, opts.updatedBy],
    );
    invalidateSecret(secretKey, opts.tenantId ?? null);
    return { ok: true };
  }

  const enc = encryptSecret(plainValue);
  await pool.query(
    `INSERT INTO dos.platform_secret
       (secret_key, scope, tenant_id, value_ciphertext, value_iv, value_tag,
        version, is_active, updated_at, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, 1, true, now(), $7)
     ON CONFLICT (secret_key, scope, COALESCE(tenant_id, ''))
     DO UPDATE
        SET value_ciphertext = EXCLUDED.value_ciphertext,
            value_iv         = EXCLUDED.value_iv,
            value_tag        = EXCLUDED.value_tag,
            version          = dos.platform_secret.version + 1,
            is_active        = true,
            updated_at       = now(),
            updated_by       = EXCLUDED.updated_by`,
    [
      secretKey, opts.scope, opts.tenantId ?? null,
      enc.ciphertext, enc.iv, enc.tag,
      opts.updatedBy,
    ],
  );
  invalidateSecret(secretKey, opts.tenantId ?? null);
  return { ok: true };
}

/**
 * List catalog + populated rows for the admin UI. Values are NEVER
 * returned in plaintext — only metadata + a masked preview is exposed.
 */
export interface SecretListEntry {
  secretKey: string;
  category: string;
  displayLabel: string;
  description: string | null;
  isSensitive: boolean;
  consumerService: string | null;
  scope: 'platform' | 'tenant' | null;
  tenantId: string | null;
  hasValue: boolean;
  maskedPreview: string | null;
  version: number | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function listSecrets(opts: { tenantId?: string | null } = {}): Promise<SecretListEntry[]> {
  const pool = getPool();
  if (!pool) return [];
  const r = await pool.query<{
    secret_key: string; category: string; display_label: string; description: string | null;
    is_sensitive: boolean; consumer_service: string | null;
    scope: string | null; tenant_id: string | null;
    has_value: boolean; version: number | null; updated_at: string | null; updated_by: string | null;
    value_ciphertext: Buffer | null; value_iv: Buffer | null; value_tag: Buffer | null;
  }>(
    `SELECT d.secret_key, d.category, d.display_label, d.description,
            d.is_sensitive, d.consumer_service,
            s.scope, s.tenant_id,
            (s.value_ciphertext IS NOT NULL AND s.is_active) AS has_value,
            s.version, s.updated_at, s.updated_by,
            s.value_ciphertext, s.value_iv, s.value_tag
       FROM dos.platform_secret_definition d
  LEFT JOIN LATERAL (
        SELECT *
          FROM dos.platform_secret p
         WHERE p.secret_key = d.secret_key
           AND p.is_active = true
           AND (
             (p.scope = 'tenant'   AND p.tenant_id = $1) OR
             (p.scope = 'platform' AND p.tenant_id IS NULL)
           )
         ORDER BY (p.scope = 'tenant') DESC
         LIMIT 1
       ) s ON true
   ORDER BY d.category, d.secret_key`,
    [opts.tenantId ?? null],
  );

  return r.rows.map((row) => {
    let masked: string | null = null;
    if (row.has_value && !row.is_sensitive && row.value_ciphertext && row.value_iv && row.value_tag) {
      try {
        masked = decryptSecret(row.value_ciphertext, row.value_iv, row.value_tag);
      } catch { masked = null; }
    } else if (row.has_value) {
      masked = '••••••••';
    }
    return {
      secretKey: row.secret_key,
      category: row.category,
      displayLabel: row.display_label,
      description: row.description,
      isSensitive: row.is_sensitive,
      consumerService: row.consumer_service,
      scope: (row.scope as 'platform' | 'tenant' | null) ?? null,
      tenantId: row.tenant_id,
      hasValue: !!row.has_value,
      maskedPreview: masked,
      version: row.version ?? null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      updatedBy: row.updated_by,
    };
  });
}
