import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { emitRecordsEvent } from '../services/records-event.service';
import { randomUUID } from 'crypto';
import type { RecordsStatus } from '../types/records.types';

export interface StuckRecordEntry {
  recordId: string;
  title: string;
  status: RecordsStatus;
  stuckSinceDays: number;
  hasActiveWorkflow: boolean;
  hasLegalHold: boolean;
}

export interface RecordsAdminSummary {
  tenantId: string;
  generatedAt: string;
  totalRecords: number;
  byStatus: Record<string, number>;
  stuckDisposalPendingCount: number;
  recordsOnHoldCount: number;
  orphanedRecordsCount: number;
}

export interface BulkStatusOverrideResult {
  updated: number;
  failed: number;
  recordIds: string[];
}

export async function getAdminSummary(tenantId: string): Promise<RecordsAdminSummary> {
  const schema = tenantSchema(tenantId);

  const totalResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".records WHERE deleted_at IS NULL`,
  );
  const totalRecords = getFirstRow(totalResult)?.total ?? 0;

  const byStatusResult = await safeQuery(
    `SELECT status, COUNT(*)::int AS cnt FROM "${schema}".records WHERE deleted_at IS NULL GROUP BY status`,
  );
  const byStatus: Record<string, number> = {};
  for (const row of byStatusResult.rows ?? []) {
    byStatus[(row as Record<string, unknown>).status as string] = (row as Record<string, unknown>).cnt as number;
  }

  const stuckDisposalResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".records
     WHERE deleted_at IS NULL AND status = 'disposal_pending'
       AND updated_at < NOW() - INTERVAL '14 days'`,
  );
  const stuckDisposalPendingCount = getFirstRow(stuckDisposalResult)?.total ?? 0;

  const holdResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".records WHERE deleted_at IS NULL AND status = 'hold'`,
  );
  const recordsOnHoldCount = getFirstRow(holdResult)?.total ?? 0;

  let orphanedRecordsCount = 0;
  try {
    const orphanResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${schema}".records r
       WHERE r.deleted_at IS NULL
         AND r.source_id IS NOT NULL
         AND r.source_module IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".record_lifecycle_history h WHERE h.record_id = r.record_id
         )
         AND r.status = 'active'
         AND r.created_at < NOW() - INTERVAL '30 days'`,
    );
    orphanedRecordsCount = getFirstRow(orphanResult)?.total ?? 0;
  } catch {
    orphanedRecordsCount = 0;
  }

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    totalRecords,
    byStatus,
    stuckDisposalPendingCount,
    recordsOnHoldCount,
    orphanedRecordsCount,
  };
}

export async function listStuckRecords(
  tenantId: string,
  status: RecordsStatus,
  olderThanDays = 14,
): Promise<StuckRecordEntry[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT
       r.record_id,
       r.title,
       r.status,
       EXTRACT(EPOCH FROM (NOW() - r.updated_at)) / 86400 AS stuck_days,
       EXISTS (
         SELECT 1 FROM "${schema}".record_holds h WHERE h.record_id = r.record_id AND h.released_at IS NULL
       ) AS has_legal_hold
     FROM "${schema}".records r
     WHERE r.deleted_at IS NULL
       AND r.status = $1
       AND r.updated_at < NOW() - ($2 || ' days')::interval
     ORDER BY r.updated_at ASC
     LIMIT 200`,
    [status, String(olderThanDays)],
  );

  return (result.rows ?? []).map((r: Record<string, unknown>) => ({
    recordId: r.record_id as string,
    title: r.title as string,
    status: r.status as RecordsStatus,
    stuckSinceDays: Math.round(r.stuck_days as number),
    hasActiveWorkflow: false,
    hasLegalHold: r.has_legal_hold as boolean,
  }));
}

