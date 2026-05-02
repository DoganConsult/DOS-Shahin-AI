/**
 * Canonical Workflow Engine — DOS (Patch 7 §2.3)
 *
 * @owner DOS
 * @since 2026-03-30
 * @canonical-path platform/dos/workflows/engine/workflow-engine.service.ts
 */
import { logger } from '@dos/platform-core/observability';
import { v4 as _uuid } from 'uuid';
import { safeQuery, tenantSchema } from '@dos/db';

import { emitWorkflowEvent } from '../events/workflow-event-emitter.service';
import { toErrorMessage } from '@dos/platform-core/resilience';
import { getFirstRow } from '@dos/db';
import { swallowNull, EC , catchHandler } from '@dos/platform-core/resilience';

async function resolveAssigneeToUserId(tenantId: string, opts: Record<string, unknown>): Promise<string | null> {
  const uid = opts.userId;
  if (typeof uid === 'string' && uid.length > 0) return uid;
  return null;
}

function normalizeAssigneeInput(assignee: string): Record<string, unknown> {
  return { userId: assignee };
}

function entityContextOptions(context: Record<string, any>): Record<string, unknown> {
  return { tenantId: context._tenantId, entityType: context._entityType, entityId: context._entityId };
}

export interface EngineStep {
  step_id: string;
  definition_id: string;
  step_code: string | null;
  step_type: string;
  name_en: string;
  name_ar: string | null;
  sequence_order: number;
  config: Record<string, unknown> | null;
  is_start: boolean;
  is_end: boolean;
  sla_hours: number | null;
  auto_assign_rule: Record<string, unknown> | null;
}

export interface EngineTransition {
  transition_id: string;
  definition_id: string;
  from_step_id: string;
  to_step_id: string;
  transition_type: string;
  label_en: string | null;
  priority: number;
}

export interface EngineCondition {
  condition_id: string;
  transition_id: string;
  condition_type: string;
  expression: Record<string, unknown> | null;
  evaluation_order: number;
}

export interface InstanceStepRecord {
  instance_step_id: string;
  instance_id: string;
  step_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  outcome: string | null;
  outcome_data: Record<string, unknown> | null;
  actor_user_id: string | null;
}

export interface StartResult {
  instanceId: string;
  definitionId: string;
  currentStepId: string;
  status: string;
  taskId?: string;
}

export interface AdvanceResult {
  instanceId: string;
  previousStepId: string;
  nextStepId: string | null;
  instanceComplete: boolean;
  taskId?: string;
  status: string;
  /** Pre-computed next step after nextStepId (Law 7: Inspectable Workflows) */
  upcomingStepId?: string | null;
}

async function loadSteps(schema: string, definitionId: string): Promise<EngineStep[]> {
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_steps
     WHERE definition_id = $1 AND deleted_at IS NULL
     ORDER BY sequence_order ASC, created_at ASC`,
    [definitionId],
  );
  return result.rows;
}

async function loadTransitions(schema: string, definitionId: string): Promise<EngineTransition[]> {
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_transitions
     WHERE definition_id = $1 AND deleted_at IS NULL
     ORDER BY priority ASC, created_at ASC`,
    [definitionId],
  );
  return result.rows;
}

