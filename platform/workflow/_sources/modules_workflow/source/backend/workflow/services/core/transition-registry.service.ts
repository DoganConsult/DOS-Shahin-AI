import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { logger } from '../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import { NotFoundError, ValidationError } from '../../../../errors/index';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { authorizeWorkflowTransition } from '../integration/lifecycle-bridge.service';
import { emitWorkflowEvent } from '../../ports/lifecycle.port';
import {
  isValidTransition as _isValidTransition,
  WORKFLOW_INSTANCE_TRANSITIONS as _WORKFLOW_INSTANCE_TRANSITIONS,
} from '../../workflows/workflow-lifecycle';
import type {
  TransitionRequest,
  TransitionDecision,
  WorkflowExecutionContract as _WorkflowExecutionContract,
} from '../../contracts/workflow.contracts';
import type { GenericRow } from '@dos/types';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface TransitionRule {
  transitionId: string;
  definitionId: string;
  fromStepId: string;
  fromStepCode: string;
  toStepId: string;
  toStepCode: string;
  transitionType: 'sequential' | 'conditional' | 'parallel' | 'fork' | 'join';
  labelEn: string | null;
  conditionExpression: string | null;
  priority: number;
  requiresApproval: boolean;
  requiredPermission: string | null;
}

export async function getTransitionRulesForStep(
  tenantId: string,
  definitionId: string,
  fromStepId: string,
): Promise<TransitionRule[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         wt.transition_id,
         wt.definition_id,
         wt.from_step_id,
         sf.step_code AS from_step_code,
         wt.to_step_id,
         st.step_code AS to_step_code,
         wt.transition_type,
         wt.label_en,
         wt.condition_expression,
         wt.priority,
         COALESCE(st.step_type = 'approval', false) AS requires_approval,
         wt.required_permission
       FROM "${schema}".workflow_transitions wt
       JOIN "${schema}".workflow_steps sf ON sf.step_id = wt.from_step_id
       JOIN "${schema}".workflow_steps st ON st.step_id = wt.to_step_id
       WHERE wt.definition_id = $1 AND wt.from_step_id = $2
         AND wt.deleted_at IS NULL
       ORDER BY wt.priority ASC`,
      [definitionId, fromStepId],
    );

    return result.rows.map(mapTransitionRule);
  } catch (err) {
    logger.warn('[TransitionRegistry] getTransitionRulesForStep failed', {
      definitionId, fromStepId, error: toErrorMessage(err),
    });
    return [];
  }
}

export async function getTransitionRulesForDefinition(
  tenantId: string,
  definitionId: string,
): Promise<TransitionRule[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         wt.transition_id,
         wt.definition_id,
         wt.from_step_id,
         sf.step_code AS from_step_code,
         wt.to_step_id,
         st.step_code AS to_step_code,
         wt.transition_type,
         wt.label_en,
         wt.condition_expression,
         wt.priority,
         COALESCE(st.step_type = 'approval', false) AS requires_approval,
         wt.required_permission
       FROM "${schema}".workflow_transitions wt
       JOIN "${schema}".workflow_steps sf ON sf.step_id = wt.from_step_id
       JOIN "${schema}".workflow_steps st ON st.step_id = wt.to_step_id
       WHERE wt.definition_id = $1 AND wt.deleted_at IS NULL
       ORDER BY sf.sequence_order ASC, wt.priority ASC`,
      [definitionId],
    );

    return result.rows.map(mapTransitionRule);
  } catch (err) {
    logger.warn('[TransitionRegistry] getTransitionRulesForDefinition failed', {
      definitionId, error: toErrorMessage(err),
    });
    return [];
  }
}

export async function resolveNextStep(
  tenantId: string,
  definitionId: string,
  fromStepId: string,
  outcome?: string,
): Promise<TransitionRule | null> {
  const rules = await getTransitionRulesForStep(tenantId, definitionId, fromStepId);
  if (rules.length === 0) return null;

  if (outcome) {
    const conditional = rules.find(
      (r) => r.transitionType === 'conditional' && r.labelEn === outcome,
    );
    if (conditional) return conditional;
  }

  const sequential = rules.find((r) => r.transitionType === 'sequential');
  if (sequential) return sequential;

  return rules[0];
}

