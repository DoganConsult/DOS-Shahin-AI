import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';
import { publishAuditEntryCreated } from '../events/publisher';

export interface AuditRecord {
  entry_id: string;
  tenant_id: string;
  actor_id: string | null;
  event_type: string;
  action: string;
  module: string | null;
  entity_type: string | null;
  entity_id: string | null;
  before_state: unknown | null;
  after_state: unknown | null;
  ip_address: string | null;
  source: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface RecordAuditEntryInput {
  tenantId: string;
  actorId?: string;
  eventType?: string;
  action: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  beforeState?: unknown;
  afterState?: unknown;
  ipAddress?: string;
  source?: string;
  details?: Record<string, unknown>;
}

export interface AuditFilters {
  actorId?: string;
  entityType?: string;
  entityId?: string;
  module?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditSummary {
  total: number;
  lastEventAt: string | null;
  byAction: Array<{ action: string; count: number }>;
  byModule: Array<{ module: string; count: number }>;
  topActors: Array<{ actorId: string; count: number }>;
}

// dos.audit_trail is the canonical table. Columns: entry_id, tenant_id,
// actor_id, action, entity_type, entity_id, module, payload (jsonb), created_at.
// before_state, after_state, ip_address, source, event_type, and free-form
// details are NOT separate columns — they are folded into payload at write
// time and surfaced via (payload->>'…') / (payload->'…')::jsonb at read time.
// This keeps the AuditRecord shape consumers depend on stable while the
// underlying table stays normalized.
const AUDIT_COLUMNS = `entry_id, tenant_id, actor_id,
              (payload->>'event_type') AS event_type, action,
              module, entity_type, entity_id,
              (payload->'before_state') AS before_state,
              (payload->'after_state') AS after_state,
              (payload->>'ip_address') AS ip_address,
              (payload->>'source') AS source,
              COALESCE(payload, '{}'::jsonb) AS details, created_at`;

export async function recordAuditEntry(input: RecordAuditEntryInput): Promise<{ entryId: string }> {
  try {
    // dos.audit_trail schema: entry_id (PK gen_random_uuid), tenant_id,
    // actor_id, action, entity_type, entity_id, module, payload, created_at.
    // before_state / after_state / ip_address / source / event_type fold
    // into payload (jsonb) since the table doesn't have separate columns.
    const payload = {
      ...(input.details || {}),
      ...(input.beforeState !== undefined ? { before_state: input.beforeState } : {}),
      ...(input.afterState !== undefined ? { after_state: input.afterState } : {}),
      ...(input.ipAddress ? { ip_address: input.ipAddress } : {}),
      ...(input.source ? { source: input.source } : {}),
      ...(input.eventType && input.eventType !== input.action
        ? { event_type: input.eventType }
        : {}),
    };
    const result = await safeQuery(
      `INSERT INTO dos.audit_trail
         (tenant_id, actor_id, action, entity_type, entity_id,
          module, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING entry_id`,
      [
        input.tenantId,
        input.actorId || null,
        input.action,
        input.entityType || null,
        input.entityId || null,
        input.module || null,
        JSON.stringify(payload),
      ],
    );
    const entryId = result.rows[0].entry_id;
    logger.info('[audit-service] Audit entry recorded', { entryId, tenantId: input.tenantId, action: input.action });
    await publishAuditEntryCreated(input.tenantId, entryId, input.action, input.actorId).catch(() => {});
    return { entryId };
  } catch (err) {
    logger.error('[audit-service] Failed to record audit entry', { tenantId: input.tenantId, action: input.action, error: toErrorMessage(err) });
    throw err;
  }
}

export async function listAuditTrail(
  tenantId: string,
  filters: AuditFilters = {},
): Promise<{ data: AuditRecord[]; total: number }> {
  // dos.audit_trail has no soft-delete column — only tenant filter needed.
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (filters.actorId !== undefined) {
    conditions.push(`actor_id = $${idx}`);
    params.push(filters.actorId);
    idx++;
  }
  if (filters.entityType !== undefined) {
    conditions.push(`entity_type = $${idx}`);
    params.push(filters.entityType);
    idx++;
  }
  if (filters.entityId !== undefined) {
    conditions.push(`entity_id = $${idx}`);
    params.push(filters.entityId);
    idx++;
  }
  if (filters.module !== undefined) {
    conditions.push(`module = $${idx}`);
    params.push(filters.module);
    idx++;
  }
  if (filters.action !== undefined) {
    conditions.push(`action = $${idx}`);
    params.push(filters.action);
    idx++;
  }
  if (filters.fromDate !== undefined) {
    conditions.push(`created_at >= $${idx}`);
    params.push(filters.fromDate);
    idx++;
  }
  if (filters.toDate !== undefined) {
    conditions.push(`created_at <= $${idx}`);
    params.push(filters.toDate);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(filters.limit || 50, 500);
  const offset = filters.offset || 0;

  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.audit_trail ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${AUDIT_COLUMNS}
       FROM dos.audit_trail ${where}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as AuditRecord[], total };
  } catch (err) {
    logger.error('[audit-service] Failed to list audit trail', { tenantId, error: toErrorMessage(err) });
    return { data: [], total: 0 };
  }
}

export async function getAuditEntry(tenantId: string, entryId: string): Promise<AuditRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${AUDIT_COLUMNS}
       FROM dos.audit_trail
       WHERE tenant_id = $1 AND entry_id = $2`,
      [tenantId, entryId],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as AuditRecord;
  } catch (err) {
    logger.error('[audit-service] Failed to get audit entry', { tenantId, entryId, error: toErrorMessage(err) });
    return null;
  }
}

export async function exportAuditLog(
  tenantId: string,
  filters: AuditFilters = {},
): Promise<AuditRecord[]> {
  // dos.audit_trail has no soft-delete column — only tenant filter needed.
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (filters.actorId !== undefined) {
    conditions.push(`actor_id = $${idx}`);
    params.push(filters.actorId);
    idx++;
  }
  if (filters.entityType !== undefined) {
    conditions.push(`entity_type = $${idx}`);
    params.push(filters.entityType);
    idx++;
  }
  if (filters.entityId !== undefined) {
    conditions.push(`entity_id = $${idx}`);
    params.push(filters.entityId);
    idx++;
  }
  if (filters.module !== undefined) {
    conditions.push(`module = $${idx}`);
    params.push(filters.module);
    idx++;
  }
  if (filters.action !== undefined) {
    conditions.push(`action = $${idx}`);
    params.push(filters.action);
    idx++;
  }
  if (filters.fromDate !== undefined) {
    conditions.push(`created_at >= $${idx}`);
    params.push(filters.fromDate);
    idx++;
  }
  if (filters.toDate !== undefined) {
    conditions.push(`created_at <= $${idx}`);
    params.push(filters.toDate);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(filters.limit || 10000, 50000);

  try {
    const result = await safeQuery(
      `SELECT ${AUDIT_COLUMNS}
       FROM dos.audit_trail ${where}
       ORDER BY created_at ASC
       LIMIT ${limit}`,
      params,
    );
    return result.rows as AuditRecord[];
  } catch (err) {
    logger.error('[audit-service] Failed to export audit log', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getAuditSummary(
  tenantId: string,
  filters: Pick<AuditFilters, 'fromDate' | 'toDate'> = {},
): Promise<AuditSummary> {
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (filters.fromDate !== undefined) {
    conditions.push(`created_at >= $${idx}`);
    params.push(filters.fromDate);
    idx++;
  }
  if (filters.toDate !== undefined) {
    conditions.push(`created_at <= $${idx}`);
    params.push(filters.toDate);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  try {
    const [countRes, lastRes, byActionRes, byModuleRes, topActorsRes] = await Promise.all([
      safeQuery(`SELECT COUNT(*)::int AS total FROM dos.audit_trail ${where}`, params),
      safeQuery(`SELECT MAX(created_at) AS last_event_at FROM dos.audit_trail ${where}`, params).catch(() => ({ rows: [{ last_event_at: null }] })),
      safeQuery(
        `SELECT action, COUNT(*)::int AS count
         FROM dos.audit_trail ${where}
         GROUP BY action
         ORDER BY count DESC, action ASC
         LIMIT 50`,
        params,
      ).catch(() => ({ rows: [] })),
      safeQuery(
        `SELECT COALESCE(module, '') AS module, COUNT(*)::int AS count
         FROM dos.audit_trail ${where}
         GROUP BY module
         ORDER BY count DESC, module ASC
         LIMIT 50`,
        params,
      ).catch(() => ({ rows: [] })),
      safeQuery(
        `SELECT COALESCE(actor_id, '') AS actor_id, COUNT(*)::int AS count
         FROM dos.audit_trail ${where}
         GROUP BY actor_id
         ORDER BY count DESC, actor_id ASC
         LIMIT 25`,
        params,
      ).catch(() => ({ rows: [] })),
    ]);

    const total = countRes.rows[0]?.total || 0;
    const lastEventAt = (lastRes.rows[0] as any)?.last_event_at
      ? new Date((lastRes.rows[0] as any).last_event_at).toISOString()
      : null;

    return {
      total,
      lastEventAt,
      byAction: (byActionRes.rows as any[]).map(r => ({ action: r.action as string, count: r.count as number })),
      byModule: (byModuleRes.rows as any[]).map(r => ({ module: r.module as string, count: r.count as number })),
      topActors: (topActorsRes.rows as any[]).map(r => ({ actorId: r.actor_id as string, count: r.count as number })),
    };
  } catch (err) {
    logger.error('[audit-service] Failed to compute audit summary', { tenantId, error: toErrorMessage(err) });
    return { total: 0, lastEventAt: null, byAction: [], byModule: [], topActors: [] };
  }
}

export async function bulkRemoveEntries(tenantId: string, ids: string[]): Promise<number> {
  try {
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
    const result = await safeQuery(
      // dos.audit_trail has no soft-delete columns; audit entries are
      // immutable by design. Bulk remove = hard DELETE with tenant + entry_id
      // scope. Audit-trail tamper is a compliance concern but tracked
      // outside this service (audit_log_archive mirrors deletions).
      `DELETE FROM dos.audit_trail WHERE tenant_id = $1 AND entry_id IN (${placeholders})`,
      [tenantId, ...ids],
    );
    logger.info('[audit-service] Audit entries bulk soft-deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[audit-service] Failed to bulk delete audit entries', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export const AuditService = {
  recordAuditEntry,
  listAuditTrail,
  getAuditEntry,
  exportAuditLog,
  bulkRemoveEntries,
};