async function loadConditions(schema: string, transitionIds: string[]): Promise<EngineCondition[]> {
  if (transitionIds.length === 0) return [];
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_conditions
     WHERE transition_id = ANY($1) AND deleted_at IS NULL
     ORDER BY evaluation_order ASC`,
    [transitionIds],
  );
  return result.rows;
}

async function loadStepRoles(schema: string, stepId: string): Promise<Array<{ role_id: string; assignment_type: string }>> {
  const result = await safeQuery(
    `SELECT role_id, assignment_type FROM "${schema}".workflow_step_roles
     WHERE step_id = $1 AND deleted_at IS NULL`,
    [stepId],
  );
  return result.rows;
}

async function loadSlaPolicies(schema: string, definitionId: string, stepId: string): Promise<Array<{ warning_hours: number | null; breach_hours: number | null; escalation_action: Record<string, unknown> | null }>> {
  const result = await safeQuery(
    `SELECT warning_hours, breach_hours, escalation_action FROM "${schema}".workflow_sla_policies
     WHERE definition_id = $1 AND (step_id = $2 OR step_id IS NULL) AND deleted_at IS NULL
     ORDER BY step_id NULLS LAST`,
    [definitionId, stepId],
  );
  return result.rows;
}

export function evaluateCondition(
  condition: EngineCondition,
  context: Record<string, unknown>,
): boolean {
  if (condition.condition_type === 'always') return true;

  const expr = condition.expression as Record<string, unknown> | null;
  if (!expr) return true;

  if (condition.condition_type === 'field_value') {
    const field = expr.field as string;
    const operator = expr.operator as string;
    const value = expr.value;
    const fieldValue = context[field];
    switch (operator) {
      case 'eq': case '==': case '===': return fieldValue === value;
      case 'neq': case '!=': case '!==': return fieldValue !== value;
      case 'gt': case '>': return (fieldValue as number) > (value as number);
      case 'gte': case '>=': return (fieldValue as number) >= (value as number);
      case 'lt': case '<': return (fieldValue as number) < (value as number);
      case 'lte': case '<=': return (fieldValue as number) <= (value as number);
      case 'in': return Array.isArray(value) ? value.includes(fieldValue) : false;
      case 'contains': return typeof fieldValue === 'string' && typeof value === 'string' ? fieldValue.includes(value) : false;
      default: return true;
    }
  }

  if (condition.condition_type === 'expression') {
    const left = expr.left as string;
    const op = expr.operator as string;
    const right = expr.right;
    const leftVal = context[left];
    switch (op) {
      case 'eq': return leftVal === right;
      case 'neq': return leftVal !== right;
      case 'gt': return (leftVal as number) > (right as number);
      case 'lt': return (leftVal as number) < (right as number);
      default: return true;
    }
  }

  if (condition.condition_type === 'approval_outcome') {
    const expected = expr.outcome as string;
    const actual = context._approval_outcome as string;
    return actual === expected;
  }

  if (condition.condition_type === 'role_check') {
    const requiredRole = expr.role as string;
    const userRoles = context._user_roles as string[] | undefined;
    return Array.isArray(userRoles) && userRoles.includes(requiredRole);
  }

  return true;
}

export async function evaluateTransitionConditions(
  schema: string,
  transition: EngineTransition,
  context: Record<string, unknown>,
  preloadedConditions?: EngineCondition[],
): Promise<boolean> {
  const conditions = preloadedConditions
    ?? await loadConditions(schema, [transition.transition_id]);
  const relevantConditions = conditions.filter(c => c.transition_id === transition.transition_id);

  if (relevantConditions.length === 0) return true;

  return relevantConditions.every(c => evaluateCondition(c, context));
}

function findStartStep(steps: EngineStep[]): EngineStep | undefined {
  return steps.find(s => s.is_start) ?? steps.find(s => s.sequence_order === 0) ?? steps[0];
}

function _findEndSteps(steps: EngineStep[]): EngineStep[] {
  return steps.filter(s => s.is_end);
}

async function createInstanceStep(
  schema: string,
  instanceId: string,
  stepId: string,
  status: string,
  actorUserId: string,
): Promise<InstanceStepRecord> {
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_instance_steps
       (instance_id, step_id, status, started_at, actor_user_id, created_by)
     VALUES ($1, $2, $3, NOW(), $4, $5)
     RETURNING *`,
    [instanceId, stepId, status, actorUserId, actorUserId],
  );
  return getFirstRow(result);
}

async function completeInstanceStep(
  schema: string,
  instanceStepId: string,
  outcome: string,
  outcomeData: Record<string, unknown> | null,
  actorUserId: string,
): Promise<void> {
  await safeQuery(
    `UPDATE "${schema}".workflow_instance_steps
     SET status = 'completed', completed_at = NOW(), outcome = $1, outcome_data = $2,
         actor_user_id = $3, duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INT,
         updated_at = NOW(), updated_by = $3
     WHERE instance_step_id = $4`,
    [outcome, outcomeData ? JSON.stringify(outcomeData) : null, actorUserId, instanceStepId],
  );
}

