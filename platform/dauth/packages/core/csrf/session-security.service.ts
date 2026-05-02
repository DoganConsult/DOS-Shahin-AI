import { safeQuery } from '@dos/db';
import { publish } from '../events/publish-with-dsoc';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { logger } from '@dos/platform-core/observability';
import type { SessionSecurityEventType, SessionRiskLevel, SessionSecurityEventRow } from './csrf-policy.contracts';

export interface RecordSessionEventOpts {
  sessionId: string;
  tenantId: string;
  userId: string;
  eventType: SessionSecurityEventType;
  riskLevel: SessionRiskLevel;
  metadata?: Record<string, unknown>;
}

/** Persist a session security event to DB + publish to event bus. */
export async function recordSessionSecurityEvent(opts: RecordSessionEventOpts): Promise<void> {
  await safeQuery(
    `INSERT INTO session_security_events
       (session_id, tenant_id, user_id, event_type, risk_level, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [opts.sessionId, opts.tenantId, opts.userId, opts.eventType, opts.riskLevel, JSON.stringify(opts.metadata ?? {})],
  ).catch((err) => {
    logger.warn('[Session:Security] Failed to persist event', { error: (err as Error).message });
  });

  if (opts.riskLevel === 'high' || opts.riskLevel === 'critical') {
    await publish('session.anomaly.detected', opts.tenantId, {
      sessionId: opts.sessionId,
      userId: opts.userId,
      eventType: opts.eventType,
      riskLevel: opts.riskLevel,
    }).catch(catchHandler(EC.EVENT_BUS));
  }
}

/** Compute server-side session health score from recent events. */
export async function getSessionHealthScore(sessionId: string): Promise<{
  score: number;
  state: 'healthy' | 'unstable' | 'degraded' | 'expired';
  recentEvents: number;
}> {
  try {
    const { rows } = await safeQuery(
      `SELECT risk_level, COUNT(*)::int AS cnt
       FROM session_security_events
       WHERE session_id = $1 AND occurred_at > NOW() - INTERVAL '5 minutes'
       GROUP BY risk_level`,
      [sessionId],
    );

    let weighted = 0;
    let total = 0;
    for (const r of rows as Array<{ risk_level: string; cnt: number }>) {
      const w = r.risk_level === 'critical' ? 4 : r.risk_level === 'high' ? 3 : r.risk_level === 'medium' ? 2 : 1;
      weighted += w * r.cnt;
      total += r.cnt;
    }

    let state: 'healthy' | 'unstable' | 'degraded' | 'expired';
    let score: number;

    if (weighted >= 12) {
      state = 'degraded';
      score = Math.max(0, 20 - (weighted - 12) * 5);
    } else if (weighted >= 6) {
      state = 'unstable';
      score = Math.max(20, 60 - (weighted - 6) * 7);
    } else {
      state = 'healthy';
      score = Math.max(60, 100 - weighted * 10);
    }

    return { score, state, recentEvents: total };
  } catch {
    return { score: 100, state: 'healthy', recentEvents: 0 };
  }
}

/** Detect anomalies by comparing current request against session history. */
export async function detectSessionAnomalies(
  sessionId: string,
  tenantId: string,
  userId: string,
  currentIp: string,
  currentUa: string,
): Promise<SessionSecurityEventType[]> {
  const anomalies: SessionSecurityEventType[] = [];

  try {
    const { rows } = await safeQuery(
      `SELECT ip_address, user_agent FROM active_sessions WHERE session_id = $1`,
      [sessionId],
    );

    if (rows[0]) {
      const session = rows[0] as { ip_address: string; user_agent: string };
      if (session.ip_address && session.ip_address !== currentIp) {
        anomalies.push('ip_changed');
        await recordSessionSecurityEvent({
          sessionId, tenantId, userId,
          eventType: 'ip_changed',
          riskLevel: 'high',
          metadata: { previousIp: session.ip_address, currentIp },
        });
      }
      if (session.user_agent && session.user_agent !== currentUa) {
        anomalies.push('ua_changed');
        await recordSessionSecurityEvent({
          sessionId, tenantId, userId,
          eventType: 'ua_changed',
          riskLevel: 'medium',
          metadata: { previousUa: session.user_agent, currentUa },
        });
      }
    }
  } catch (err) {
    logger.debug('[Session:Security] Anomaly detection degraded', { error: (err as Error).message });
  }

  return anomalies;
}

/** Get recent session security events for diagnostics. */
export async function getSessionSecurityEvents(
  tenantId: string,
  limit = 50,
): Promise<Array<{
  eventId: string;
  sessionId: string;
  userId: string;
  eventType: string;
  riskLevel: string;
  occurredAt: string;
}>> {
  const { rows } = await safeQuery(
    `SELECT event_id, session_id, user_id, event_type, risk_level, occurred_at
     FROM session_security_events
     WHERE tenant_id = $1
     ORDER BY occurred_at DESC LIMIT $2`,
    [tenantId, limit],
  );
  return (rows as SessionSecurityEventRow[]).map(r => ({
    eventId: r.event_id,
    sessionId: r.session_id,
    userId: r.user_id,
    eventType: r.event_type,
    riskLevel: r.risk_level,
    occurredAt: (r.occurred_at as unknown as Date)?.toISOString?.() ?? '',
  }));
}
