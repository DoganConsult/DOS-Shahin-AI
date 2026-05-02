/**
 * AuditService — Real DB implementation (extracted from audit-service/src/domain/audit.service.ts + adapted)
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { randomUUID } from 'crypto';
import { Request } from 'express';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditEntry {
  tenantId: string;
  action: string;
  entityType: string;
  entityId?: string;
  actorId: string;
  actorRole?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  severity?: AuditSeverity;
  correlationId?: string;
}

export async function setAuditData(entry: AuditEntry): Promise<void> {
  const id = randomUUID();
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.audit_trail
       (id, tenant_id, action, entity_type, entity_id, actor_id, actor_role,
        changes, metadata, severity, correlation_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, entry.tenantId, entry.action, entry.entityType,
     entry.entityId ?? null, entry.actorId, entry.actorRole ?? null,
     JSON.stringify(entry.changes ?? {}), JSON.stringify(entry.metadata ?? {}),
     entry.severity ?? 'info', entry.correlationId ?? null],
  ).catch(err => {
    // Audit failures MUST NOT block business operations
    logger.error('[Audit] Failed to write audit trail', { action: entry.action, error: String(err) });
  });
}

export function setAuditDataFromRequest(
  req: Request & { user?: { id: string; role?: string }; tenantId?: string },
  action: string, entityType: string, opts?: {
    entityId?: string; changes?: Record<string, unknown>;
    metadata?: Record<string, unknown>; severity?: AuditSeverity;
  },
): Promise<void> {
  return setAuditData({ tenantId: req.tenantId! ?? '',
    action,
    entityType,
    entityId: opts?.entityId,
    actorId: req.user?.id ?? 'system',
    actorRole: req.user?.role,
    changes: opts?.changes,
    metadata: opts?.metadata,
    severity: opts?.severity ?? 'info',
  });
}

export async function queryAuditTrail(tenantId: string, opts: {
  entityType?: string; entityId?: string; actorId?: string;
  action?: string; severity?: AuditSeverity;
  from?: string; to?: string; limit?: number; offset?: number;
}): Promise<{ data: unknown[]; total: number }> {
  const conds = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;
  if (opts.entityType) { conds.push(`entity_type = $${idx++}`); params.push(opts.entityType); }
  if (opts.entityId)   { conds.push(`entity_id = $${idx++}`);   params.push(opts.entityId); }
  if (opts.actorId)    { conds.push(`actor_id = $${idx++}`);    params.push(opts.actorId); }
  if (opts.action)     { conds.push(`action = $${idx++}`);      params.push(opts.action); }
  if (opts.severity)   { conds.push(`severity = $${idx++}`);    params.push(opts.severity); }
  if (opts.from)       { conds.push(`created_at >= $${idx++}`); params.push(opts.from); }
  if (opts.to)         { conds.push(`created_at <= $${idx++}`); params.push(opts.to); }
  const where = `WHERE ${conds.join(' AND ')}`;
  const limit = Math.min(opts.limit ?? 50, 500);
  const offset = opts.offset ?? 0;
  const [c, d] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS total FROM __TENANT_SCHEMA__.audit_trail ${where}`, params),
    safeQuery(
      `SELECT id, action, entity_type, entity_id, actor_id, actor_role,
              changes, metadata, severity, correlation_id, created_at
       FROM __TENANT_SCHEMA__.audit_trail ${where}
       ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, params,
    ),
  ]);
  return { data: d.rows, total: (c.rows[0] as { total: number })?.total ?? 0 };
}

export async function getAuditSummary(tenantId: string, days = 7): Promise<{
  total: number; byAction: Record<string, number>; bySeverity: Record<string, number>;
}> {
  const [byAction, bySeverity, total] = await Promise.all([
    safeQuery(
      `SELECT action, COUNT(*)::int AS count FROM __TENANT_SCHEMA__.audit_trail
       WHERE tenant_id = $1 AND created_at >= NOW() - ($2 || ' days')::INTERVAL
       GROUP BY action ORDER BY count DESC LIMIT 20`,
      [tenantId, days],
    ),
    safeQuery(
      `SELECT severity, COUNT(*)::int AS count FROM __TENANT_SCHEMA__.audit_trail
       WHERE tenant_id = $1 AND created_at >= NOW() - ($2 || ' days')::INTERVAL
       GROUP BY severity`,
      [tenantId, days],
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS total FROM __TENANT_SCHEMA__.audit_trail
       WHERE tenant_id = $1 AND created_at >= NOW() - ($2 || ' days')::INTERVAL`,
      [tenantId, days],
    ),
  ]);

  const byActionMap: Record<string, number> = {};
  for (const row of byAction.rows as Array<{ action: string; count: number }>) {
    byActionMap[row.action] = row.count;
  }
  const bySeverityMap: Record<string, number> = {};
  for (const row of bySeverity.rows as Array<{ severity: string; count: number }>) {
    bySeverityMap[row.severity] = row.count;
  }

  return {
    total: (total.rows[0] as { total: number })?.total ?? 0,
    byAction: byActionMap,
    bySeverity: bySeverityMap,
  };
}

export const AuditService = { setAuditData, setAuditDataFromRequest, queryAuditTrail, getAuditSummary };
