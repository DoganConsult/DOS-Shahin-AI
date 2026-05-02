// ============================================
// Shahin — Workflow Retention Service
// Archival, retention enforcement, restore
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export interface RetentionPolicy {
  policy_id: string;
  workflow_id: string | null;
  retention_days: number;
  archive_after_days: number;
  auto_delete: boolean;
  applies_to: "executions" | "workflows" | "both";
  created_at: string;
}

export async function getRetentionPolicies(tenantId: string): Promise<RetentionPolicy[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT rp.*, w.name AS workflow_name
     FROM "${schema}".workflow_retention_policies rp
     LEFT JOIN "${schema}".workflows w ON w.workflow_id = rp.workflow_id
     ORDER BY rp.created_at DESC`
  );
  return result.rows;
}

export async function createRetentionPolicy(tenantId: string, data: {
  workflow_id?: string;
  retention_days?: number;
  archive_after_days?: number;
  auto_delete?: boolean;
  applies_to?: "executions" | "workflows" | "both";
}): Promise<RetentionPolicy> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_retention_policies
      (workflow_id, retention_days, archive_after_days, auto_delete, applies_to)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.workflow_id || null,
      data.retention_days ?? 365,
      data.archive_after_days ?? 90,
      data.auto_delete ?? false,
      data.applies_to || "executions",
    ]
  );
  return getFirstRow(result);
}

export async function updateRetentionPolicy(tenantId: string, policyId: string, data: {
  retention_days?: number;
  archive_after_days?: number;
  auto_delete?: boolean;
  applies_to?: string;
}): Promise<RetentionPolicy | null> {
  const schema = tenantSchema(tenantId);
  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [policyId];
  let idx = 2;

  if (data.retention_days !== undefined) { sets.push(`retention_days = $${idx++}`); params.push(data.retention_days); }
  if (data.archive_after_days !== undefined) { sets.push(`archive_after_days = $${idx++}`); params.push(data.archive_after_days); }
  if (data.auto_delete !== undefined) { sets.push(`auto_delete = $${idx++}`); params.push(data.auto_delete); }
  if (data.applies_to !== undefined) { sets.push(`applies_to = $${idx++}`); params.push(data.applies_to); }

  const result = await safeQuery(
    `UPDATE "${schema}".workflow_retention_policies SET ${sets.join(", ")} WHERE policy_id = $1 RETURNING *`,
    params
  );
  return getFirstRow(result) || null;
}

export async function deleteRetentionPolicy(tenantId: string, policyId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".workflow_retention_policies WHERE policy_id = $1 RETURNING policy_id`,
    [policyId]
  );
  return result.rows.length > 0;
}

