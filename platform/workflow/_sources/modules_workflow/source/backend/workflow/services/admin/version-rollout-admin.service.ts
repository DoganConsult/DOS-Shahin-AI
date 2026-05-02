import { v4 as _uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { logger } from '../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import { NotFoundError, ValidationError } from '../../../../errors/index';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { canPerformWorkflowAction } from '../integration/lifecycle-bridge.service';
import { emitWorkflowEvent } from '../../ports/lifecycle.port';
import type {
  WorkflowVersionContract,
  VersionRolloutRequest,
  VersionRolloutResult,
} from '../../contracts/workflow.contracts';
import type { GenericRow } from '@dos/types';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export async function promoteVersion(
  tenantId: string,
  definitionId: string,
  promotedBy: string,
  notes?: string,
): Promise<WorkflowVersionContract> {
  const schema = tenantSchema(tenantId);

  const updated = await safeQuery(
    `UPDATE "${schema}".workflow_definitions
     SET status = 'active',
         promoted_at = NOW(),
         promoted_by = $2,
         change_notes = $3,
         updated_at = NOW()
     WHERE definition_id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [definitionId, promotedBy, notes ?? null],
  );

  const row = getFirstRow(updated);
  if (!row) throw new NotFoundError('workflow_definition', definitionId);

  const withCount = await safeQuery(
    `SELECT wd.*,
       COUNT(we.execution_id)::int AS active_instance_count
     FROM "${schema}".workflow_definitions wd
     LEFT JOIN "${schema}".workflow_executions we
       ON we.workflow_id = wd.definition_id AND we.status = 'running'
     WHERE wd.definition_id = $1
     GROUP BY wd.definition_id`,
    [definitionId],
  ).catch(() => ({ rows: [row] }));

  return mapVersionContract(getFirstRow(withCount) ?? row);
}

export async function deprecateVersion(
  tenantId: string,
  definitionId: string,
  deprecatedBy: string,
  notes?: string,
): Promise<WorkflowVersionContract> {
  const schema = tenantSchema(tenantId);

  const updated = await safeQuery(
    `UPDATE "${schema}".workflow_definitions
     SET status = 'deprecated',
         change_notes = $3,
         updated_at = NOW()
     WHERE definition_id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [definitionId, deprecatedBy, notes ?? null],
  );

  const row = getFirstRow(updated);
  if (!row) throw new NotFoundError('workflow_definition', definitionId);

  const withCount = await safeQuery(
    `SELECT wd.*,
       COUNT(we.execution_id)::int AS active_instance_count
     FROM "${schema}".workflow_definitions wd
     LEFT JOIN "${schema}".workflow_executions we
       ON we.workflow_id = wd.definition_id AND we.status = 'running'
     WHERE wd.definition_id = $1
     GROUP BY wd.definition_id`,
    [definitionId],
  ).catch(() => ({ rows: [row] }));

  return mapVersionContract(getFirstRow(withCount) ?? row);
}

export async function rolloutVersion(
  tenantId: string,
  request: VersionRolloutRequest,
  rolledOutBy: string,
): Promise<VersionRolloutResult> {
  const schema = tenantSchema(tenantId);

  const hasPermission = await canPerformWorkflowAction(
    tenantId, rolledOutBy, 'workflow.version_rollout',
  );
  if (!hasPermission) {
    throw new ValidationError([{ path: 'authority', message: 'Insufficient authority for version rollout' }]);
  }

  const targetDef = await safeQuery(
    `SELECT * FROM "${schema}".workflow_definitions
     WHERE definition_id = $1 AND version = $2 AND deleted_at IS NULL`,
    [request.definitionId, request.targetVersion],
  );
  const target = getFirstRow(targetDef)!;
  if (!target) {
    throw new NotFoundError('workflow_definition', `${request.definitionId}:v${request.targetVersion}`);
  }

  const currentActive = await safeQuery(
    `SELECT * FROM "${schema}".workflow_definitions
     WHERE code = $1 AND status = 'active' AND deleted_at IS NULL`,
    [target.code],
  );
  const previousVersion = getFirstRow(currentActive)?.version ?? 0;

  await promoteVersion(tenantId, request.definitionId, rolledOutBy, request.notes);

  let migratedCount = 0;
  let failedCount = 0;

  if (request.migrateActiveInstances && previousVersion > 0) {
    const activeInstances = await safeQuery(
      `SELECT execution_id FROM "${schema}".workflow_executions we
       JOIN "${schema}".workflow_definitions wd ON wd.definition_id = we.workflow_id
       WHERE wd.code = $1 AND wd.version = $2 AND we.status = 'running' AND we.deleted_at IS NULL`,
      [target.code, previousVersion],
    );

    for (const row of activeInstances.rows as GenericRow[]) {
      try {
        await safeQuery(
          `UPDATE "${schema}".workflow_executions
           SET workflow_id = $1, updated_at = NOW()
           WHERE execution_id = $2`,
          [request.definitionId, row.execution_id],
        );
        migratedCount++;
      } catch (err) {
        failedCount++;
        logger.warn('[VersionRollout] Failed to migrate instance', {
          executionId: row.execution_id, error: toErrorMessage(err),
        });
      }
    }
  }

  await recordAudit({
    tenantId, userId: rolledOutBy, module: 'workflow',
    action: 'version_rollout', entityType: 'workflow_definition',
    entityId: request.definitionId,
    afterState: {
      previousVersion, newVersion: request.targetVersion,
      migratedCount, failedCount, migrateActive: request.migrateActiveInstances,
    },
  }).catch(catchHandler(EC.EVENT_BUS));

  const status = failedCount > 0 ? (migratedCount > 0 ? 'partial' : 'failed') : 'success';

  return {
    definitionId: request.definitionId,
    previousVersion,
    newVersion: request.targetVersion,
    migratedInstanceCount: migratedCount,
    failedMigrationCount: failedCount,
    status,
  };
}

export async function getVersionHistory(
  tenantId: string,
  code: string,
): Promise<WorkflowVersionContract[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT wd.*,
         COUNT(we.execution_id)::int AS active_instance_count
       FROM "${schema}".workflow_definitions wd
       LEFT JOIN "${schema}".workflow_executions we
         ON we.workflow_id = wd.definition_id AND we.status = 'running'
       WHERE wd.code = $1 AND wd.deleted_at IS NULL
       GROUP BY wd.definition_id
       ORDER BY wd.version DESC`,
      [code],
    );
    return result.rows.map(mapVersionContract);
  } catch (err) {
    logger.warn('[VersionRollout] getVersionHistory failed', {
      code, error: toErrorMessage(err),
    });
    return [];
  }
}

export async function getActiveVersionSummary(
  tenantId: string,
): Promise<ActiveVersionSummary[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         wd.code,
         wd.version,
         wd.definition_id,
         wd.status,
         wd.promoted_at,
         COUNT(we.execution_id)::int AS running_instances,
         (SELECT COUNT(*)::int FROM "${schema}".workflow_definitions wd2
          WHERE wd2.code = wd.code AND wd2.status = 'deprecated' AND wd2.deleted_at IS NULL
         ) AS deprecated_version_count
       FROM "${schema}".workflow_definitions wd
       LEFT JOIN "${schema}".workflow_executions we
         ON we.workflow_id = wd.definition_id AND we.status = 'running'
       WHERE wd.status = 'active' AND wd.deleted_at IS NULL
       GROUP BY wd.definition_id, wd.code, wd.version, wd.status, wd.promoted_at
       ORDER BY wd.code`,
    );

    return result.rows.map((r: GenericRow) => ({
      code: r.code,
      version: r.version,
      definitionId: r.definition_id,
      status: r.status,
      promotedAt: r.promoted_at?.toISOString?.() ?? r.promoted_at ?? null,
      runningInstances: r.running_instances ?? 0,
      deprecatedVersionCount: r.deprecated_version_count ?? 0,
    }));
  } catch (err) {
    logger.warn('[VersionRollout] getActiveVersionSummary failed', {
      tenantId, error: toErrorMessage(err),
    });
    return [];
  }
}

export interface ActiveVersionSummary {
  code: string;
  version: number;
  definitionId: string;
  status: string;
  promotedAt: string | null;
  runningInstances: number;
  deprecatedVersionCount: number;
}

function mapVersionContract(r: GenericRow): WorkflowVersionContract {
  return {
    definitionId: r.definition_id,
    code: r.code,
    version: r.version ?? 1,
    status: r.status ?? 'draft',
    promotedAt: r.promoted_at?.toISOString?.() ?? r.promoted_at ?? null,
    promotedBy: r.promoted_by ?? null,
    activeInstanceCount: r.active_instance_count ?? 0,
    changeNotes: r.change_notes ?? null,
  };
}
