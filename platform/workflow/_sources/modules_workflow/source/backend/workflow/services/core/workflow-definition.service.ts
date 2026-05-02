import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { logger } from '../../ports/logger.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { NotFoundError, ValidationError } from '../../../../errors/index';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { emitWorkflowEvent } from '../../ports/lifecycle.port';
import type {
  WorkflowDefinitionContract,
  WorkflowDefinitionCreateInput,
  WorkflowStepInput,
  WorkflowTransitionInput,
} from '../../contracts/workflow.contracts';
import { WORKFLOW_LIFECYCLE_TRANSITIONS, isValidTransition } from '../../workflows/workflow-lifecycle';
import type { GenericRow } from '@dos/types';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export async function createDefinition(
  tenantId: string,
  input: WorkflowDefinitionCreateInput,
  createdBy: string,
): Promise<WorkflowDefinitionContract> {
  const schema = tenantSchema(tenantId);
  const definitionId = uuid();

  if (!input.code || !input.moduleCode || !input.entityType) {
    throw new ValidationError([{ path: 'definition', message: 'Missing required fields' }]);
  }

  await safeQuery(
    `INSERT INTO "${schema}".workflow_definitions
      (definition_id, code, version, name_en, name_ar, module_code, entity_type, trigger_type, status, sla_hours, created_by)
     VALUES ($1, $2, 1, $3, $4, $5, $6, $7, 'draft', $8, $9)`,
    [
      definitionId,
      input.code,
      input.nameEn,
      input.nameAr ?? null,
      input.moduleCode,
      input.entityType,
      input.triggerType,
      input.slaHours ?? null,
      createdBy,
    ],
  );

  for (const step of input.steps ?? []) {
    await safeQuery(
      `INSERT INTO "${schema}".workflow_steps
        (step_id, definition_id, code, name_en, name_ar, step_type, is_start, is_end, sequence_order, sla_hours, config_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
      [
        uuid(),
        definitionId,
        step.code,
        step.nameEn,
        step.nameAr ?? null,
        step.stepType,
        step.isStart ?? false,
        step.isEnd ?? false,
        step.sequenceOrder,
        step.slaHours ?? null,
        JSON.stringify(step.config ?? {}),
      ],
    );
  }

  for (const tr of input.transitions ?? []) {
    await safeQuery(
      `INSERT INTO "${schema}".workflow_transitions
        (transition_id, definition_id, from_step_code, to_step_code, transition_type, label_en, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        uuid(),
        definitionId,
        tr.fromStepCode,
        tr.toStepCode,
        tr.transitionType,
        tr.labelEn ?? null,
        tr.priority ?? 0,
      ],
    );
  }

  await recordAudit({
    tenantId,
    userId: createdBy,
    module: 'workflow',
    action: 'definition_created',
    entityType: 'workflow_definition',
    entityId: definitionId,
    afterState: { code: input.code, version: 1 },
  }).catch(catchHandler(EC.EVENT_BUS));

  emitWorkflowEvent(tenantId, {
    tenantId,
    module: 'workflow',
    event: 'workflow.definition.created',
    entityType: 'workflow_definition',
    entityId: definitionId,
    data: { code: input.code, version: 1 },
  } as any);

  return getDefinitionById(tenantId, definitionId);
}