export async function forceReleaseHold(
  tenantId: string,
  recordId: string,
  actorId: string,
  reason: string,
): Promise<{ released: boolean; recordId: string }> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".record_holds
     SET released_at = NOW(), released_by = $1, release_reason = $2
     WHERE record_id = $3 AND released_at IS NULL`,
    [actorId, reason, recordId],
  );

  await safeQuery(
    `UPDATE "${schema}".records
     SET status = 'active', updated_at = NOW(), updated_by = $1
     WHERE record_id = $2 AND deleted_at IS NULL AND status = 'hold'`,
    [actorId, recordId],
  );

  emitRecordsEvent({
    tenantId,
    entityType: 'record',
    entityId: recordId,
    action: 'legal_hold_released',
    triggeredBy: actorId,
    previousState: 'hold',
    newState: 'active',
    correlationId: randomUUID(),
    data: { adminOverride: true, reason },
  });

  return { released: true, recordId };
}

export async function bulkOverrideStatus(
  tenantId: string,
  recordIds: string[],
  targetStatus: RecordsStatus,
  actorId: string,
  reason: string,
): Promise<BulkStatusOverrideResult> {
  const schema = tenantSchema(tenantId);
  const updated: string[] = [];
  const failed: string[] = [];

  for (const recordId of recordIds) {
    try {
      const current = await safeQuery(
        `SELECT record_id, status FROM "${schema}".records WHERE record_id = $1 AND deleted_at IS NULL`,
        [recordId],
      );
      const row = getFirstRow(current)!;
      if (!row) { failed.push(recordId); continue; }

      const prevStatus = row.status as RecordsStatus;

      await safeQuery(
        `UPDATE "${schema}".records SET status = $1, updated_at = NOW(), updated_by = $2 WHERE record_id = $3 AND deleted_at IS NULL`,
        [targetStatus, actorId, recordId],
      );

      const historyId = randomUUID();
      await safeQuery(
        `INSERT INTO "${schema}".record_lifecycle_history
           (history_id, record_id, previous_status, new_status, action, transitioned_by, reason, workflow_instance_id, transitioned_at)
         VALUES ($1, $2, $3, $4, 'admin_override', $5, $6, NULL, NOW())`,
        [historyId, recordId, prevStatus, targetStatus, actorId, reason],
      );

      emitRecordsEvent({
        tenantId,
        entityType: 'record',
        entityId: recordId,
        action: 'status_changed',
        triggeredBy: actorId,
        previousState: prevStatus,
        newState: targetStatus,
        correlationId: randomUUID(),
        data: { adminOverride: true, reason },
      });

      updated.push(recordId);
    } catch {
      failed.push(recordId);
    }
  }

  return { updated: updated.length, failed: failed.length, recordIds: updated };
}

export async function purgeDisposedRecords(
  tenantId: string,
  actorId: string,
  olderThanDays = 365,
): Promise<{ purged: number }> {
  const schema = tenantSchema(tenantId);

  const eligible = await safeQuery(
    `SELECT record_id FROM "${schema}".records
     WHERE deleted_at IS NULL
       AND status = 'disposed'
       AND updated_at < NOW() - ($1 || ' days')::interval`,
    [String(olderThanDays)],
  );

  const ids = (eligible.rows ?? []).map((r: Record<string, unknown>) => r.record_id as string);
  if (ids.length === 0) return { purged: 0 };

  const now = new Date().toISOString();
  for (const id of ids) {
    await safeQuery(
      `UPDATE "${schema}".records SET deleted_at = $1, updated_by = $2 WHERE record_id = $3`,
      [now, actorId, id],
    );
    emitRecordsEvent({
      tenantId,
      entityType: 'record',
      entityId: id,
      action: 'deleted',
      triggeredBy: actorId,
      correlationId: randomUUID(),
      data: { adminPurge: true, olderThanDays },
    });
  }

  return { purged: ids.length };
}

export async function getRetentionPolicyAdminList(
  tenantId: string,
  includeInactive = false,
): Promise<Array<{ policyId: string; name: string; recordType: string; retentionDays: number; isActive: boolean; createdAt: string }>> {
  const schema = tenantSchema(tenantId);

  const whereClause = includeInactive ? '' : `WHERE is_active = true`;

  const result = await safeQuery(
    `SELECT policy_id, name, record_type, retention_days, is_active, created_at
     FROM "${schema}".record_retention_policies
     ${whereClause}
     ORDER BY record_type, name`,
  );

  return (result.rows ?? []).map((r: Record<string, unknown>) => ({
    policyId: r.policy_id as string,
    name: r.name as string,
    recordType: r.record_type as string,
    retentionDays: r.retention_days as number,
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
  }));
}

export async function toggleRetentionPolicy(
  tenantId: string,
  policyId: string,
  activate: boolean,
  actorId: string,
): Promise<{ policyId: string; isActive: boolean }> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".record_retention_policies
     SET is_active = $1, updated_at = NOW()
     WHERE policy_id = $2`,
    [activate, policyId],
  );

  emitRecordsEvent({
    tenantId,
    entityType: 'retention_policy',
    entityId: policyId,
    action: 'updated',
    triggeredBy: actorId,
    correlationId: randomUUID(),
    data: { isActive: activate },
  });

  return { policyId, isActive: activate };
}
