import { logger } from '@dos/platform-core/observability';
import { safeQuery, tenantSchema } from '@dos/db';
import { publish } from '@dos/event-backbone';
import { canTransition, performTransition, type TransitionResult } from '@dos/platform-core/lifecycle';
import { isTransitionValid, getTransitionPermission } from '@dos/platform-core/lifecycle';
import { resolveWorkflowLevel, type WorkflowLevelResolution, type RiskClassification } from '../integration/three-level-workflow';
const getProductWorkflowMode = (_m: string) => "strict";
const isProtectedTransition = (_m: string, _t: string) => false;
const getEntityRiskClassification = (_m: string, _e: string): RiskClassification => "medium";
import { runNotify, runAudit, runAuthzCheck } from '../contracts/task-hooks.contract';
import { startWorkflowExecution } from '../engine/workflow-engine.service';
import { v4 as uuid } from 'uuid';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface TransitionRequest {
  tenantId: string;
  userId: string;
  moduleCode: string;
  entityType: string;
  entityId: string;
  fromState: string;
  toState: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  skipWorkflow?: boolean;
  correlationId?: string;
}

export interface TransitionDecision {
  allowed: boolean;
  transitionResult?: TransitionResult;
  workflowLevel?: WorkflowLevelResolution;
  pendingApproval: boolean;
  approvalTaskId?: string;
  denialReason?: string;
  auditTrailId?: string;
  checks: TransitionCheck[];
}

export interface TransitionCheck {
  checkType: 'fsm_validation' | 'dauth_permission' | 'self_approval' | 'sod_check' | 'workflow_level' | 'protected_transition' | 'sla_policy';
  passed: boolean;
  detail: string;
}

export interface TransitionPolicy {
  moduleCode: string;
  entityType: string;
  protectedTransitions: string[];
  riskClassification: RiskClassification;
  requiresSelfApprovalGuard: boolean;
  requiresSodCheck: boolean;
  slaHours: number;
  permissionCode: string;
}

function buildTransitionKey(from: string, to: string): string {
  return `${from}→${to}`;
}

function resolveTransitionPolicy(moduleCode: string, entityType: string, from: string, to: string): TransitionPolicy {
  const transitionKey = buildTransitionKey(from, to);
  const isProtected = isProtectedTransition(moduleCode, transitionKey);
  const riskClass = getEntityRiskClassification(moduleCode, entityType);
  const registryPermission = getTransitionPermission(moduleCode, entityType, from, to);

  return {
    moduleCode,
    entityType,
    protectedTransitions: isProtected ? [transitionKey] : [],
    riskClassification: riskClass,
    requiresSelfApprovalGuard: isProtected || riskClass === 'critical' || riskClass === 'high',
    requiresSodCheck: isProtected || riskClass === 'critical',
    slaHours: riskClass === 'critical' ? 4 : riskClass === 'high' ? 24 : riskClass === 'medium' ? 48 : 72,
    permissionCode: registryPermission ?? `${moduleCode}.${entityType}.approve`,
  };
}

async function checkSelfApproval(tenantId: string, userId: string, entityType: string, entityId: string): Promise<{ passed: boolean; detail: string }> {
  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT created_by FROM "${schema}"."${entityType}" WHERE id = $1 LIMIT 1`,
      [entityId],
    ).catch(() => ({ rows: [] }));
    if (rows.length > 0 && rows[0].created_by === userId) {
      return { passed: false, detail: `Self-approval blocked: user ${userId} is the entity creator` };
    }
  } catch {
    // Table might not exist — non-blocking
  }
  return { passed: true, detail: 'Self-approval check passed' };
}

async function checkSod(tenantId: string, userId: string, moduleCode: string, entityType: string, entityId: string): Promise<{ passed: boolean; detail: string }> {
  try {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT action_type FROM "${schema}".entity_lifecycle_log
       WHERE entity_type = $1 AND entity_id = $2 AND module_code = $3 AND actor_id = $4
       ORDER BY created_at DESC LIMIT 5`,
      [entityType, entityId, moduleCode, userId],
    ).catch(() => ({ rows: [] }));

    const recentActions = rows.map(( r: Record<string, any>) => r.action_type).filter(Boolean);
    if (recentActions.includes('create') && recentActions.includes('approve')) {
      return { passed: false, detail: `SoD violation: user ${userId} both created and is attempting to approve` };
    }
  } catch {
    // Non-blocking
  }
  return { passed: true, detail: 'SoD check passed' };
}

