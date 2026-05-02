import {  safeQuery } from '@dos/db';
import type { SessionContext, SessionStatus } from '../types/dauth.types';
import type { SessionRow } from '../types/db-rows';

function deriveStatus(row: SessionRow): SessionStatus {
  if (row.revoked_at) return 'revoked';
  if (row.expires_at && new Date(row.expires_at) < new Date()) return 'expired';
  return 'active';
}

function mapRow(row: SessionRow): SessionContext {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    principalType: 'human',
    ip: row.ip_address ?? '',
    userAgent: row.user_agent ?? '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    lastActivityAt: row.last_active_at ? new Date(row.last_active_at).toISOString() : '',
    status: deriveStatus(row),
  };
}

export async function getSessionContext(sessionId: string): Promise<SessionContext | null> {
  const { rows } = await safeQuery(
    `SELECT session_id, user_id, tenant_id, ip_address, user_agent,
            created_at, last_active_at, expires_at, revoked_at
     FROM platform_dauth.sessions
     WHERE session_id = $1 LIMIT 1`,
    [sessionId],
  );
  if (!rows[0]) return null;
  return mapRow(rows[0]);
}

export async function recordSessionActivity(sessionId: string): Promise<void> {
  try {
    await safeQuery(
      `UPDATE platform_dauth.sessions SET last_active_at = NOW() WHERE session_id = $1`,
      [sessionId],
    );
  } catch { /* non-critical heartbeat — swallow */ }
}

export async function createSessionRecord(
  sessionId: string,
  userId: string,
  tenantId: string,
  ip: string,
  userAgent: string,
): Promise<void> {
  await safeQuery(
    `INSERT INTO platform_dauth.sessions (session_id, user_id, tenant_id, jti, ip_address, user_agent, last_active_at, expires_at)
     VALUES ($1, $2, $3, '', $4, $5, NOW(), NOW() + INTERVAL '1 day')
     ON CONFLICT (session_id) DO UPDATE SET last_active_at = NOW()`,
    [sessionId, userId, tenantId, ip, userAgent],
  );
}

export async function getActiveSessionsForUser(userId: string): Promise<SessionContext[]> {
  const { rows } = await safeQuery(
    `SELECT session_id, user_id, tenant_id, ip_address, user_agent,
            created_at, last_active_at, expires_at, revoked_at
     FROM platform_dauth.sessions
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY last_active_at DESC`,
    [userId],
  );
  return rows.map(mapRow);
}

export async function terminateExpiredSessions(timeoutMinutes: number): Promise<number> {
  const result = await safeQuery(
    `UPDATE platform_dauth.sessions SET revoked_at = NOW()
     WHERE revoked_at IS NULL AND last_active_at < NOW() - INTERVAL '1 minute' * $1`,
    [timeoutMinutes],
  );
  return result.rowCount ?? 0;
}
