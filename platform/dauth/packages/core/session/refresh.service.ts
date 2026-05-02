import { v4 as uuid } from 'uuid';
import {  safeQuery } from '@dos/db';
import type { RefreshTokenFamily } from '../types/dauth.types';

export async function createRefreshFamily(
  userId: string,
  tenantId: string,
  jti: string,
  expiresAt: Date,
): Promise<RefreshTokenFamily> {
  const familyId = uuid();
  await safeQuery(
    `INSERT INTO refresh_token_families (family_id, user_id, tenant_id, current_jti, rotation_count, status, expires_at)
     VALUES ($1, $2, $3, $4, 0, 'active', $5)`,
    [familyId, userId, tenantId, jti, expiresAt],
  );
  return {
    familyId,
    userId,
    tenantId,
    currentJti: jti,
    rotationCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function rotateRefreshToken(
  familyId: string,
  oldJti: string,
  newJti: string,
): Promise<boolean> {
  const result = await safeQuery(
    `UPDATE refresh_token_families
     SET current_jti = $1, rotation_count = rotation_count + 1, updated_at = NOW()
     WHERE family_id = $2 AND current_jti = $3 AND status = 'active'`,
    [newJti, familyId, oldJti],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function revokeRefreshFamily(familyId: string): Promise<void> {
  await safeQuery(
    `UPDATE refresh_token_families SET status = 'revoked', updated_at = NOW()
     WHERE family_id = $1`,
    [familyId],
  );
}

export async function revokeAllFamiliesForUser(userId: string): Promise<number> {
  const result = await safeQuery(
    `UPDATE refresh_token_families SET status = 'revoked', updated_at = NOW()
     WHERE user_id = $1 AND status = 'active'`,
    [userId],
  );
  return result.rowCount ?? 0;
}

export async function getActiveFamily(familyId: string): Promise<RefreshTokenFamily | null> {
  const { rows } = await safeQuery(
    `SELECT family_id, user_id, tenant_id, current_jti, rotation_count, status, created_at, expires_at
     FROM refresh_token_families
     WHERE family_id = $1 AND status = 'active' AND expires_at > NOW() LIMIT 1`,
    [familyId],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    familyId: r.family_id,
    userId: r.user_id,
    tenantId: r.tenant_id,
    currentJti: r.current_jti,
    rotationCount: r.rotation_count,
    status: r.status,
    createdAt: r.created_at?.toISOString?.() ?? '',
    expiresAt: r.expires_at?.toISOString?.() ?? '',
  };
}

export async function detectReplayAttack(familyId: string, presentedJti: string): Promise<boolean> {
  const family = await getActiveFamily(familyId);
  if (!family) return false;
  return family.currentJti !== presentedJti;
}

export async function cleanupExpiredFamilies(): Promise<number> {
  const result = await safeQuery(
    `DELETE FROM refresh_token_families WHERE expires_at < NOW() OR status = 'revoked'`,
  );
  return result.rowCount ?? 0;
}