export async function executeTransition(
  tenantId: string,
  request: TransitionRequest,
  userId: string,
): Promise<TransitionDecision> {
  const schema = tenantSchema(tenantId);

  const execution = await safeQuery(
    `SELECT we.*, wd.definition_id, wd.code AS definition_code, wd.module_code
     FROM "${schema}".workflow_executions we
     JOIN "${schema}".workflow_definitions wd ON wd.definition_id = we.workflow_id
     WHERE we.execution_id = $1 AND we.deleted_at IS NULL`,
    [request.instanceId],
  );
  const exec = getFirstRow(execution)!;
  if (!exec) throw new NotFoundError('workflow_execution', request.instanceId);
  if (exec.status !== 'running' && exec.status !== 'awaiting_approval') {
    throw new ValidationError([{ path: 'status', message: `Execution is in state "${exec.status}" — transitions not allowed` }]);
  }

  const nextRule = await resolveNextStep(
    tenantId, exec.definition_id ?? exec.workflow_id,
    request.fromStepId, request.outcome,
  );

  const moduleCode = request.moduleCode ?? exec.module_code ?? 'workflow';
  const entityType = request.entityType ?? exec.entity_type ?? 'workflow_instance';
  const entityId = request.entityId ?? exec.entity_id ?? request.instanceId;

  const fromStep = await safeQuery(
    `SELECT step_code FROM "${schema}".workflow_steps WHERE step_id = $1 LIMIT 1`,
    [request.fromStepId],
  );
  const fromStepCode = getFirstRow(fromStep)?.step_code ?? request.fromStepId;
  const toStepCode = nextRule?.toStepCode ?? 'end';

  const authResult = await authorizeWorkflowTransition({
    tenantId, userId,
    instanceId: request.instanceId,
    moduleCode, entityType, entityId,
    fromState: fromStepCode,
    toState: toStepCode,
    permissionCode: nextRule?.requiredPermission ?? `${moduleCode}.transition`,
    userRoles: request.userRoles ?? [],
    ownerId: request.ownerId,
  });

  if (!authResult.allowed) {
    await recordAudit({
      tenantId, userId, module: 'workflow',
      action: 'transition_denied', entityType,
      entityId: request.instanceId,
      afterState: {
        fromStepId: request.fromStepId, reason: authResult.reason,
        deniedBy: 'lifecycle_auth', moduleCode, entityType,
      },
    }).catch(catchHandler(EC.EVENT_BUS));

    return {
      instanceId: request.instanceId,
      previousStepId: request.fromStepId,
      nextStepId: null,
      instanceComplete: false,
      status: exec.status,
      lifecycleAuthResult: { allowed: false, reason: authResult.reason },
    };
  }

  if (!nextRule) {
    await safeQuery(
      `UPDATE "${schema}".workflow_executions
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE execution_id = $1`,
      [request.instanceId],
    );

    await recordAudit({
      tenantId, userId, module: 'workflow',
      action: 'execution_completed', entityType: 'workflow_execution',
      entityId: request.instanceId,
      afterState: { fromStepId: request.fromStepId, outcome: request.outcome },
    }).catch(catchHandler(EC.EVENT_BUS));

    await (emitWorkflowEvent as any)({
      tenantId, instanceId: request.instanceId,
      eventType: 'completed',
      triggeredBy: userId,
      previousState: 'running', newState: 'completed',
      payload: {},
    }).catch(catchHandler(EC.EVENT_BUS));

    return {
      instanceId: request.instanceId,
      previousStepId: request.fromStepId,
      nextStepId: null,
      instanceComplete: true,
      status: 'completed',
      lifecycleAuthResult: { allowed: true, reason: 'ok' },
    };
  }

  await safeQuery(
    `UPDATE "${schema}".workflow_instance_steps
     SET status = 'completed', completed_at = NOW()
     WHERE instance_id = $1 AND step_id = $2`,
    [request.instanceId, request.fromStepId],
  );

  const instanceStepId = require('uuid').v4();
  await safeQuery(
    `INSERT INTO "${schema}".workflow_instance_steps
       (instance_step_id, instance_id, step_id, status, started_at)
     VALUES ($1, $2, $3, 'active', NOW())`,
    [instanceStepId, request.instanceId, nextRule.toStepId],
  );

  const newStatus = nextRule.requiresApproval ? 'awaiting_approval' : 'running';
  await safeQuery(
    `UPDATE "${schema}".workflow_executions
     SET current_step_id = $1, status = $2, updated_at = NOW()
     WHERE execution_id = $3`,
    [nextRule.toStepId, newStatus, request.instanceId],
  );

  await safeQuery(
    `INSERT INTO "${schema}".workflow_events
       (instance_id, event_type, step_id, payload, triggered_by, created_by)
     VALUES ($1, 'step_transitioned', $2, $3, $4, $4)`,
    [
      request.instanceId, nextRule.toStepId,
      JSON.stringify({
        from: request.fromStepId, to: nextRule.toStepId,
        outcome: request.outcome, transitionType: nextRule.transitionType,
      }),
      userId,
    ],
  );

  await (emitWorkflowEvent as any)({
    tenantId, instanceId: request.instanceId,
    eventType: 'step_entered',
    stepId: nextRule.toStepId,
    triggeredBy: userId,
    previousState: fromStepCode, newState: toStepCode,
    payload: { transitionId: nextRule.transitionId },
  }).catch(catchHandler(EC.EVENT_BUS));

  return {
    instanceId: request.instanceId,
    previousStepId: request.fromStepId,
    nextStepId: nextRule.toStepId,
    instanceComplete: false,
    status: newStatus,
    upcomingStepId: nextRule.toStepId,
    lifecycleAuthResult: { allowed: true, reason: 'ok' },
  };
}