export async function getDefinitionById(
  tenantId: string,
  definitionId: string,
): Promise<WorkflowDefinitionContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT wd.*,
       (SELECT COUNT(*)::int FROM "${schema}".workflow_steps ws WHERE ws.definition_id = wd.definition_id AND ws.deleted_at IS NULL) AS step_count,
       (SELECT COUNT(*)::int FROM "${schema}".workflow_transitions wt WHERE wt.definition_id = wd.definition_id AND wt.deleted_at IS NULL) AS transition_count
     FROM "${schema}".workflow_definitions wd
     WHERE wd.definition_id = $1 AND wd.deleted_at IS NULL`,
    [definitionId],
  );

  const row = getFirstRow(result)!;
  if (!row) throw new NotFoundError('workflow_definition', definitionId);
  return mapRowToContract(row, row.step_count, row.transition_count);
}

export async function getDefinitionByCode(
  tenantId: string,
  code: string,
  version?: number,
): Promise<WorkflowDefinitionContract> {
  const schema = tenantSchema(tenantId);
  const versionClause = version != null ? 'AND wd.version = $2' : '';
  const orderClause = version != null ? '' : 'ORDER BY wd.version DESC';
  const params: unknown[] = [code];
  if (version != null) params.push(version);

  const result = await safeQuery(
    `SELECT wd.*,
       (SELECT COUNT(*)::int FROM "${schema}".workflow_steps ws WHERE ws.definition_id = wd.definition_id AND ws.deleted_at IS NULL) AS step_count,
       (SELECT COUNT(*)::int FROM "${schema}".workflow_transitions wt WHERE wt.definition_id = wd.definition_id AND wt.deleted_at IS NULL) AS transition_count
     FROM "${schema}".workflow_definitions wd
     WHERE wd.code = $1 AND wd.deleted_at IS NULL ${versionClause} ${orderClause}
     LIMIT 1`,
    params,
  );

  const row = getFirstRow(result)!;
  if (!row) throw new NotFoundError('workflow_definition', code);
  return mapRowToContract(row, row.step_count, row.transition_count);
}

export async function listDefinitions(
  tenantId: string,
  filters: {
    moduleCode?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<{ definitions: WorkflowDefinitionContract[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['wd.deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.moduleCode) {
    conditions.push(`wd.module_code = $${idx++}`);
    params.push(filters.moduleCode);
  }
  if (filters.status) {
    conditions.push(`wd.status = $${idx++}`);
    params.push(filters.status);
  }

  const where = 'WHERE ' + conditions.join(' AND ');
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const [countResult, dataResult] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".workflow_definitions wd ${where}`, params),
    safeQuery(
      `SELECT wd.*,
         (SELECT COUNT(*)::int FROM "${schema}".workflow_steps ws WHERE ws.definition_id = wd.definition_id AND ws.deleted_at IS NULL) AS step_count,
         (SELECT COUNT(*)::int FROM "${schema}".workflow_transitions wt WHERE wt.definition_id = wd.definition_id AND wt.deleted_at IS NULL) AS transition_count
       FROM "${schema}".workflow_definitions wd
       ${where}
       ORDER BY wd.updated_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset],
    ),
  ]);

  const total = getFirstRow(countResult)?.total ?? 0;
  const definitions = dataResult.rows.map((r: GenericRow) =>
    mapRowToContract(r, r.step_count, r.transition_count),
  );

  return { definitions, total };
}

export async function updateDefinitionStatus(
  tenantId: string,
  definitionId: string,
  targetStatus: string,
  updatedBy: string,
): Promise<WorkflowDefinitionContract> {
  const schema = tenantSchema(tenantId);
  const current = await getDefinitionById(tenantId, definitionId);

  if (!isValidTransition(current.status, targetStatus, WORKFLOW_LIFECYCLE_TRANSITIONS)) {
    throw new ValidationError([{
      path: 'status',
      message: `Invalid status transition: ${current.status} → ${targetStatus}`,
    }]);
  }

  const result = await safeQuery(
    `UPDATE "${schema}".workflow_definitions
     SET status = $1, updated_by = $2, updated_at = NOW()
     WHERE definition_id = $3 AND deleted_at IS NULL
     RETURNING *`,
    [targetStatus, updatedBy, definitionId],
  );

  const row = getFirstRow(result)!;
  if (!row) throw new NotFoundError('workflow_definition', definitionId);

  await recordAudit({
    tenantId, userId: updatedBy, module: 'workflow',
    action: 'definition_status_changed', entityType: 'workflow_definition',
    entityId: definitionId,
    beforeState: { status: current.status },
    afterState: { status: targetStatus },
  }).catch(catchHandler(EC.EVENT_BUS));

  await (emitWorkflowEvent as any)({
    tenantId, instanceId: definitionId,
    eventType: 'step_entered',
    triggeredBy: updatedBy,
    previousState: current.status, newState: targetStatus,
    payload: { code: current.code },
  }).catch(catchHandler(EC.EVENT_BUS));

  return mapRowToContract(row, current.stepCount, current.transitionCount);
}

export async function deleteDefinition(
  tenantId: string,
  definitionId: string,
  deletedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const current = await getDefinitionById(tenantId, definitionId);

  const activeInstances = await safeQuery(
    `SELECT COUNT(*)::int AS cnt FROM "${schema}".workflow_executions
     WHERE workflow_id = $1 AND status IN ('running', 'awaiting_approval') AND deleted_at IS NULL`,
    [definitionId],
  );
  if ((getFirstRow(activeInstances)?.cnt ?? 0) > 0) {
    throw new ValidationError([{ path: 'definitionId', message: 'Cannot delete definition with active instances' }]);
  }

  await safeQuery(
    `UPDATE "${schema}".workflow_definitions
     SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
     WHERE definition_id = $2`,
    [deletedBy, definitionId],
  );

  await recordAudit({
    tenantId, userId: deletedBy, module: 'workflow',
    action: 'definition_deleted', entityType: 'workflow_definition',
    entityId: definitionId,
    beforeState: { code: current.code, status: current.status },
  }).catch(catchHandler(EC.EVENT_BUS));
}

async function insertSteps(schema: string, definitionId: string, steps: WorkflowStepInput[]): Promise<void> {
  for (const step of steps) {
    await safeQuery(
      `INSERT INTO "${schema}".workflow_steps
         (step_id, definition_id, step_code, name_en, name_ar, step_type,
          is_start, is_end, sequence_order, sla_hours, config)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        uuid(), definitionId, step.code, step.nameEn, step.nameAr ?? null,
        step.stepType, step.isStart ?? false, step.isEnd ?? false,
        step.sequenceOrder, step.slaHours ?? null,
        step.config ? JSON.stringify(step.config) : null,
      ],
    );
  }
}

