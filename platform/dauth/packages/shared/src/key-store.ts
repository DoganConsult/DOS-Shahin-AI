/**
 * JWT Key Store — manages multiple signing keys for rotation without downtime.
 *
 * - One key is 'active' at a time (used for signing new tokens).
 * - 'retired' keys are still valid for verification until their tokens expire.
 * - 'revoked' keys are no longer valid for anything.
 *
 * Falls back to JWT_SECRET env var when no keys exist in the DB (backward compat).
 */
import { randomBytes, randomUUID } from 'crypto';

export interface SigningKey {
  kid: string;
  secret: string;
  algorithm: string;
  status: 'active' | 'retired' | 'revoked';
  createdAt: string;
  retiredAt: string | null;
  expiresAt: string | null;
}

// ── In-memory cache (refreshed periodically) ──

let _cachedKeys: SigningKey[] | null = null;
let _cacheExpiry = 0;
const CACHE_TTL_MS = 30_000; // 30s — short enough that rotation propagates quickly

async function loadKeysFromDb(): Promise<SigningKey[]> {
  try {
    const { safeQuery } = require('@dos/db');
    const { rows } = await safeQuery(
      `SELECT kid, secret, algorithm, status, created_at, retired_at, expires_at
       FROM jwt_signing_keys
       WHERE status IN ('active', 'retired')
       ORDER BY created_at DESC`,
    );
    return rows.map((r: any) => ({
      kid: r.kid,
      secret: r.secret,
      algorithm: r.algorithm,
      status: r.status,
      createdAt: r.created_at?.toISOString?.() ?? r.created_at,
      retiredAt: r.retired_at?.toISOString?.() ?? r.retired_at ?? null,
      expiresAt: r.expires_at?.toISOString?.() ?? r.expires_at ?? null,
    }));
  } catch {
    return [];
  }
}

async function getKeys(): Promise<SigningKey[]> {
  if (_cachedKeys && Date.now() < _cacheExpiry) return _cachedKeys;
  _cachedKeys = await loadKeysFromDb();
  _cacheExpiry = Date.now() + CACHE_TTL_MS;
  return _cachedKeys;
}

/** Invalidate the in-memory key cache (call after rotation). */
export function invalidateKeyCache(): void {
  _cachedKeys = null;
  _cacheExpiry = 0;
}

/**
 * Get the active signing key. Returns null if no active key exists in DB
 * (caller should fall back to JWT_SECRET env var).
 */
export async function getActiveSigningKey(): Promise<SigningKey | null> {
  const keys = await getKeys();
  return keys.find(k => k.status === 'active') ?? null;
}

/**
 * Get the signing key for a specific kid. Used during token verification.
 * Returns null if kid not found (caller should fall back to JWT_SECRET).
 */
export async function getKeyByKid(kid: string): Promise<SigningKey | null> {
  const keys = await getKeys();
  return keys.find(k => k.kid === kid) ?? null;
}

/**
 * List all keys (without exposing secrets). For admin endpoints.
 */
export async function listKeys(): Promise<Omit<SigningKey, 'secret'>[]> {
  const keys = await getKeys();
  return keys.map(({ secret: _s, ...rest }) => rest);
}

/**
 * Rotate: generate a new active key, retire the current active key.
 * Returns the new active key's kid.
 */
export async function rotateSigningKey(): Promise<string> {
  const { safeQuery } = require('@dos/db');
  const newKid = randomUUID();
  const newSecret = randomBytes(64).toString('base64url');

  // Retire the current active key
  await safeQuery(
    `UPDATE jwt_signing_keys SET status = 'retired', retired_at = NOW() WHERE status = 'active'`,
  );

  // Insert the new active key
  await safeQuery(
    `INSERT INTO jwt_signing_keys (kid, secret, algorithm, status, created_at)
     VALUES ($1, $2, 'HS256', 'active', NOW())`,
    [newKid, newSecret],
  );

  invalidateKeyCache();
  return newKid;
}

/**
 * Revoke a specific key by kid. Revoked keys cannot be used for signing or verification.
 */
export async function revokeKey(kid: string): Promise<void> {
  const { safeQuery } = require('@dos/db');
  await safeQuery(
    `UPDATE jwt_signing_keys SET status = 'revoked', retired_at = COALESCE(retired_at, NOW()) WHERE kid = $1`,
    [kid],
  );
  invalidateKeyCache();
}