async function createWorkflowTask(
  schema: string,
  instanceStepId: string,
  step: EngineStep,
  assignedTo: string | null,
  dueDate: string | null,
  userId: string,
): Promise<string> {
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_tasks
       (instance_step_id, task_type, title, description, assigned_to, due_date, priority, status, form_data, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, $9)
     RETURNING task_id`,
    [
      instanceStepId,
      step.step_type,
      step.name_en,
      step.config?.description || null,
      assignedTo,
      dueDate,
      step.config?.priority || 'medium',
      step.config?.formData ? JSON.stringify(step.config.formData) : null,
      userId,
    ],
  );
  return getFirstRow(result)?.task_id;
}

async function resolveAssignee(
  schema: string,
  definitionId: string,
  step: EngineStep,
  context: Record<string, unknown>,
): Promise<string | null> {
  if (step.auto_assign_rule) {
    const rule = step.auto_assign_rule as Record<string, unknown>;
    if (rule.userId) return rule.userId as string;
    if (rule.contextField && context[rule.contextField as string]) {
      return context[rule.contextField as string] as string;
    }
  }

  const roles = await loadStepRoles(schema, step.step_id);
  const performer = roles.find(r => r.assignment_type === 'performer');
  if (performer?.role_id) return performer.role_id;

  if (step.config?.assignedRole) return step.config.assignedRole as string;
  if (context._userId) return context._userId as string;

  return null;
}

async function computeDueDate(
  schema: string,
  definitionId: string,
  step: EngineStep,
): Promise<string | null> {
  if (step.sla_hours) {
    return new Date(Date.now() + step.sla_hours * 60 * 60 * 1000).toISOString();
  }

  const policies = await loadSlaPolicies(schema, definitionId, step.step_id);
  if (policies.length > 0 && policies[0].breach_hours) {
    return new Date(Date.now() + policies[0].breach_hours * 60 * 60 * 1000).toISOString();
  }

  return null;
}

export async function startWorkflowExecution(
  tenantId: string,
  definitionId: string,
  context: Record<string, unknown>,
  userId: string,
): Promise<StartResult> {
  const schema = tenantSchema(tenantId);

  const steps = await loadSteps(schema, definitionId);
  if (steps.length === 0) {
    throw new Error(`[WorkflowEngine] No workflow_steps found for definition ${definitionId}. Populate normalized tables first.`);
  }

  const _transitions = await loadTransitions(schema, definitionId);

  const startStep = findStartStep(steps);
  if (!startStep) {
    throw new Error(`[WorkflowEngine] No start step found for definition ${definitionId}.`);
  }

  const execResult = await safeQuery(
    `INSERT INTO "${schema}".workflow_instances
       (workflow_id, trigger_type, status, is_simulation)
     VALUES ($1, $2, 'running', false)
     RETURNING instance_id`,
    [definitionId, 'engine'],
  );
  const instanceId = getFirstRow(execResult)?.instance_id;

  await emitWorkflowEvent({
    tenantId,
    instanceId,
    eventType: 'started',
    triggeredBy: userId,
    newState: 'running',
    payload: { definitionId, engine: true },
  }).catch(catchHandler(EC.EVENT_BUS, {}));

  const instanceStep = await createInstanceStep(schema, instanceId, startStep.step_id, 'active', userId);

  await emitWorkflowEvent({
    tenantId,
    instanceId,
    eventType: 'step_entered',
    triggeredBy: userId,
    stepId: startStep.step_id,
    previousState: 'none',
    newState: 'active',
    payload: { stepName: startStep.name_en, stepType: startStep.step_type },
  }).catch(catchHandler(EC.EVENT_BUS, {}));

  let taskId: string | undefined;

  if (['task', 'approval'].includes(startStep.step_type)) {
    const assignee = await resolveAssignee(schema, definitionId, startStep, context);
    const resolvedUserId =
      assignee == null
        ? null
        : await swallowNull(EC.FALLBACK_QUERY, resolveAssigneeToUserId(tenantId, {
            ...entityContextOptions(context),
            userId: assignee,
            ...normalizeAssigneeInput(assignee),
          }), { tenantId: tenantId, operation: 'fallback query' });
    const dueDate = await computeDueDate(schema, definitionId, startStep);
    taskId = await createWorkflowTask(
      schema,
      instanceStep.instance_step_id,
      startStep,
      resolvedUserId,
      dueDate,
      userId,
    );

    await emitWorkflowEvent({
      tenantId,
      instanceId,
      eventType: 'task_created',
      triggeredBy: userId,
      stepId: startStep.step_id,
      payload: { taskId, assignee: resolvedUserId, stepName: startStep.name_en },
    }).catch(catchHandler(EC.EVENT_BUS, {}));

    if (resolvedUserId) {
      await emitWorkflowEvent({
        tenantId,
        instanceId,
        eventType: 'task_assigned',
        triggeredBy: userId,
        stepId: startStep.step_id,
        payload: { taskId, assignee: resolvedUserId },
      }).catch(catchHandler(EC.EVENT_BUS, {}));
    }

    if (startStep.step_type === 'approval') {
      await createApprovalForStep(tenantId, instanceId, startStep.step_id, startStep, userId);
    }
  }

  if (startStep.is_end) {
    await completeInstanceStep(schema, instanceStep.instance_step_id, 'completed', null, userId);
    await safeQuery(
      `UPDATE "${schema}".workflow_instances SET status = 'completed', completed_at = NOW() WHERE instance_id = $1`,
      [instanceId],
    );
    await emitWorkflowEvent({
      tenantId,
      instanceId,
      eventType: 'completed',
      triggeredBy: userId,
      previousState: 'running',
      newState: 'completed',
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  return {
    instanceId,
    definitionId,
    currentStepId: startStep.step_id,
    status: startStep.is_end ? 'completed' : 'running',
    taskId,
  };
}

export async function advanceStep(
  tenantId: string,
  instanceId: string,
  fromStepId: string,
  transitionData: Record<string, unknown>,
  userId: string,
): Promise<AdvanceResult> {
  const schema = tenantSchema(tenantId);

  // Advisory lock prevents concurrent advance on same instance.
  // pg_advisory_xact_lock requires a transaction; pg_try_advisory_lock is session-level and auto-releases.
  // We use try_advisory_lock: returns false if another session holds the lock → reject with clear error.
  const lockKey = Buffer.from(instanceId.replace(/-/g, '').slice(0, 16), 'hex');
  const lockId = lockKey.readInt32BE(0); // first 4 bytes of UUID → int32 advisory lock key
  const lockResult = await safeQuery(`SELECT pg_try_advisory_lock($1) AS acquired`, [lockId]);
  const lockAcquired = getFirstRow(lockResult)?.acquired === true;
  if (!lockAcquired) {
    throw new Error(`[WorkflowEngine] Instance ${instanceId} is being advanced by another request. Try again.`);
  }

  try {
  const execResult = await safeQuery(
    `SELECT workflow_id, status FROM "${schema}".workflow_instances WHERE instance_id = $1`,
    [instanceId],
  );
  if (execResult.rows.length === 0) {
    throw new Error(`[WorkflowEngine] Instance ${instanceId} not found.`);
  }
  const { workflow_id: definitionId, status: instanceStatus } = getFirstRow(execResult);

  if (!['running', 'paused'].includes(instanceStatus)) {
    throw new Error(`[WorkflowEngine] Instance ${instanceId} is ${instanceStatus}, cannot advance.`);
  }

  const steps = await loadSteps(schema, definitionId);
  const transitions = await loadTransitions(schema, definitionId);
  const fromStep = steps.find(s => s.step_id === fromStepId);
  if (!fromStep) {
    throw new Error(`[WorkflowEngine] Step ${fromStepId} not found in definition ${definitionId}.`);
  }

  const outgoing = transitions.filter(t => t.from_step_id === fromStepId);
  if (outgoing.length === 0) {
    throw new Error(`[WorkflowEngine] No outgoing transitions from step ${fromStepId}.`);
  }

  const allConditions = await loadConditions(schema, outgoing.map(t => t.transition_id));
  const context = { ...transitionData, _userId: userId };

  // ── DAuth Lifecycle Authorization (Patch 7 §2.13, Patch 3 §2.13) ──
  // Permission is necessary but not sufficient for state transitions.
  try {

    const { evaluateLifecycleTransition } = await import('../../../../platform/dauth');
    const moduleCode = transitionData._moduleCode as string ?? 'workflow';
    const entityType = transitionData._entityType as string ?? 'workflow_instance';
    const toStepId = outgoing[0]?.to_step_id ?? 'unknown';
    const lifecycleResult = await evaluateLifecycleTransition(tenantId, userId, {
      moduleCode,
      entityType,
      entityId: instanceId,
      fromState: fromStep.step_code ?? fromStepId,
      toState: toStepId,
      permissionCode: `${moduleCode}.workflow.transition`,
      userRoles: (transitionData._userRoles as string[]) ?? [],
      ownerId: transitionData._ownerId as string,
    });
    if (!lifecycleResult.allowed) {
      throw new Error(`[WorkflowEngine] Lifecycle auth denied: ${lifecycleResult.reason} (module: ${moduleCode}, from: ${fromStep.step_code}, to: ${toStepId})`);
    }
  } catch (err: unknown) {
    // If DAuth is unavailable, deny by default (Law 11)

    if (err.message?.includes('Lifecycle auth denied')) throw err;
    logger.warn('[WorkflowEngine] DAuth lifecycle check failed, denying transition (Law 11: deny by default)', { error: toErrorMessage(err) });
    throw new Error(`[WorkflowEngine] Lifecycle authorization unavailable — transition denied (deny-by-default).`);
  }

  let selectedTransition: EngineTransition | null = null;
  for (const t of outgoing) {
    const passes = await evaluateTransitionConditions(schema, t, context, allConditions);
    if (passes) {
      selectedTransition = t;
      break;
    }
  }

  if (!selectedTransition) {
    throw new Error(`[WorkflowEngine] No transition conditions met from step ${fromStepId}. Context: ${JSON.stringify(Object.keys(transitionData))}`);
  }

  const activeStep = await safeQuery(
    `SELECT instance_step_id FROM "${schema}".workflow_instance_steps
     WHERE instance_id = $1 AND step_id = $2 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [instanceId, fromStepId],
  );
  if (activeStep.rows.length > 0) {
    await completeInstanceStep(
      schema,
      getFirstRow(activeStep)?.instance_step_id,
      transitionData._outcome as string || 'completed',
      transitionData as Record<string, unknown>,
      userId,
    );
  }

  const nextStepId = selectedTransition.to_step_id;
  const nextStep = steps.find(s => s.step_id === nextStepId);

  if (!nextStep) {
    throw new Error(`[WorkflowEngine] Target step ${nextStepId} not found in definition.`);
  }

  const nextInstanceStep = await createInstanceStep(schema, instanceId, nextStepId, 'active', userId);

  await emitWorkflowEvent({
    tenantId,
    instanceId,
    eventType: 'step_entered',
    triggeredBy: userId,
    stepId: nextStepId,
    previousState: fromStepId,
    newState: 'active',
    payload: { stepName: nextStep.name_en, stepType: nextStep.step_type, fromStepId },
  }).catch(catchHandler(EC.EVENT_BUS, {}));

  let taskId: string | undefined;
  let instanceComplete = false;

  if (nextStep.is_end) {
    await completeInstanceStep(schema, nextInstanceStep.instance_step_id, 'completed', null, userId);
    await safeQuery(
      `UPDATE "${schema}".workflow_instances SET status = 'completed', completed_at = NOW() WHERE instance_id = $1`,
      [instanceId],
    );
    instanceComplete = true;

    await emitWorkflowEvent({
      tenantId,
      instanceId,
      eventType: 'completed',
      triggeredBy: userId,
      previousState: 'running',
      newState: 'completed',
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  } else if (['task', 'approval'].includes(nextStep.step_type)) {
    const stepContext = { ...transitionData, _userId: userId };
    const assignee = await resolveAssignee(schema, definitionId, nextStep, stepContext);
    const resolvedUserId =
      assignee == null
        ? null
        : await swallowNull(EC.FALLBACK_QUERY, resolveAssigneeToUserId(tenantId, {
            ...entityContextOptions(stepContext),
            userId: assignee,
            ...normalizeAssigneeInput(assignee),
          }), { tenantId: tenantId, operation: 'fallback query' });
    const dueDate = await computeDueDate(schema, definitionId, nextStep);
    taskId = await createWorkflowTask(
      schema,
      nextInstanceStep.instance_step_id,
      nextStep,
      resolvedUserId,
      dueDate,
      userId,
    );

    await emitWorkflowEvent({
      tenantId,
      instanceId,
      eventType: 'task_created',
      triggeredBy: userId,
      stepId: nextStepId,
      payload: { taskId, assignee: resolvedUserId, stepName: nextStep.name_en },
    }).catch(catchHandler(EC.EVENT_BUS, {}));

    if (resolvedUserId) {
      await emitWorkflowEvent({
        tenantId,
        instanceId,
        eventType: 'task_assigned',
        triggeredBy: userId,
        stepId: nextStepId,
        payload: { taskId, assignee: resolvedUserId },
      }).catch(catchHandler(EC.EVENT_BUS, {}));
    }

    if (nextStep.step_type === 'approval') {
      await createApprovalForStep(tenantId, instanceId, nextStepId, nextStep, userId);
    }
  }

  // Pre-compute the upcoming step after the step we just arrived at.
  // This allows the caller to know what is coming next without an extra query.
  let upcomingStepId: string | null = null;
  if (!instanceComplete && nextStepId) {
    const upcomingTransitions = transitions.filter(t => t.from_step_id === nextStepId);
    if (upcomingTransitions.length === 1) {
      // Deterministic single path -- safe to pre-compute
      upcomingStepId = upcomingTransitions[0].to_step_id;
    } else if (upcomingTransitions.length > 1) {
      // Multiple outgoing transitions -- pick the first by priority (already sorted)
      upcomingStepId = upcomingTransitions[0].to_step_id;
    }
  }

  const advanceResult: AdvanceResult = {
    instanceId,
    previousStepId: fromStepId,
    nextStepId,
    instanceComplete,
    taskId,
    status: instanceComplete ? 'completed' : 'running',
    upcomingStepId,
  };

  return advanceResult;

  } finally {
    // Release advisory lock — always, even on error
    await safeQuery(`SELECT pg_advisory_unlock($1)`, [lockId]).catch(catchHandler(EC.EVENT_BUS));
  }
}

