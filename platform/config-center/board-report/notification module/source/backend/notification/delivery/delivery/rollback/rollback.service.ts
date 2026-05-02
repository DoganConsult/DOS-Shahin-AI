import { safeQuery, tenantSchema } from '@dos/db';
import { publish } from '@dos/platform-core/events';
import { v4 as uuid } from 'uuid';
import type { RollbackRecord, RollbackStatus } from '../contracts/delivery.types';
import { markDeploymentRolledBack } from '../deployment/deployment.service';

export async function initiateRollback(input: {
  deploymentId: string;
  releaseId: string;
  tenantId: string;
  triggeredBy: string;
  triggerReason: string;
  dataIntegrityNotes?: string;
}): Promise<RollbackRecord> {
  const rollbackId = uuid();
  const now = new Date().toISOString();
  const schema = tenantSchema(input.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".dos_rollbacks (
      rollback_id, deployment_id, release_id, tenant_id, status,
      triggered_by, trigger_reason, initiated_at, completed_at, failed_at,
      failure_reason, data_integrity_notes
    ) VALUES ($1,$2,$3,$4,'initiated',$5,$6,$7,NULL,NULL,NULL,$8)`,
    [
      rollbackId,
      input.deploymentId,
      input.releaseId,
      input.tenantId,
      input.triggeredBy,
      input.triggerReason,
      now,
      input.dataIntegrityNotes ?? null,
    ],
  );
  await publish('delivery.rollback.initiated', input.tenantId, { rollbackId, deploymentId: input.deploymentId, releaseId: input.releaseId }, {});
  return getRollback(input.tenantId, rollbackId) as Promise<RollbackRecord>;
}

export async function advanceRollbackStatus(
  tenantId: string,
  rollbackId: string,
  newStatus: RollbackStatus,
  failureReason?: string,
): Promise<void> {
  const now = new Date().toISOString();
  const schema = tenantSchema(tenantId);
  if (newStatus === 'completed') {
    await safeQuery(
      `UPDATE "${schema}".dos_rollbacks SET status = 'completed', completed_at = $1 WHERE rollback_id = $2`,
      [now, rollbackId],
    );
    const rollback = await getRollback(tenantId, rollbackId);
    if (rollback) {
      await markDeploymentRolledBack(tenantId, rollback.deploymentId, rollbackId);
    }
    await publish('delivery.rollback.completed', tenantId, { rollbackId }, {});
  } else if (newStatus === 'failed') {
    await safeQuery(
      `UPDATE "${schema}".dos_rollbacks SET status = 'failed', failed_at = $1, failure_reason = $2 WHERE rollback_id = $3`,
      [now, failureReason ?? null, rollbackId],
    );
    await publish('delivery.rollback.failed', tenantId, { rollbackId, reason: failureReason }, {});
  } else {
    await safeQuery(
      `UPDATE "${schema}".dos_rollbacks SET status = $1 WHERE rollback_id = $2`,
      [newStatus, rollbackId],
    );
  }
}

export async function getRollback(tenantId: string, rollbackId: string): Promise<RollbackRecord | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dos_rollbacks WHERE rollback_id = $1 LIMIT 1`,
    [rollbackId],
  );
  if (!result.rows[0]) return null;
  return mapRollbackRow(result.rows[0]);
}

export async function getRollbackByDeployment(tenantId: string, deploymentId: string): Promise<RollbackRecord | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dos_rollbacks WHERE deployment_id = $1 ORDER BY initiated_at DESC LIMIT 1`,
    [deploymentId],
  );
  if (!result.rows[0]) return null;
  return mapRollbackRow(result.rows[0]);
}

export async function listRollbacks(tenantId: string): Promise<RollbackRecord[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dos_rollbacks ORDER BY initiated_at DESC`,
    [],
  );
  return result.rows.map(mapRollbackRow);
}

function mapRollbackRow(row: Record<string, any>): RollbackRecord {
  return {
    rollbackId: row.rollback_id as string,
    deploymentId: row.deployment_id as string,
    releaseId: row.release_id as string,
    tenantId: row.tenant_id as string,
    status: row.status as RollbackStatus,
    triggeredBy: row.triggered_by as string,
    triggerReason: row.trigger_reason as string,
    initiatedAt: row.initiated_at as string,
    completedAt: (row.completed_at as string) ?? null,
    failedAt: (row.failed_at as string) ?? null,
    failureReason: (row.failure_reason as string) ?? null,
    dataIntegrityNotes: (row.data_integrity_notes as string) ?? null,
  };
}
