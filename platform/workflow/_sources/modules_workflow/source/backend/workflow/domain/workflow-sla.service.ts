import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { logger } from '../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import { randomUUID } from 'node:crypto';
// domain/ is only 2 levels under rootDir (source/backend), so reaching the
// workflow-local audit-trail stub needs just 2 '../' segments. The deeper
// services/<group>/file pattern uses 3 segments and stays correct.
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { emitWorkflowEvent } from '../ports/lifecycle.port';
import type { SlaStatusContract } from '../contracts/workflow.contracts';
import type { GenericRow } from '@dos/types';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

const SLA_WARNING_THRESHOLD = 0.75;

export interface SlaTimerRecord {
  timerId: string;
  instanceId: string;
  stepId: string;
  stepCode: string;
  slaHours: number;
  startedAt: string;
  dueAt: string;
  status: 'active' | 'breached' | 'completed' | 'cancelled';
  breachedAt: string | null;
}

export async function getSlaStatusForExecution(
  tenantId: string,
  instanceId: string,
): Promise<SlaStatusContract[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         wis.instance_step_id,
         wis.instance_id,
         wis.step_id,
         ws.step_code,
         ws.sla_hours,
         wis.started_at,
         wis.started_at + (ws.sla_hours || ' hours')::INTERVAL AS due_at,
         wis.status AS step_status,
         CASE WHEN ws.sla_hours IS NOT NULL
              AND wis.status = 'active'
              AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL < NOW()
              THEN TRUE ELSE FALSE END AS is_breached,
         CASE WHEN ws.sla_hours IS NOT NULL
              AND wis.status = 'active'
              AND wis.started_at + (ws.sla_hours * ${SLA_WARNING_THRESHOLD} || ' hours')::INTERVAL < NOW()
              AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL >= NOW()
              THEN TRUE ELSE FALSE END AS is_warning,
         CASE WHEN ws.sla_hours IS NOT NULL AND wis.status = 'active'
              THEN EXTRACT(EPOCH FROM (
                wis.started_at + (ws.sla_hours || ' hours')::INTERVAL - NOW()
              ) / 3600)
              ELSE NULL END AS hours_remaining
       FROM "${schema}".workflow_instance_steps wis
       JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
       WHERE wis.instance_id = $1
         AND wis.deleted_at IS NULL
       ORDER BY wis.started_at DESC`,
      [instanceId],
    );

    return result.rows.map((r: GenericRow) => ({
      instanceId: r.instance_id,
      stepId: r.step_id,
      stepCode: r.step_code ?? '',
      slaHours: r.sla_hours != null ? parseFloat(r.sla_hours) : null,
      dueAt: r.due_at?.toISOString?.() ?? r.due_at ?? null,
      isBreached: r.is_breached ?? false,
      isWarning: r.is_warning ?? false,
      hoursRemaining: r.hours_remaining != null ? parseFloat(parseFloat(r.hours_remaining).toFixed(2)) : null,
      escalationAction: null,
    }));
  } catch (err) {
    logger.warn('[WorkflowSLA] getSlaStatusForExecution failed', {
      instanceId, error: toErrorMessage(err),
    });
    return [];
  }
}

export async function getBreachedSlaTimers(
  tenantId: string,
  limit: number = 50,
): Promise<SlaTimerRecord[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         wis.instance_step_id AS timer_id,
         wis.instance_id,
         wis.step_id,
         ws.step_code,
         ws.sla_hours,
         wis.started_at,
         wis.started_at + (ws.sla_hours || ' hours')::INTERVAL AS due_at,
         'breached' AS status,
         NOW() AS breached_at
       FROM "${schema}".workflow_instance_steps wis
       JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
       JOIN "${schema}".workflow_executions we ON we.execution_id = wis.instance_id
       WHERE wis.status = 'active'
         AND ws.sla_hours IS NOT NULL
         AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL < NOW()
         AND we.status = 'running'
         AND wis.deleted_at IS NULL
       ORDER BY wis.started_at ASC
       LIMIT $1`,
      [limit],
    );

    return result.rows.map(mapTimerRecord);
  } catch (err) {
    logger.warn('[WorkflowSLA] getBreachedSlaTimers failed', {
      tenantId, error: toErrorMessage(err),
    });
    return [];
  }
}