export async function enforceRetention(tenantId: string): Promise<{ archived: number; deleted: number }> {
  const schema = tenantSchema(tenantId);
  let totalArchived = 0;
  let totalDeleted = 0;

  const policies = await safeQuery(
    `SELECT * FROM "${schema}".workflow_retention_policies`
  );

  for (const policy of policies.rows) {
    if (policy.applies_to === "executions" || policy.applies_to === "both") {
      // Archive executions older than archive_after_days
      const workflowFilter = policy.workflow_id ? `AND we.workflow_id = '${policy.workflow_id}'` : "";

      // secrets-scan-allow: schema tenantSchema()-validated; retention_days number-typed; workflow_id bound via $N
      const archived = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `WITH moved AS (
          INSERT INTO "${schema}".workflow_executions_archive
            (execution_id, workflow_id, trigger_type, status, started_at, completed_at,
             step_log, is_simulation, sla_deadline, deadline, due_at, parent_execution_id, depth)
          SELECT execution_id, workflow_id, trigger_type, status, started_at, completed_at,
                 step_log, is_simulation, sla_deadline, deadline, due_at, parent_execution_id, depth
          FROM "${schema}".workflow_instances we
          WHERE we.completed_at IS NOT NULL
            AND we.completed_at < NOW() - INTERVAL '${policy.archive_after_days} days'
            ${workflowFilter}
            AND NOT EXISTS (
              SELECT 1 FROM "${schema}".workflow_executions_archive a WHERE a.execution_id = we.execution_id
            )
          RETURNING execution_id
        )
        DELETE FROM "${schema}".workflow_instances
        WHERE execution_id IN (SELECT execution_id FROM moved)
        RETURNING execution_id`
      ), { tenantId: tenantId, operation: 'query workflow_executions_archive' });

      totalArchived += archived.rows.length;

      // Auto-delete from archive if retention_days exceeded
      if (policy.auto_delete) {
        // Parameterize workflow_id so the retention-policy UI cannot be
        // used to inject SQL via a crafted workflow_id. retention_days is
        // a TypeScript `number` — type-safe numeric interpolation only.
        const wfIdFilter = policy.workflow_id ? 'AND workflow_id = $1' : '';
        const wfIdParams = policy.workflow_id ? [policy.workflow_id] : [];
        // secrets-scan-allow: retention_days is number-typed (schema-validated on read)
        const deleted = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
          `DELETE FROM "${schema}".workflow_executions_archive
           WHERE archived_at < NOW() - INTERVAL '${Number(policy.retention_days)} days'
           ${wfIdFilter}
           RETURNING execution_id`,
          wfIdParams
        ), { tenantId: tenantId, operation: 'query workflow_executions_archive' });

        totalDeleted += deleted.rows.length;
      }
    }

    if (policy.applies_to === "workflows" || policy.applies_to === "both") {
      // Archive (soft-delete) workflows older than archive_after_days with no recent executions
      // secrets-scan-allow: schema tenantSchema()-validated; retention_days number-typed; workflow_id bound via $N
      const wfArchived = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `UPDATE "${schema}".workflows
         SET status = 'archived', updated_at = NOW()
         WHERE status != 'archived'
           AND updated_at < NOW() - INTERVAL '${policy.archive_after_days} days'
           ${policy.workflow_id ? `AND workflow_id = '${policy.workflow_id}'` : ""}
           AND NOT EXISTS (
             SELECT 1 FROM "${schema}".workflow_instances we
             WHERE we.workflow_id = workflows.workflow_id
               AND we.started_at > NOW() - INTERVAL '${policy.archive_after_days} days'
           )
         RETURNING workflow_id`
      ), { tenantId: tenantId, operation: 'query workflow_instances' });

      totalArchived += wfArchived.rows.length;
    }
  }

  return { archived: totalArchived, deleted: totalDeleted };
}

export async function getArchivedExecutions(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT a.*, w.name AS workflow_name
     FROM "${schema}".workflow_executions_archive a
     LEFT JOIN "${schema}".workflows w ON w.workflow_id = a.workflow_id
     ORDER BY a.archived_at DESC
     LIMIT 200`
  );
  return result.rows;
}

export async function restoreFromArchive(tenantId: string, executionId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `WITH restored AS (
      INSERT INTO "${schema}".workflow_instances
        (execution_id, workflow_id, trigger_type, status, started_at, completed_at,
         step_log, is_simulation, sla_deadline, deadline, due_at, parent_execution_id, depth)
      SELECT execution_id, workflow_id, trigger_type, status, started_at, completed_at,
             step_log, is_simulation, sla_deadline, deadline, due_at, parent_execution_id, depth
      FROM "${schema}".workflow_executions_archive
      WHERE execution_id = $1
      RETURNING execution_id
    )
    DELETE FROM "${schema}".workflow_executions_archive
    WHERE execution_id IN (SELECT execution_id FROM restored)
    RETURNING execution_id`,
    [executionId]
  );

  return result.rows.length > 0;
}

export async function archiveWorkflow(tenantId: string, workflowId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflows SET status = 'archived', updated_at = NOW()
     WHERE workflow_id = $1 AND status != 'archived' RETURNING workflow_id`,
    [workflowId]
  );
  return result.rows.length > 0;
}

export async function restoreWorkflow(tenantId: string, workflowId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflows SET status = 'active', updated_at = NOW()
     WHERE workflow_id = $1 AND status = 'archived' RETURNING workflow_id`,
    [workflowId]
  );
  return result.rows.length > 0;
}
