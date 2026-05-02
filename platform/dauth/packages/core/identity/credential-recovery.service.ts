import * as crypto from 'crypto';
import {  safeQuery } from '@dos/db';
import { publish } from '../events/publish-with-dsoc';
import { catchHandler, EC } from '@dos/platform-core/resilience';

/**
 * Hash a raw token for secure storage (never store raw tokens in DB).
 */
function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function requestPasswordReset(
  email: string,
  tenantId: string,
): Promise<{ token: string; expiresAt: Date } | null> {
  const { rows } = await safeQuery(
    `SELECT user_id FROM users WHERE LOWER(email) = LOWER($1) AND status = 'active' LIMIT 1`,
    [email],
  );
  if (!rows[0]) return null;

  const userId = rows[0].user_id;
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60_000);

  // Invalidate any existing unused tokens for this user
  await safeQuery(
    `UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
    [userId],
  );

  // Insert new token (table: token_id, user_id, token_hash, expires_at, used, created_at)
  await safeQuery(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );

  await publish('dauth.password_reset.requested', tenantId, {
    userId,
    email,
    requestedAt: new Date().toISOString(),
  }).catch(catchHandler(EC.EVENT_BUS));

  return { token, expiresAt };
}

export async function validateResetToken(token: string): Promise<{ userId: string; tenantId: string } | null> {
  const tokenHash = hashToken(token);
  const { rows } = await safeQuery(
    `SELECT prt.user_id, u.tenant_id
     FROM password_reset_tokens prt
     JOIN users u ON u.user_id = prt.user_id
     WHERE prt.token_hash = $1 AND prt.expires_at > NOW() AND prt.used = FALSE
     LIMIT 1`,
    [tokenHash],
  );
  return rows[0] ? { userId: rows[0].user_id, tenantId: rows[0].tenant_id } : null;
}

export async function completePasswordReset(token: string, newPasswordHash: string): Promise<boolean> {
  const valid = await validateResetToken(token);
  if (!valid) return false;

  await safeQuery(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2`,
    [newPasswordHash, valid.userId],
  );

  const tokenHash = hashToken(token);
  await safeQuery(
    `UPDATE password_reset_tokens SET used = TRUE WHERE token_hash = $1`,
    [tokenHash],
  );

  await publish('dauth.password_reset.completed', valid.tenantId, {
    userId: valid.userId,
    completedAt: new Date().toISOString(),
  }).catch(catchHandler(EC.EVENT_BUS));

  return true;
}

export async function requestEmailVerification(
  userId: string,
  _email: string,
  _tenantId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000);

  await safeQuery(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt],
  );

  return { token, expiresAt };
}

export async function verifyEmail(token: string): Promise<boolean> {
  const { rows } = await safeQuery(
    `SELECT user_id FROM email_verification_tokens
     WHERE token = $1 AND expires_at > NOW() LIMIT 1`,
    [token],
  );
  if (!rows[0]) return false;

  await safeQuery(
    `UPDATE users SET email_verified = TRUE, status = 'active', updated_at = NOW() WHERE user_id = $1`,
    [rows[0].user_id],
  );

  await safeQuery(
    `DELETE FROM email_verification_tokens WHERE token = $1`,
    [token],
  );

  return true;
}