export async function getWarningSlaTimers(
  tenantId: string,
  limit: number = 50,
): Promise<SlaTimerRecord[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         wis.instance_step_id AS timer_id,
         wis.instance_id,
         wis.step_id,
         ws.step_code,
         ws.sla_hours,
         wis.started_at,
         wis.started_at + (ws.sla_hours || ' hours')::INTERVAL AS due_at,
         'active' AS status,
         NULL AS breached_at
       FROM "${schema}".workflow_instance_steps wis
       JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
       JOIN "${schema}".workflow_executions we ON we.execution_id = wis.instance_id
       WHERE wis.status = 'active'
         AND ws.sla_hours IS NOT NULL
         AND wis.started_at + (ws.sla_hours * ${SLA_WARNING_THRESHOLD} || ' hours')::INTERVAL < NOW()
         AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL >= NOW()
         AND we.status = 'running'
         AND wis.deleted_at IS NULL
       ORDER BY wis.started_at ASC
       LIMIT $1`,
      [limit],
    );

    return result.rows.map(mapTimerRecord);
  } catch (err) {
    logger.warn('[WorkflowSLA] getWarningSlaTimers failed', {
      tenantId, error: toErrorMessage(err),
    });
    return [];
  }
}

export async function processSlaBreach(
  tenantId: string,
  instanceId: string,
  stepId: string,
): Promise<{ escalated: boolean; action: string }> {
  const schema = tenantSchema(tenantId);
  try {
    const stepResult = await safeQuery(
      `SELECT ws.step_code, ws.sla_hours, ws.config,
              we.workflow_id, wd.module_code
       FROM "${schema}".workflow_instance_steps wis
       JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
       JOIN "${schema}".workflow_executions we ON we.execution_id = wis.instance_id
       JOIN "${schema}".workflow_definitions wd ON wd.definition_id = we.workflow_id
       WHERE wis.instance_id = $1 AND wis.step_id = $2 AND wis.status = 'active'`,
      [instanceId, stepId],
    );

    const step = getFirstRow(stepResult)!;
    if (!step) return { escalated: false, action: 'step_not_found' };

    await recordAudit({
      tenantId, userId: SYSTEM_JOB_ACTOR, module: 'workflow',
      action: 'sla_breached', entityType: 'workflow_execution',
      entityId: instanceId,
      afterState: {
        stepId, stepCode: step.step_code,
        slaHours: step.sla_hours, moduleCode: step.module_code,
      },
    }).catch(catchHandler(EC.EVENT_BUS));

    await (emitWorkflowEvent as any)({
      tenantId, instanceId,
      eventType: 'escalated',
      stepId,
      triggeredBy: SYSTEM_JOB_ACTOR,
      payload: { type: 'sla_breached', stepCode: step.step_code, slaHours: step.sla_hours },
    }).catch(catchHandler(EC.EVENT_BUS));

    return { escalated: true, action: 'sla_breach_recorded' };
  } catch (err) {
    logger.error('[WorkflowSLA] processSlaBreach failed', {
      instanceId, stepId, error: toErrorMessage(err),
    });
    return { escalated: false, action: 'error' };
  }
}

export async function emitSlaWarning(
  tenantId: string,
  instanceId: string,
  stepId: string,
): Promise<void> {
  try {
    await (emitWorkflowEvent as any)({
      tenantId, instanceId,
      eventType: 'escalated',
      stepId,
      triggeredBy: SYSTEM_JOB_ACTOR,
      payload: { type: 'sla_warning', warningThreshold: SLA_WARNING_THRESHOLD },
    });
  } catch (err) {
    logger.warn('[WorkflowSLA] emitSlaWarning failed', {
      instanceId, stepId, error: toErrorMessage(err),
    });
  }
}

export async function getSlaMetrics(
  tenantId: string,
): Promise<{
  totalActive: number;
  totalBreached: number;
  totalWarning: number;
  averageBreachHours: number | null;
}> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE wis.status = 'active' AND ws.sla_hours IS NOT NULL)::int AS total_active,
         COUNT(*) FILTER (
           WHERE wis.status = 'active'
             AND ws.sla_hours IS NOT NULL
             AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL < NOW()
         )::int AS total_breached,
         COUNT(*) FILTER (
           WHERE wis.status = 'active'
             AND ws.sla_hours IS NOT NULL
             AND wis.started_at + (ws.sla_hours * ${SLA_WARNING_THRESHOLD} || ' hours')::INTERVAL < NOW()
             AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL >= NOW()
         )::int AS total_warning,
         ROUND(AVG(
           EXTRACT(EPOCH FROM (NOW() - (wis.started_at + (ws.sla_hours || ' hours')::INTERVAL)) / 3600)
         ) FILTER (
           WHERE wis.status = 'active'
             AND ws.sla_hours IS NOT NULL
             AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL < NOW()
         ), 2) AS avg_breach_hours
       FROM "${schema}".workflow_instance_steps wis
       JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
       JOIN "${schema}".workflow_executions we ON we.execution_id = wis.instance_id
       WHERE we.status = 'running' AND wis.deleted_at IS NULL`,
    );

    const row = getFirstRow(result) ?? {};
    return {
      totalActive: row.total_active ?? 0,
      totalBreached: row.total_breached ?? 0,
      totalWarning: row.total_warning ?? 0,
      averageBreachHours: row.avg_breach_hours != null ? parseFloat(row.avg_breach_hours) : null,
    };
  } catch (err) {
    logger.warn('[WorkflowSLA] getSlaMetrics failed', { tenantId, error: toErrorMessage(err) });
    return { totalActive: 0, totalBreached: 0, totalWarning: 0, averageBreachHours: null };
  }
}

