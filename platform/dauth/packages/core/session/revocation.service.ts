import {  safeQuery } from '@dos/db';
import { blacklistToken, revokeAllUserTokens } from './token-blacklist.service';
import { revokeAllFamiliesForUser } from './refresh.service';
import { publish } from '../events/publish-with-dsoc';
import { logger } from '@dos/platform-core/observability';

export async function revokeSession(
  userId: string,
  jti: string,
  reason: string,
  revokedBy: string,
): Promise<void> {
  await blacklistToken(jti, userId);
  logger.info('[DAuth:Revocation] session revoked', { userId, jti, reason, revokedBy });
  await publish('dauth.session.revoked', '', {
    userId,
    jti,
    reason,
    revokedBy,
    revokedAt: new Date().toISOString(),
  });
}

export async function revokeAllUserSessions(
  userId: string,
  reason: string,
  revokedBy: string,
): Promise<{ tokensRevoked: number; familiesRevoked: number }> {
  const [, familiesRevoked] = await Promise.all([
    revokeAllUserTokens(userId),
    revokeAllFamiliesForUser(userId),
  ]);
  await publish('dauth.sessions.bulk_revoked', '', {
    userId,
    reason,
    revokedBy,
    familiesRevoked,
    revokedAt: new Date().toISOString(),
  });
  logger.info('[DAuth:Revocation] all user sessions revoked', { userId, reason, revokedBy, familiesRevoked });
  return { tokensRevoked: 0, familiesRevoked };
}

export async function revokeSessionsByTenant(
  tenantId: string,
  reason: string,
  revokedBy: string,
): Promise<number> {
  const { rows } = await safeQuery(
    `SELECT DISTINCT user_id FROM tenant_user_memberships WHERE tenant_id = $1 AND status = 'active'`,
    [tenantId],
  );
  let count = 0;
  for (const row of rows) {
    await revokeAllUserSessions(row.user_id, reason, revokedBy);
    count++;
  }
  return count;
}
