import {  safeQuery } from '@dos/db';

export async function blacklistToken(jti: string, userIdOrTtl?: string | number, expiresInSeconds?: number): Promise<void> {
  let userId: string | null = null;
  let ttl = 86400;
  if (typeof userIdOrTtl === 'string') {
    userId = userIdOrTtl;
    ttl = expiresInSeconds ?? 86400;
  } else if (typeof userIdOrTtl === 'number') {
    ttl = userIdOrTtl;
  }
  const expiresAt = new Date(Date.now() + ttl * 1000);
  await safeQuery(
    `INSERT INTO token_blacklist (jti, user_id, expires_at, is_active)
     VALUES ($1, $2, $3, FALSE)
     ON CONFLICT (jti) DO UPDATE SET is_active = FALSE, expires_at = GREATEST(token_blacklist.expires_at, EXCLUDED.expires_at)`,
    [jti, userId, expiresAt],
  );
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const result = await safeQuery(
    `SELECT 1 FROM token_blacklist WHERE jti = $1 AND expires_at > NOW() AND COALESCE(is_active, FALSE) = FALSE LIMIT 1`,
    [jti],
  );
  return result.rows.length > 0;
}

export async function registerActiveJtiForUser(userId: string, jti: string, expiresInSeconds: number): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  await safeQuery(
    `INSERT INTO token_blacklist (jti, user_id, expires_at, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (jti) DO UPDATE SET is_active = TRUE, expires_at = EXCLUDED.expires_at`,
    [jti, userId, expiresAt],
  );
}

export async function removeActiveJtiForUser(userId: string, jti: string): Promise<void> {
  await safeQuery(
    `UPDATE token_blacklist SET is_active = FALSE WHERE jti = $1 AND user_id = $2`,
    [jti, userId],
  );
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await safeQuery(
    `UPDATE token_blacklist SET is_active = FALSE WHERE user_id = $1`,
    [userId],
  );
}