export async function completeStep(
  tenantId: string,
  instanceId: string,
  stepId: string,
  result: Record<string, unknown>,
  userId: string,
): Promise<{ completed: boolean; instanceDone: boolean }> {
  const schema = tenantSchema(tenantId);

  const active = await safeQuery(
    `SELECT instance_step_id FROM "${schema}".workflow_instance_steps
     WHERE instance_id = $1 AND step_id = $2 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [instanceId, stepId],
  );

  if (active.rows.length === 0) {
    throw new Error(`[WorkflowEngine] No active instance step found for instance ${instanceId}, step ${stepId}.`);
  }

  await completeInstanceStep(schema, getFirstRow(active)?.instance_step_id, 'completed', result, userId);

  await emitWorkflowEvent({
    tenantId,
    instanceId,
    eventType: 'task_completed',
    triggeredBy: userId,
    stepId,
    previousState: 'active',
    newState: 'completed',
    payload: result,
  }).catch(catchHandler(EC.EVENT_BUS, {}));

  const execResult = await safeQuery(
    `SELECT workflow_id FROM "${schema}".workflow_instances WHERE instance_id = $1`,
    [instanceId],
  );
  const definitionId = getFirstRow(execResult)?.workflow_id;
  if (!definitionId) {
    return { completed: true, instanceDone: false };
  }

  const steps = await loadSteps(schema, definitionId);
  const currentStep = steps.find(s => s.step_id === stepId);
  if (currentStep?.is_end) {
    await safeQuery(
      `UPDATE "${schema}".workflow_instances SET status = 'completed', completed_at = NOW() WHERE instance_id = $1`,
      [instanceId],
    );
    await emitWorkflowEvent({
      tenantId,
      instanceId,
      eventType: 'completed',
      triggeredBy: userId,
      previousState: 'running',
      newState: 'completed',
    }).catch(catchHandler(EC.EVENT_BUS, {}));
    return { completed: true, instanceDone: true };
  }

  return { completed: true, instanceDone: false };
}

export async function cancelExecution(
  tenantId: string,
  instanceId: string,
  reason: string,
  userId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  const exec = await safeQuery(
    `SELECT status FROM "${schema}".workflow_instances WHERE instance_id = $1`,
    [instanceId],
  );
  if (exec.rows.length === 0) {
    throw new Error(`[WorkflowEngine] Instance ${instanceId} not found.`);
  }
  const previousState = getFirstRow(exec)?.status;

  if (previousState === 'cancelled') {
    throw new Error(`[WorkflowEngine] Instance ${instanceId} is already cancelled.`);
  }

  await safeQuery(
    `UPDATE "${schema}".workflow_instance_steps
     SET status = 'cancelled', updated_at = NOW()
     WHERE instance_id = $1 AND status IN ('pending', 'active')`,
    [instanceId],
  );

  await safeQuery(
    `UPDATE "${schema}".workflow_instances
     SET status = 'cancelled', completed_at = NOW()
     WHERE instance_id = $1`,
    [instanceId],
  );

  await emitWorkflowEvent({
    tenantId,
    instanceId,
    eventType: 'cancelled',
    triggeredBy: userId,
    previousState,
    newState: 'cancelled',
    payload: { reason },
  }).catch(catchHandler(EC.EVENT_BUS, {}));
}

export async function getInstanceStatus(
  tenantId: string,
  instanceId: string,
): Promise<{
  instanceId: string;
  definitionId: string;
  status: string;
  steps: InstanceStepRecord[];
  currentStep: InstanceStepRecord | null;
}> {
  const schema = tenantSchema(tenantId);

  const exec = await safeQuery(
    `SELECT instance_id, workflow_id, status FROM "${schema}".workflow_instances WHERE instance_id = $1`,
    [instanceId],
  );
  if (exec.rows.length === 0) {
    throw new Error(`[WorkflowEngine] Instance ${instanceId} not found.`);
  }

  const instanceSteps = await safeQuery(
    `SELECT * FROM "${schema}".workflow_instance_steps
     WHERE instance_id = $1 AND deleted_at IS NULL
     ORDER BY created_at ASC`,
    [instanceId],
  );

  const activeStep = instanceSteps.rows.find((s: InstanceStepRecord) => s.status === 'active') || null;

  return {
    instanceId,
    definitionId: getFirstRow(exec)?.workflow_id,
    status: getFirstRow(exec)?.status,
    steps: instanceSteps.rows,
    currentStep: activeStep,
  };
}

export async function createApprovalForStep(
  tenantId: string,
  instanceId: string,
  stepId: string,
  step: EngineStep,
  userId: string,
): Promise<string | null> {
  try {
    const { submitForApproval } = await import('../approvals/approval-engine.service.js');
    const entityType = (step.config?.approvalEntityType as string) || 'workflow_step';
    const entityId = `${instanceId}:${stepId}`;
    const request = await submitForApproval(tenantId, entityType, entityId, userId);

    await safeQuery(
      `UPDATE public.approval_requests
       SET workflow_instance_id = $1, workflow_step_id = $2, tenant_id = $3
       WHERE request_id = $4`,
      [instanceId, stepId, tenantId, request.requestId],
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    await safeQuery(
      `UPDATE "${tenantSchema(tenantId)}".workflow_instances
       SET status = 'paused' WHERE instance_id = $1`,
      [instanceId],
    );

    return request.requestId;
  } catch (err: unknown) {
    logger.warn(`[WorkflowEngine] Failed to create approval request for step ${stepId}: ${toErrorMessage(err)}`);
    return null;
  }
}

export async function onApprovalResolved(
  tenantId: string,
  approvalRequestId: string,
  decision: 'approved' | 'rejected',
  userId: string,
): Promise<AdvanceResult | { instanceId: string; status: string; decision: string }> {
  const linkResult = await safeQuery(
    `SELECT workflow_instance_id, workflow_step_id, tenant_id
     FROM public.approval_requests WHERE request_id = $1`,
    [approvalRequestId],
  );

  if (linkResult.rows.length === 0) {
    throw new Error(`[WorkflowEngine] Approval request ${approvalRequestId} not found.`);
  }

  const { workflow_instance_id: instanceId, workflow_step_id: stepId } = getFirstRow(linkResult);

  if (!instanceId || !stepId) {
    return { instanceId: instanceId || '', status: 'no_workflow_link', decision };
  }

  const resolvedTenantId = getFirstRow(linkResult)?.tenant_id || tenantId;

  if (decision === 'approved') {
    await safeQuery(
      `UPDATE "${tenantSchema(resolvedTenantId)}".workflow_instances
       SET status = 'running' WHERE instance_id = $1`,
      [instanceId],
    );

    try {
      return await advanceStep(
        resolvedTenantId,
        instanceId,
        stepId,
        { _approval_outcome: 'approved', _approvalRequestId: approvalRequestId },
        userId,
      );
    } catch {
      await completeStep(resolvedTenantId, instanceId, stepId, { approval: 'approved' }, userId);
      return { instanceId, status: 'step_completed_no_advance', decision };
    }
  } else {
    const schema = tenantSchema(resolvedTenantId);

    const active = await safeQuery(
      `SELECT instance_step_id FROM "${schema}".workflow_instance_steps
       WHERE instance_id = $1 AND step_id = $2 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [instanceId, stepId],
    );

    if (active.rows.length > 0) {
      await safeQuery(
        `UPDATE "${schema}".workflow_instance_steps
         SET status = 'failed', completed_at = NOW(), outcome = 'rejected',
             outcome_data = $1, updated_at = NOW()
         WHERE instance_step_id = $2`,
        [JSON.stringify({ approval: 'rejected', approvalRequestId }), getFirstRow(active)?.instance_step_id],
      );
    }

    await safeQuery(
      `UPDATE "${schema}".workflow_instances SET status = 'failed', completed_at = NOW() WHERE instance_id = $1`,
      [instanceId],
    );

    await emitWorkflowEvent({
      tenantId: resolvedTenantId,
      instanceId,
      eventType: 'rejected',
      triggeredBy: userId,
      stepId,
      previousState: 'paused',
      newState: 'failed',
      payload: { approvalRequestId, decision: 'rejected' },
    }).catch(catchHandler(EC.EVENT_BUS, {}));

    return { instanceId, status: 'rejected', decision };
  }
}