function mapTimerRecord(r: GenericRow): SlaTimerRecord {
  return {
    timerId: r.timer_id,
    instanceId: r.instance_id,
    stepId: r.step_id,
    stepCode: r.step_code ?? '',
    slaHours: parseFloat(r.sla_hours),
    startedAt: r.started_at?.toISOString?.() ?? r.started_at ?? '',
    dueAt: r.due_at?.toISOString?.() ?? r.due_at ?? '',
    status: r.status ?? 'active',
    breachedAt: r.breached_at?.toISOString?.() ?? r.breached_at ?? null,
  };
}

export async function getSlasForInstance(
  instanceId: string,
  tenantId: string,
): Promise<SlaStatusContract[]> {
  return getSlaStatusForExecution(tenantId, instanceId);
}

export async function getSla(
  slaId: string,
  tenantId: string,
): Promise<Record<string, unknown> | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT *
     FROM "${schema}".workflow_instance_steps
     WHERE instance_step_id = $1 AND deleted_at IS NULL`,
    [slaId],
  ).catch(() => ({ rows: [] as unknown[] }));
  return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
}

export async function createSla(input: {
  tenantId: string;
  instanceId: string;
  stepId?: string;
  slaType: string;
  targetHours: number;
  warningThresholdPct?: number;
  context?: unknown;
}): Promise<Record<string, unknown>> {
  return {
    slaId: randomUUID(),
    tenantId: input.tenantId,
    instanceId: input.instanceId,
    stepId: input.stepId ?? null,
    slaType: input.slaType,
    targetHours: input.targetHours,
    warningThresholdPct: input.warningThresholdPct ?? null,
    context: (input.context as any) ?? null,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}

export async function resolveSla(slaId: string, tenantId: string): Promise<Record<string, unknown> | null> {
  return getSla(slaId, tenantId);
}

export async function cancelSla(slaId: string, tenantId: string): Promise<Record<string, unknown> | null> {
  return getSla(slaId, tenantId);
}

export async function pauseSla(slaId: string, tenantId: string): Promise<Record<string, unknown> | null> {
  return getSla(slaId, tenantId);
}

export async function resumeSla(slaId: string, tenantId: string): Promise<Record<string, unknown> | null> {
  return getSla(slaId, tenantId);
}

export async function detectBreaches(tenantId?: string): Promise<SlaTimerRecord[]> {
  if (!tenantId) return [];
  return getBreachedSlaTimers(tenantId);
}

export async function detectWarnings(tenantId?: string): Promise<SlaTimerRecord[]> {
  if (!tenantId) return [];
  return getWarningSlaTimers(tenantId);
}
