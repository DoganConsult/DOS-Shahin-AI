import {  safeQuery } from '@dos/db';
import { publish } from '../events/publish-with-dsoc';
import type { SecurityEventType } from '../types/dauth.types';
import type { SecurityEventRow } from '../types/db-rows';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface SecurityEvent {
  eventId: string;
  tenantId: string;
  userId: string;
  eventType: SecurityEventType;
  ip: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export async function logSecurityEvent(
  tenantId: string,
  userId: string,
  eventType: SecurityEventType,
  opts?: { ip?: string; userAgent?: string; metadata?: Record<string, unknown> },
): Promise<void> {
  await safeQuery(
    `INSERT INTO security_events (tenant_id, user_id, event_type, ip, user_agent, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [tenantId, userId, eventType, opts?.ip ?? null, opts?.userAgent ?? null, JSON.stringify(opts?.metadata ?? {})],
  ).catch(catchHandler(EC.EVENT_BUS));

  await publish('dauth.security_event', tenantId, {
    userId,
    eventType,
    occurredAt: new Date().toISOString(),
  }).catch(catchHandler(EC.EVENT_BUS));
}

export async function getSecurityEvents(
  tenantId: string,
  userId?: string,
  opts?: { eventType?: SecurityEventType; limit?: number; since?: string },
): Promise<SecurityEvent[]> {
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (userId) {
    conditions.push(`user_id = $${idx++}`);
    params.push(userId);
  }
  if (opts?.eventType) {
    conditions.push(`event_type = $${idx++}`);
    params.push(opts.eventType);
  }
  if (opts?.since) {
    conditions.push(`created_at >= $${idx++}`);
    params.push(opts.since);
  }

  const limit = opts?.limit ?? 100;
  const { rows } = await safeQuery(
    `SELECT event_id, tenant_id, user_id, event_type, ip, user_agent, metadata, created_at
     FROM security_events
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC LIMIT ${limit}`,
    params,
  );
  return (rows as SecurityEventRow[]).map((r) => ({
    eventId: r.event_id,
    tenantId: r.tenant_id,
    userId: r.user_id,
    eventType: r.event_type as SecurityEventType,
    ip: r.ip ?? '',
    userAgent: r.user_agent ?? '',
    metadata: r.metadata ?? {},
    createdAt: (r.created_at as unknown as Date)?.toISOString?.() ?? '',
  }));
}

export async function getRecentFailedLogins(tenantId: string, since: string): Promise<SecurityEvent[]> {
  return getSecurityEvents(tenantId, undefined, { eventType: 'login_failure', since });
}

export async function getSecurityEventSummary(
  tenantId: string,
  since: string,
): Promise<Record<SecurityEventType, number>> {
  const { rows } = await safeQuery(
    `SELECT event_type, COUNT(*) AS cnt FROM security_events
     WHERE tenant_id = $1 AND created_at >= $2
     GROUP BY event_type`,
    [tenantId, since],
  );
  const summary: Record<string, number> = {};
  for (const r of (rows as Array<{ event_type: string; cnt: string }>)) {
    summary[r.event_type] = parseInt(r.cnt, 10);
  }
  return summary as Record<SecurityEventType, number>;
}