/**
 * Get the failure/rejection path from a given step in a workflow instance.
 * Queries workflow transitions where the conditions indicate a 'rejected' or 'failed' outcome.
 * Returns the first matching failure transition, or null if no failure path exists.
 * (Law 7: Inspectable Workflows -- failure paths must be queryable)
 */
export async function getFailurePath(
  tenantId: string,
  instanceId: string,
  currentStepId: string,
): Promise<{ stepId: string; transitionId: string; conditions: Record<string, unknown> } | null> {
  const schema = tenantSchema(tenantId);

  // Get the definition ID from the instance
  const execResult = await safeQuery(
    `SELECT workflow_id FROM "${schema}".workflow_instances WHERE instance_id = $1`,
    [instanceId],
  );
  if (execResult.rows.length === 0) {
    throw new Error(`[WorkflowEngine] Instance ${instanceId} not found.`);
  }
  const definitionId = getFirstRow(execResult)?.workflow_id;

  // Find transitions from the current step that lead to failure/rejection outcomes
  const transitionsResult = await safeQuery(
    `SELECT t.transition_id, t.to_step_id, c.expression
     FROM "${schema}".workflow_transitions t
     LEFT JOIN "${schema}".workflow_conditions c
       ON c.transition_id = t.transition_id AND c.deleted_at IS NULL
     WHERE t.definition_id = $1
       AND t.from_step_id = $2
       AND t.deleted_at IS NULL
       AND (
         c.expression->>'outcome' IN ('rejected', 'failed')
         OR t.transition_type = 'rejection'
         OR t.label_en ILIKE '%reject%'
         OR t.label_en ILIKE '%fail%'
       )
     ORDER BY t.priority ASC
     LIMIT 1`,
    [definitionId, currentStepId],
  );

  if (transitionsResult.rows.length === 0) return null;

  const row = getFirstRow(transitionsResult);
  return {
    stepId: row.to_step_id,
    transitionId: row.transition_id,
    conditions: row.expression || {},
  };
}
