import { safeQuery } from '@dos/db';
import { publish } from '../events/publish-with-dsoc';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { logger } from '@dos/platform-core/observability';
import type { CsrfFailureReason, CsrfFailureRow } from './csrf-policy.contracts';

export interface RecordCsrfFailureOpts {
  tenantId?: string;
  sessionId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path: string;
  method: string;
  reason: CsrfFailureReason;
  hintReturned?: string;
  correlationId?: string;
}

/** Persist a CSRF failure to DB + publish security event + log. */
export async function recordCsrfFailure(opts: RecordCsrfFailureOpts): Promise<void> {
  // DB persistence
  await safeQuery(
    `INSERT INTO csrf_failures
       (tenant_id, session_id, user_id, ip_address, user_agent, path, method,
        reason, hint_returned, correlation_id)
     VALUES ($1, $2, $3, $4::inet, $5, $6, $7, $8, $9, $10)`,
    [
      opts.tenantId ?? null, opts.sessionId ?? null, opts.userId ?? null,
      opts.ip ?? null, opts.userAgent ?? null, opts.path, opts.method,
      opts.reason, opts.hintReturned ?? null, opts.correlationId ?? null,
    ],
  ).catch((err) => {
    logger.warn('[CSRF:Audit] Failed to persist failure', { error: (err as Error).message });
  });

  // Structured log (always)
  logger.warn('[CSRF] Validation failed', {
    event: 'csrf_failure',
    reason: opts.reason,
    ip: opts.ip,
    path: opts.path,
    method: opts.method,
    tenantId: opts.tenantId,
    correlationId: opts.correlationId,
  });

  // Event bus (for subscribers — alerting, rate limiting, etc.)
  if (opts.tenantId) {
    await publish('csrf.validation.failed', opts.tenantId, {
      reason: opts.reason,
      ip: opts.ip,
      path: opts.path,
      userId: opts.userId,
      sessionId: opts.sessionId,
    }).catch(catchHandler(EC.EVENT_BUS));
  }
}

/** Count failures in a time window for rate limiting. */
export async function getCsrfFailureCount(
  ip: string,
  windowMs: number,
): Promise<number> {
  try {
    const { rows } = await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM csrf_failures
       WHERE ip_address = $1::inet AND occurred_at > NOW() - ($2 || ' milliseconds')::interval`,
      [ip, String(windowMs)],
    );
    return parseInt(rows[0]?.cnt ?? '0', 10);
  } catch {
    return 0;
  }
}

/** Get recent CSRF failures for admin dashboard. */
export async function getRecentCsrfFailures(
  tenantId: string,
  limit = 50,
): Promise<Array<{
  failureId: string;
  ip: string;
  path: string;
  method: string;
  reason: string;
  occurredAt: string;
}>> {
  const { rows } = await safeQuery(
    `SELECT failure_id, ip_address, path, method, reason, occurred_at
     FROM csrf_failures
     WHERE tenant_id = $1
     ORDER BY occurred_at DESC LIMIT $2`,
    [tenantId, limit],
  );
  return (rows as CsrfFailureRow[]).map(r => ({
    failureId: r.failure_id,
    ip: r.ip_address ?? '',
    path: r.path,
    method: r.method,
    reason: r.reason,
    occurredAt: (r.occurred_at as unknown as Date)?.toISOString?.() ?? '',
  }));
}