async function insertTransitions(
  schema: string,
  definitionId: string,
  transitions: WorkflowTransitionInput[],
): Promise<void> {
  for (const t of transitions) {
    const fromStep = await safeQuery(
      `SELECT step_id FROM "${schema}".workflow_steps
       WHERE definition_id = $1 AND step_code = $2 AND deleted_at IS NULL LIMIT 1`,
      [definitionId, t.fromStepCode],
    );
    const toStep = await safeQuery(
      `SELECT step_id FROM "${schema}".workflow_steps
       WHERE definition_id = $1 AND step_code = $2 AND deleted_at IS NULL LIMIT 1`,
      [definitionId, t.toStepCode],
    );

    const fromId = getFirstRow(fromStep)?.step_id;
    const toId = getFirstRow(toStep)?.step_id;
    if (!fromId || !toId) {
      logger.warn(`[WorkflowDefinition] Skipping transition: step code not found`, {
        from: t.fromStepCode, to: t.toStepCode,
      });
      continue;
    }

    await safeQuery(
      `INSERT INTO "${schema}".workflow_transitions
         (transition_id, definition_id, from_step_id, to_step_id,
          transition_type, label_en, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuid(), definitionId, fromId, toId, t.transitionType, t.labelEn ?? null, t.priority ?? 0],
    );
  }
}

function mapRowToContract(row: GenericRow, stepCount: number, transitionCount: number): WorkflowDefinitionContract {
  return {
    definitionId: row.definition_id,
    code: row.code,
    version: row.version ?? 1,
    nameEn: row.name_en ?? row.name ?? '',
    nameAr: row.name_ar ?? null,
    moduleCode: row.module_code,
    entityType: row.entity_type,
    triggerType: row.trigger_type ?? 'manual',
    status: row.status ?? 'draft',
    stepCount: stepCount ?? 0,
    transitionCount: transitionCount ?? 0,
    slaHours: row.sla_hours ?? null,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at ?? '',
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at ?? '',
  };
}