export async function validateTransitionGraph(
  tenantId: string,
  definitionId: string,
): Promise<{ valid: boolean; errors: string[] }> {
  const schema = tenantSchema(tenantId);
  const errors: string[] = [];

  const stepsResult = await safeQuery(
    `SELECT step_id, step_code, is_start, is_end
     FROM "${schema}".workflow_steps
     WHERE definition_id = $1 AND deleted_at IS NULL`,
    [definitionId],
  );
  const steps = stepsResult.rows as GenericRow[];

  const startSteps = steps.filter((s) => s.is_start);
  const endSteps = steps.filter((s) => s.is_end);

  if (startSteps.length === 0) errors.push('No start step defined');
  if (startSteps.length > 1) errors.push('Multiple start steps defined');
  if (endSteps.length === 0) errors.push('No end step defined');

  const transitions = await getTransitionRulesForDefinition(tenantId, definitionId);

  const reachable = new Set<string>();
  if (startSteps.length > 0) {
    const queue = [startSteps[0].step_id as string];
    while (queue.length > 0) {
      const current = queue.pop()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      const outgoing = transitions.filter((t) => t.fromStepId === current);
      for (const t of outgoing) queue.push(t.toStepId);
    }
  }

  for (const step of steps) {
    if (!reachable.has(step.step_id as string) && !step.is_start) {
      errors.push(`Step "${step.step_code}" is unreachable from start`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function mapTransitionRule(r: GenericRow): TransitionRule {
  return {
    transitionId: r.transition_id,
    definitionId: r.definition_id,
    fromStepId: r.from_step_id,
    fromStepCode: r.from_step_code,
    toStepId: r.to_step_id,
    toStepCode: r.to_step_code,
    transitionType: r.transition_type ?? 'sequential',
    labelEn: r.label_en ?? null,
    conditionExpression: r.condition_expression ?? null,
    priority: r.priority ?? 0,
    requiresApproval: r.requires_approval ?? false,
    requiredPermission: r.required_permission ?? null,
  };
}