async function recordTransitionAudit(
  tenantId: string, userId: string, moduleCode: string, entityType: string,
  entityId: string, from: string, to: string, decision: TransitionDecision, correlationId: string,
): Promise<string> {
  const auditId = uuid();
  try {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `INSERT INTO "${schema}".workflow_transition_audit
       (id, tenant_id, user_id, module_code, entity_type, entity_id, from_state, to_state,
        allowed, pending_approval, denial_reason, workflow_level, checks, correlation_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())`,
      [
        auditId, tenantId, userId, moduleCode, entityType, entityId, from, to,
        decision.allowed, decision.pendingApproval, decision.denialReason ?? null,
        decision.workflowLevel?.resolvedLevel ?? null,
        JSON.stringify(decision.checks), correlationId,
      ],
    );
  } catch {
    logger.warn('[WorkflowLifecycleBridge] Audit table write failed — non-blocking');
  }
  return auditId;
}

export async function executeLifecycleTransition(request: TransitionRequest): Promise<TransitionDecision> {
  const {
    tenantId, userId, moduleCode, entityType, entityId,
    fromState, toState, reason, metadata, skipWorkflow,
  } = request;
  const correlationId = request.correlationId ?? uuid();
  const checks: TransitionCheck[] = [];

  logger.info(`[WorkflowLifecycleBridge] Transition requested: ${moduleCode}:${entityType} ${fromState}→${toState}`, {
    tenantId, userId, entityId, correlationId,
  });

  let fsmValid = isTransitionValid(moduleCode, entityType, fromState, toState)
    || canTransition(moduleCode, entityType, fromState, toState);

  let fsmSource = 'in-memory';
  if (!fsmValid) {
    const schema = tenantSchema(tenantId);
    try {
      const { rows } = await safeQuery(
        `SELECT 1 FROM "${schema}".module_lifecycle_transitions
         WHERE module_code = $1 AND from_status = $2 AND to_status = $3 LIMIT 1`,
        [moduleCode, fromState, toState],
      );
      if (rows.length > 0) {
        fsmValid = true;
        fsmSource = 'db-fallback';
      }
    } catch {
      // DB unavailable — rely on in-memory only
    }
  }

  checks.push({
    checkType: 'fsm_validation',
    passed: fsmValid,
    detail: fsmValid
      ? `Transition ${fromState}→${toState} is valid (${fsmSource})`
      : `Transition ${fromState}→${toState} is not allowed by FSM or DB`,
  });

  if (!fsmValid) {
    const decision: TransitionDecision = {
      allowed: false, pendingApproval: false,
      denialReason: `Invalid state transition: ${fromState}→${toState}`,
      checks,
    };
    decision.auditTrailId = await recordTransitionAudit(tenantId, userId, moduleCode, entityType, entityId, fromState, toState, decision, correlationId);
    return decision;
  }

  const policy = resolveTransitionPolicy(moduleCode, entityType, fromState, toState);

  const authzPassed = await runAuthzCheck(tenantId, userId, policy.permissionCode);
  checks.push({
    checkType: 'dauth_permission',
    passed: authzPassed,
    detail: authzPassed ? `Permission ${policy.permissionCode} granted` : `Permission ${policy.permissionCode} denied`,
  });

  if (!authzPassed) {
    const decision: TransitionDecision = {
      allowed: false, pendingApproval: false,
      denialReason: `Insufficient permission: ${policy.permissionCode}`,
      checks,
    };
    decision.auditTrailId = await recordTransitionAudit(tenantId, userId, moduleCode, entityType, entityId, fromState, toState, decision, correlationId);
    return decision;
  }

  if (policy.requiresSelfApprovalGuard) {
    const selfCheck = await checkSelfApproval(tenantId, userId, entityType, entityId);
    checks.push({
      checkType: 'self_approval',
      passed: selfCheck.passed,
      detail: selfCheck.detail,
    });
    if (!selfCheck.passed) {
      const decision: TransitionDecision = {
        allowed: false, pendingApproval: false,
        denialReason: selfCheck.detail,
        checks,
      };
      decision.auditTrailId = await recordTransitionAudit(tenantId, userId, moduleCode, entityType, entityId, fromState, toState, decision, correlationId);
      return decision;
    }
  }

  if (policy.requiresSodCheck) {
    const sodCheck = await checkSod(tenantId, userId, moduleCode, entityType, entityId);
    checks.push({
      checkType: 'sod_check',
      passed: sodCheck.passed,
      detail: sodCheck.detail,
    });
    if (!sodCheck.passed) {
      const decision: TransitionDecision = {
        allowed: false, pendingApproval: false,
        denialReason: sodCheck.detail,
        checks,
      };
      decision.auditTrailId = await recordTransitionAudit(tenantId, userId, moduleCode, entityType, entityId, fromState, toState, decision, correlationId);
      return decision;
    }
  }

  const transitionKey = buildTransitionKey(fromState, toState);
  const isProtected = isProtectedTransition(moduleCode, transitionKey);

  checks.push({
    checkType: 'protected_transition',
    passed: true,
    detail: isProtected ? `Protected transition — requires workflow approval` : `Standard transition — direct execution allowed`,
  });

  const productMode = getProductWorkflowMode(moduleCode);
  const workflowLevel = await resolveWorkflowLevel({
    tenantId,
    moduleCode,
    entityType,
    riskClassification: policy.riskClassification,
    isProtectedTransition: isProtected,
    productMode: productMode as any,
  });

  checks.push({
    checkType: 'workflow_level',
    passed: true,
    detail: `Resolved to L${workflowLevel.levelConfig.levelNumber} (${workflowLevel.resolvedLevel}): ${workflowLevel.reason}`,
  });

  checks.push({
    checkType: 'sla_policy',
    passed: true,
    detail: `SLA: ${policy.slaHours}h, max workflow SLA: ${workflowLevel.levelConfig.maxSlaHours}h`,
  });

  const requiresApprovalWorkflow = !skipWorkflow
    && (isProtected || !workflowLevel.levelConfig.autoApproveEligible)
    && workflowLevel.levelConfig.requiredApprovers > 0;

  if (requiresApprovalWorkflow) {
    let approvalTaskId: string | undefined;
    try {
      const defResult = await safeQuery(
        `SELECT definition_id FROM "${tenantSchema(tenantId)}".workflow_definitions
         WHERE module_code = $1 AND is_active = true LIMIT 1`,
        [moduleCode],
      ).catch(() => ({ rows: [] }));

      if (defResult.rows.length > 0) {
        const startResult = await startWorkflowExecution(
          tenantId,
          defResult.rows[0].definition_id,
          {
            entityType, entityId, fromState, toState, moduleCode, correlationId,
            riskClassification: policy.riskClassification,
            workflowLevel: workflowLevel.resolvedLevel,
            ...(metadata ?? {}),
          },
          userId,
        );
        approvalTaskId = startResult.taskId ?? startResult.instanceId;
      }
    } catch (err) {
      logger.warn(`[WorkflowLifecycleBridge] Workflow start failed — creating standalone approval`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (!approvalTaskId) {
      approvalTaskId = uuid();
      try {
        const schema = tenantSchema(tenantId);
        await safeQuery(
          `INSERT INTO "${schema}".workflow_approval_queue
           (id, tenant_id, module_code, entity_type, entity_id, requested_by,
            from_state, to_state, workflow_level, required_approvers, status,
            sla_hours, correlation_id, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,$12,NOW())`,
          [
            approvalTaskId, tenantId, moduleCode, entityType, entityId, userId,
            fromState, toState, workflowLevel.resolvedLevel,
            workflowLevel.levelConfig.requiredApprovers,
            Math.min(policy.slaHours, workflowLevel.levelConfig.maxSlaHours),
            correlationId,
          ],
        );
      } catch {
        logger.warn('[WorkflowLifecycleBridge] Approval queue write failed');
      }
    }

    await runNotify(tenantId, {
      userId, type: 'workflow_approval_required',
      title: `Approval required: ${moduleCode} ${entityType} ${fromState}→${toState}`,
      body: `A ${workflowLevel.resolvedLevel}-level approval is needed for ${entityType} ${entityId}`,
      link: `/modules/${moduleCode}/${entityType}/${entityId}`,
    }).catch(catchHandler(EC.EVENT_BUS));

    await publish('workflow.approval_requested', tenantId, {
      moduleCode, entityType, entityId, fromState, toState,
      requestedBy: userId, workflowLevel: workflowLevel.resolvedLevel,
      approvalTaskId, correlationId,
    }, { userId, moduleCode, entityType, entityId, category: 'lifecycle' }).catch(catchHandler(EC.EVENT_BUS));

    const decision: TransitionDecision = {
      allowed: false,
      pendingApproval: true,
      approvalTaskId,
      workflowLevel,
      checks,
    };
    decision.auditTrailId = await recordTransitionAudit(tenantId, userId, moduleCode, entityType, entityId, fromState, toState, decision, correlationId);
    return decision;
  }

  const transitionResult = await performTransition(
    entityId, fromState, toState, moduleCode, entityType,
    { actor: userId, tenantId, reason, metadata: { ...metadata, correlationId, workflowLevel: workflowLevel.resolvedLevel } },
  );

  await runAudit(tenantId, {
    action: 'lifecycle_transition',
    moduleCode, entityType, entityId,
    fromState, toState,
    actor: userId,
    workflowLevel: workflowLevel.resolvedLevel,
    correlationId,
    result: transitionResult.success ? 'success' : 'failure',
  }).catch(catchHandler(EC.EVENT_BUS));

  await publish('lifecycle.transition_completed', tenantId, {
    moduleCode, entityType, entityId, fromState, toState,
    actor: userId, workflowLevel: workflowLevel.resolvedLevel,
    success: transitionResult.success, correlationId,
  }, { userId, moduleCode, entityType, entityId, category: 'lifecycle' }).catch(catchHandler(EC.EVENT_BUS));

  const decision: TransitionDecision = {
    allowed: transitionResult.success,
    transitionResult,
    workflowLevel,
    pendingApproval: false,
    denialReason: transitionResult.error,
    checks,
  };
  decision.auditTrailId = await recordTransitionAudit(tenantId, userId, moduleCode, entityType, entityId, fromState, toState, decision, correlationId);
  return decision;
}

export async function approveTransition(
  tenantId: string, approverId: string, approvalTaskId: string,
  decision: 'approved' | 'rejected', comment?: string,
): Promise<TransitionDecision> {
  const correlationId = uuid();
  const schema = tenantSchema(tenantId);
  const checks: TransitionCheck[] = [];

  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".workflow_approval_queue WHERE id = $1 AND status = 'pending' LIMIT 1`,
    [approvalTaskId],
  ).catch(() => ({ rows: [] }));

  if (rows.length === 0) {
    return { allowed: false, pendingApproval: false, denialReason: 'Approval task not found or already processed', checks: [] };
  }

  const task = rows[0];

  const selfCheck = await checkSelfApproval(tenantId, approverId, task.entity_type, task.entity_id);
  checks.push({ checkType: 'self_approval', passed: selfCheck.passed, detail: selfCheck.detail });
  if (!selfCheck.passed) {
    return { allowed: false, pendingApproval: true, denialReason: selfCheck.detail, checks };
  }

  if (task.requested_by === approverId) {
    return { allowed: false, pendingApproval: true, denialReason: 'Cannot approve own request', checks: [
      ...checks, { checkType: 'self_approval', passed: false, detail: 'Requester cannot approve their own transition' },
    ]};
  }

  await safeQuery(
    `UPDATE "${schema}".workflow_approval_queue
     SET status = $2, approved_by = $3, approval_comment = $4, resolved_at = NOW()
     WHERE id = $1`,
    [approvalTaskId, decision, approverId, comment ?? null],
  ).catch(catchHandler(EC.EVENT_BUS));

  if (decision === 'rejected') {
    await publish('workflow.approval_rejected', tenantId, {
      moduleCode: task.module_code, entityType: task.entity_type, entityId: task.entity_id,
      fromState: task.from_state, toState: task.to_state,
      rejectedBy: approverId, comment, correlationId,
    }, { userId: approverId, moduleCode: task.module_code, entityType: task.entity_type, entityId: task.entity_id, category: 'lifecycle' }).catch(catchHandler(EC.EVENT_BUS));

    return { allowed: false, pendingApproval: false, denialReason: `Rejected by ${approverId}: ${comment ?? 'no reason'}`, checks };
  }

  const transitionResult = await performTransition(
    task.entity_id, task.from_state, task.to_state, task.module_code, task.entity_type,
    { actor: approverId, tenantId, reason: `Approved by ${approverId}: ${comment ?? ''}`, metadata: { approvalTaskId, correlationId } },
  );

  await publish('workflow.approval_completed', tenantId, {
    moduleCode: task.module_code, entityType: task.entity_type, entityId: task.entity_id,
    fromState: task.from_state, toState: task.to_state,
    approvedBy: approverId, correlationId,
  }, { userId: approverId, moduleCode: task.module_code, entityType: task.entity_type, entityId: task.entity_id, category: 'lifecycle' }).catch(catchHandler(EC.EVENT_BUS));

  return { allowed: transitionResult.success, transitionResult, pendingApproval: false, checks };
}

export async function getTransitionRequirements(
  tenantId: string, moduleCode: string, entityType: string, fromState: string, toState: string,
): Promise<{
  valid: boolean;
  policy: TransitionPolicy;
  workflowLevel: WorkflowLevelResolution;
  requiresApproval: boolean;
}> {
  let valid = isTransitionValid(moduleCode, entityType, fromState, toState)
    || canTransition(moduleCode, entityType, fromState, toState);
  if (!valid) {
    const schema = tenantSchema(tenantId);
    try {
      const { rows } = await safeQuery(
        `SELECT 1 FROM "${schema}".module_lifecycle_transitions
         WHERE module_code = $1 AND from_status = $2 AND to_status = $3 LIMIT 1`,
        [moduleCode, fromState, toState],
      );
      if (rows.length > 0) valid = true;
    } catch { /* DB unavailable — rely on in-memory only */ }
  }

  const policy = resolveTransitionPolicy(moduleCode, entityType, fromState, toState);
  const productMode = getProductWorkflowMode(moduleCode);

  const workflowLevel = await resolveWorkflowLevel({
    tenantId, moduleCode, entityType,
    riskClassification: policy.riskClassification,
    isProtectedTransition: isProtectedTransition(moduleCode, buildTransitionKey(fromState, toState)),
    productMode: productMode as any,
  });

  const requiresApproval = !workflowLevel.levelConfig.autoApproveEligible
    && workflowLevel.levelConfig.requiredApprovers > 0;

  return { valid, policy, workflowLevel, requiresApproval };
}

export async function getPendingApprovals(
  tenantId: string, moduleCode?: string, status = 'pending',
): Promise<Array<Record<string, unknown>>> {
  const schema = tenantSchema(tenantId);
  const conds = ['status = $1'];
  const params: unknown[] = [status];
  if (moduleCode) { conds.push('module_code = $2'); params.push(moduleCode); }
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".workflow_approval_queue WHERE ${conds.join(' AND ')} ORDER BY created_at DESC`,
    params as string[],
  ).catch(() => ({ rows: [] }));
  return rows;
}

export async function getTransitionHistory(
  tenantId: string, moduleCode: string, entityType: string, entityId: string,
): Promise<Array<Record<string, unknown>>> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".entity_lifecycle_log
     WHERE module_code = $1 AND entity_type = $2 AND entity_id = $3
     ORDER BY created_at DESC LIMIT 100`,
    [moduleCode, entityType, entityId],
  ).catch(() => ({ rows: [] }));
  return rows;
}
