import { catchHandler, EC } from '@dos/platform-core/resilience';
import { logger } from '@dos/platform-core/observability';
// ============================================
// Canonical Approval Engine — DOS (Patch 7 §2.3, §2.9)
// @owner DOS
// @since 2026-03-30
// Multi-level approval chain management with
// auto-escalation, delegation, and SLA tracking.
//
// This service extends the existing approval-routing
// system with reusable approval chain definitions
// stored in the master schema.
//
// Requirements: W2-9
// ============================================

import {  safeQuery } from '@dos/db';
import { eventBus } from '@dos/event-backbone';
import { runNotify, runAudit } from '../contracts/task-hooks.contract';
import { toErrorMessage } from '@dos/platform-core/resilience';
import { getFirstRow } from '@dos/db';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core';

// ── Types ──

export interface ApprovalChainStep {
  stepNumber: number;
  approverRole?: string;
  approverId?: string;
  slaHours: number;
  canDelegate: boolean;
}

export interface ApprovalChainConfig {
  name: string;
  entityType: string;
  steps: ApprovalChainStep[];
  autoEscalationHours?: number;
}

export interface ApprovalChainRecord {
  chainId: string;
  name: string;
  entityType: string;
  steps: ApprovalChainStep[];
  active: boolean;
  createdAt: string;
}

export interface ApprovalRequestRecord {
  requestId: string;
  chainId: string;
  entityType: string;
  entityId: string;
  currentStep: number;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  submittedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalStepLog {
  logId: string;
  requestId: string;
  stepNumber: number;
  action: 'approved' | 'rejected' | 'delegated' | 'escalated';
  actorId: string;
  comments: string | null;
  createdAt: string;
}

// ── Default auto-escalation timeout (48 hours) ──
const DEFAULT_ESCALATION_HOURS = 48;

// ── Create Approval Chain ──

/**
 * Create a reusable multi-level approval chain definition.
 * Chain definitions are stored in the master (public) schema
 * and can be referenced by any tenant workflow.
 */
export async function createApprovalChain(
  tenantId: string,
  config: ApprovalChainConfig,
): Promise<ApprovalChainRecord> {
  if (!config.name || !config.entityType || !config.steps?.length) {
    throw new Error('name, entityType, and at least one step are required');
  }

  // Validate step numbers are sequential
  const sortedSteps = [...config.steps].sort((a, b) => a.stepNumber - b.stepNumber);
  for (let i = 0; i < sortedSteps.length; i++) {
    if (sortedSteps[i].stepNumber !== i + 1) {
      throw new Error(`Step numbers must be sequential starting from 1, found gap at position ${i + 1}`);
    }
    if (!sortedSteps[i].approverRole && !sortedSteps[i].approverId) {
      throw new Error(`Step ${sortedSteps[i].stepNumber} must have either approverRole or approverId`);
    }
  }

  const result = await safeQuery(
    `INSERT INTO public.approval_chains (name, entity_type, steps, active)
     VALUES ($1, $2, $3, TRUE)
     RETURNING chain_id, name, entity_type, steps, active, created_at`,
    [config.name, config.entityType, JSON.stringify(sortedSteps)],
  );

  const row = getFirstRow(result);
  const chain = mapChainRow(row);

  await runAudit(tenantId, {
    userId: SYSTEM_JOB_ACTOR,
    module: 'approval-engine',
    action: 'create',
    entityType: 'approval_chain',
    entityId: chain.chainId,
    afterState: { name: config.name, entityType: config.entityType, stepCount: sortedSteps.length },
  });

  logger.info(`[ApprovalEngine] Created chain "${config.name}" with ${sortedSteps.length} steps`);
  return chain;
}

// ── Submit for Approval ──

/**
 * Start an approval workflow for a given entity.
 * Looks up the matching approval chain by entityType,
 * creates an approval_requests record, and notifies
 * the first approver.
 */
export async function submitForApproval(
  tenantId: string,
  entityType: string,
  entityId: string,
  submittedBy: string,
): Promise<ApprovalRequestRecord> {
  // Find the active chain for this entity type
  const chainResult = await safeQuery(
    `SELECT * FROM public.approval_chains
     WHERE entity_type = $1 AND active = TRUE
     ORDER BY created_at DESC LIMIT 1`,
    [entityType],
  );

  if (chainResult.rows.length === 0) {
    throw new Error(`No active approval chain found for entity type: ${entityType}`);
  }

  const chain = mapChainRow(getFirstRow(chainResult));

  // Create approval request
  const result = await safeQuery(
    `INSERT INTO public.approval_requests
       (chain_id, entity_type, entity_id, current_step, status, submitted_by)
     VALUES ($1, $2, $3, 1, 'pending', $4)
     RETURNING *`,
    [chain.chainId, entityType, entityId, submittedBy],
  );

  const request = mapRequestRow(getFirstRow(result));

  // Notify first approver
  const firstStep = chain.steps[0];
  if (firstStep) {
    const approverId = firstStep.approverId || firstStep.approverRole;
    if (approverId) {
      try {
        await runNotify(tenantId, {
          userId: approverId,
          type: 'approval_request',
          title: `Approval required: ${entityType}`,
          body: `${submittedBy} submitted ${entityType} ${entityId} for approval (step 1 of ${chain.steps.length}).`,
          link: `/approvals/${request.requestId}`,
        });
      } catch {
        // Non-fatal: notification delivery failure should not block the workflow
      }
    }
  }

  // Log the submission step
  await safeQuery(
    `INSERT INTO public.approval_steps_log (request_id, step_number, action, actor_id, comments)
     VALUES ($1, 0, 'submitted', $2, 'Submitted for approval')`,
    [request.requestId, submittedBy],
  );

  await eventBus.publish({
    eventType: 'approval.submitted' as any,
    tenantId,
    sourceService: 'approval-engine',
    entityType,
    entityId,
    severity: 'info',
    payload: { requestId: request.requestId, chainId: chain.chainId, submittedBy },
  });

  logger.info(`[ApprovalEngine] Submitted ${entityType}:${entityId} for approval (chain: ${chain.name})`);
  return request;
}

// ── Approve Step ──

/**
 * Approve the current step of an approval request.
 * If this is the last step, marks the request as approved.
 * Otherwise, advances to the next step and notifies the next approver.
 */
export async function approveStep(
  tenantId: string,
  approvalId: string,
  approvedBy: string,
  comments?: string,
  requestValue?: number,
): Promise<ApprovalRequestRecord> {
  const request = await getRequestOrThrow(approvalId);

  if (request.status !== 'pending') {
    throw new Error(`Approval request is already ${request.status}`);
  }

  if (requestValue !== undefined && requestValue > 0) {
    try {
      const { checkActorAuthority } = await import('../../platform/dauth/authority/approval-matrix.service.js');
      const authorityCheck = await checkActorAuthority(
        tenantId, approvedBy,
        `workflow.${request.entityType}.approve`,
        request.entityType?.split('.')[0] || 'workflow',
        requestValue,
      );
      if (!authorityCheck.canApprove) {
        throw new Error(
          `Approval limit exceeded: ${authorityCheck.reason}. Escalating to next level.`
        );
      }
    } catch (e: unknown) {
      if (toErrorMessage(e).includes('Approval limit exceeded')) throw e;
    }
  }

  // OpenFGA SoD guard — second-tier check on top of DAuth SodEngine.
  // In SHADOW mode, logs verdicts for the divergence cron. In ENFORCE mode,
  // denies when the graph says `user:<approver>` lacks `can_approve` on the
  // entity (catches `but_not owner` SoD conflicts that escaped DAuth's check).
  try {
    const { checkCanApprove } = await import('./openfga-approval-guard.js');
    const guard = await checkCanApprove(tenantId, approvedBy, request.entityType, request.entityId);
    if (!guard.allowed) {
      throw new Error(`OpenFGA SoD: ${guard.reason ?? 'can_approve denied'}`);
    }
  } catch (e: unknown) {
    if (toErrorMessage(e).includes('OpenFGA SoD')) throw e;
    // non-fatal: unavailability in shadow mode already allowed through
  }

  // Get chain to determine total steps
  const chainResult = await safeQuery(
    `SELECT * FROM public.approval_chains WHERE chain_id = $1`,
    [request.chainId],
  );
  if (chainResult.rows.length === 0) {
    throw new Error('Approval chain not found');
  }
  const chain = mapChainRow(getFirstRow(chainResult));
  const totalSteps = chain.steps.length;

  // Log the approval action
  await safeQuery(
    `INSERT INTO public.approval_steps_log (request_id, step_number, action, actor_id, comments)
     VALUES ($1, $2, 'approved', $3, $4)`,
    [approvalId, request.currentStep, approvedBy, comments || null],
  );

  const isLastStep = request.currentStep >= totalSteps;

  if (isLastStep) {
    // Final step approved — mark request as approved
    await safeQuery(
      `UPDATE public.approval_requests
       SET status = 'approved', updated_at = NOW()
       WHERE request_id = $1`,
      [approvalId],
    );

    await eventBus.publish({
      eventType: 'approval.completed' as any,
      tenantId,
      sourceService: 'approval-engine',
      entityType: request.entityType,
      entityId: request.entityId,
      severity: 'info',
      payload: { requestId: approvalId, approvedBy, step: request.currentStep },
    });

    try {

      const { emitWorkflowEvent } = await import('../events/workflow-event-emitter.service.js');
      emitWorkflowEvent({
        tenantId, instanceId: request.entityId,
        eventType: 'approved', triggeredBy: approvedBy,
        previousState: 'pending', newState: 'approved',
        payload: { requestId: approvalId, step: request.currentStep },
      }).catch(catchHandler(EC.EVENT_BUS, {}));
    } catch { /* best-effort */ }

    try {
      const { onApprovalResolved } = await import('../engine/workflow-engine.service.js');
      onApprovalResolved(tenantId, approvalId, 'approved', approvedBy).catch(catchHandler(EC.EVENT_BUS, {}));
    } catch { /* best-effort */ }

    // Notify submitter of approval
    try {
      await runNotify(tenantId, {
        userId: request.submittedBy,
        type: 'approval_completed',
        title: `Approved: ${request.entityType}`,
        body: `Your ${request.entityType} ${request.entityId} has been fully approved.`,
        link: `/approvals/${approvalId}`,
      });
    } catch {
      // Non-fatal
    }
  } else {
    // Advance to next step
    const nextStep = request.currentStep + 1;
    await safeQuery(
      `UPDATE public.approval_requests
       SET current_step = $1, updated_at = NOW()
       WHERE request_id = $2`,
      [nextStep, approvalId],
    );

    // Notify next approver
    const nextStepDef = chain.steps.find((s) => s.stepNumber === nextStep);
    if (nextStepDef) {
      const nextApproverId = nextStepDef.approverId || nextStepDef.approverRole;
      if (nextApproverId) {
        try {
          await runNotify(tenantId, {
            userId: nextApproverId,
            type: 'approval_request',
            title: `Approval required: ${request.entityType}`,
            body: `Step ${nextStep} of ${totalSteps} — please review and decide.`,
            link: `/approvals/${approvalId}`,
          });
        } catch {
          // Non-fatal
        }
      }
    }
  }

  await runAudit(tenantId, {
    userId: approvedBy,
    module: 'approval-engine',
    action: 'approve',
    entityType: 'approval_request',
    entityId: approvalId,
    afterState: { step: request.currentStep, isLastStep, comments },
  });

  return getRequestOrThrow(approvalId);
}

// ── Reject Step ──

/**
 * Reject the current step and return to the submitter.
 * Sets request status to 'rejected' with the rejection reason.
 */
export async function rejectStep(
  tenantId: string,
  approvalId: string,
  rejectedBy: string,
  reason: string,
): Promise<ApprovalRequestRecord> {
  const request = await getRequestOrThrow(approvalId);

  if (request.status !== 'pending') {
    throw new Error(`Approval request is already ${request.status}`);
  }

  if (!reason) {
    throw new Error('Rejection reason is required');
  }

  // Log the rejection
  await safeQuery(
    `INSERT INTO public.approval_steps_log (request_id, step_number, action, actor_id, comments)
     VALUES ($1, $2, 'rejected', $3, $4)`,
    [approvalId, request.currentStep, rejectedBy, reason],
  );

  // Mark request as rejected
  await safeQuery(
    `UPDATE public.approval_requests
     SET status = 'rejected', updated_at = NOW()
     WHERE request_id = $1`,
    [approvalId],
  );

  await eventBus.publish({
    eventType: 'approval.rejected' as any,
    tenantId,
    sourceService: 'approval-engine',
    entityType: request.entityType,
    entityId: request.entityId,
    severity: 'warning',
    payload: { requestId: approvalId, rejectedBy, reason, step: request.currentStep },
  });

  try {

    const { emitWorkflowEvent } = await import('../events/workflow-event-emitter.service.js');
    emitWorkflowEvent({
      tenantId, instanceId: request.entityId,
      eventType: 'rejected', triggeredBy: rejectedBy,
      previousState: 'pending', newState: 'rejected',
      payload: { requestId: approvalId, step: request.currentStep, reason },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  } catch { /* best-effort */ }

  try {
    const { onApprovalResolved } = await import('../engine/workflow-engine.service.js');
    onApprovalResolved(tenantId, approvalId, 'rejected', rejectedBy).catch(catchHandler(EC.EVENT_BUS, {}));
  } catch { /* best-effort */ }

  // Notify submitter of rejection
  try {
    await runNotify(tenantId, {
      userId: request.submittedBy,
      type: 'approval_rejected',
      title: `Rejected: ${request.entityType}`,
      body: `Your ${request.entityType} ${request.entityId} was rejected: ${reason}`,
      link: `/approvals/${approvalId}`,
    });
  } catch {
    // Non-fatal
  }

  await runAudit(tenantId, {
    userId: rejectedBy,
    module: 'approval-engine',
    action: 'reject',
    entityType: 'approval_request',
    entityId: approvalId,
    afterState: { step: request.currentStep, reason },
  });

  return getRequestOrThrow(approvalId);
}

// ── Delegate Approval ──

/**
 * Delegate the current approval step from one user to another.
 * The original approver remains in the audit trail.
 */
export async function delegateApproval(
  tenantId: string,
  approvalId: string,
  fromUserId: string,
  toUserId: string,
): Promise<ApprovalRequestRecord> {
  const request = await getRequestOrThrow(approvalId);

  if (request.status !== 'pending') {
    throw new Error(`Approval request is already ${request.status}`);
  }

  if (fromUserId === toUserId) {
    throw new Error('Cannot delegate to yourself');
  }

  // Get chain to check if delegation is allowed for this step
  const chainResult = await safeQuery(
    `SELECT * FROM public.approval_chains WHERE chain_id = $1`,
    [request.chainId],
  );
  if (chainResult.rows.length === 0) {
    throw new Error('Approval chain not found');
  }
  const chain = mapChainRow(getFirstRow(chainResult));
  const currentStepDef = chain.steps.find((s) => s.stepNumber === request.currentStep);

  if (currentStepDef && !currentStepDef.canDelegate) {
    throw new Error('Delegation is not allowed for this approval step');
  }

  // Log the delegation
  await safeQuery(
    `INSERT INTO public.approval_steps_log (request_id, step_number, action, actor_id, comments)
     VALUES ($1, $2, 'delegated', $3, $4)`,
    [approvalId, request.currentStep, fromUserId, `Delegated to ${toUserId}`],
  );

  // Notify the delegate
  try {
    await runNotify(tenantId, {
      userId: toUserId,
      type: 'approval_delegated',
      title: `Approval delegated to you: ${request.entityType}`,
      body: `${fromUserId} delegated the approval for ${request.entityType} ${request.entityId} to you.`,
      link: `/approvals/${approvalId}`,
    });
  } catch {
    // Non-fatal
  }

  await runAudit(tenantId, {
    userId: fromUserId,
    module: 'approval-engine',
    action: 'delegate',
    entityType: 'approval_request',
    entityId: approvalId,
    afterState: { step: request.currentStep, fromUserId, toUserId },
  });

  logger.info(`[ApprovalEngine] Delegated approval ${approvalId} step ${request.currentStep} from ${fromUserId} to ${toUserId}`);
  return getRequestOrThrow(approvalId);
}

// ── Escalate Approval ──

/**
 * Escalate an approval request to the next level after SLA breach.
 * Advances to the next step in the chain or marks as escalated
 * if no further steps exist.
 */
export async function escalateApproval(
  tenantId: string,
  approvalId: string,
): Promise<ApprovalRequestRecord> {
  const request = await getRequestOrThrow(approvalId);

  if (request.status !== 'pending') {
    throw new Error(`Approval request is already ${request.status}`);
  }

  // Get chain definition
  const chainResult = await safeQuery(
    `SELECT * FROM public.approval_chains WHERE chain_id = $1`,
    [request.chainId],
  );
  if (chainResult.rows.length === 0) {
    throw new Error('Approval chain not found');
  }
  const chain = mapChainRow(getFirstRow(chainResult));
  const totalSteps = chain.steps.length;

  // Log the escalation
  await safeQuery(
    `INSERT INTO public.approval_steps_log (request_id, step_number, action, actor_id, comments)
     VALUES ($1, $2, 'escalated', 'system', 'Auto-escalated due to SLA breach')`,
    [approvalId, request.currentStep],
  );

  if (request.currentStep < totalSteps) {
    // Advance to next step (escalation)
    const nextStep = request.currentStep + 1;
    await safeQuery(
      `UPDATE public.approval_requests
       SET current_step = $1, updated_at = NOW()
       WHERE request_id = $2`,
      [nextStep, approvalId],
    );

    // Notify the escalation target
    const nextStepDef = chain.steps.find((s) => s.stepNumber === nextStep);
    if (nextStepDef) {
      const nextApproverId = nextStepDef.approverId || nextStepDef.approverRole;
      if (nextApproverId) {
        try {
          await runNotify(tenantId, {
            userId: nextApproverId,
            type: 'approval_escalated',
            title: `Escalated approval: ${request.entityType}`,
            body: `Approval for ${request.entityType} ${request.entityId} was escalated due to SLA breach. Step ${nextStep} of ${totalSteps}.`,
            link: `/approvals/${approvalId}`,
          });
        } catch {
          // Non-fatal
        }
      }
    }
  } else {
    // No more steps — mark as escalated (requires manual intervention)
    await safeQuery(
      `UPDATE public.approval_requests
       SET status = 'escalated', updated_at = NOW()
       WHERE request_id = $1`,
      [approvalId],
    );
  }

  await eventBus.publish({
    eventType: 'approval.escalated' as any,
    tenantId,
    sourceService: 'approval-engine',
    entityType: request.entityType,
    entityId: request.entityId,
    severity: 'warning',
    payload: { requestId: approvalId, escalatedFromStep: request.currentStep },
  });

  await runAudit(tenantId, {
    userId: SYSTEM_JOB_ACTOR,
    module: 'approval-engine',
    action: 'escalate',
    entityType: 'approval_request',
    entityId: approvalId,
    afterState: { fromStep: request.currentStep },
  });

  logger.info(`[ApprovalEngine] Escalated approval ${approvalId} from step ${request.currentStep}`);
  return getRequestOrThrow(approvalId);
}

// ── Auto-Escalation Check ──

/**
 * Check for pending approval requests that have exceeded their SLA
 * and auto-escalate them. Designed to be called by a scheduled job.
 *
 * @param escalationHours - Hours after which to escalate (default: 48)
 * @returns Number of approvals escalated
 */
export async function checkAndEscalateOverdue(
  escalationHours: number = DEFAULT_ESCALATION_HOURS,
): Promise<number> {
  // Find pending requests older than the escalation threshold
  const result = await safeQuery(
    `SELECT request_id, entity_type FROM public.approval_requests
     WHERE status = 'pending'
       AND updated_at < NOW() - INTERVAL '${Math.floor(escalationHours)} hours'
     ORDER BY updated_at ASC
     LIMIT 50`,
  );

  let escalatedCount = 0;

  for (const row of result.rows) {
    try {
      // Use a generic tenantId for escalation since these are master-schema records.
      // The entity_type context provides enough information for downstream handlers.
      await escalateApproval('system', row.request_id);
      escalatedCount++;
    } catch (err: unknown) {
      logger.warn(`[ApprovalEngine] Failed to escalate ${row.request_id}: ${toErrorMessage(err)}`);
    }
  }

  if (escalatedCount > 0) {
    logger.info(`[ApprovalEngine] Auto-escalated ${escalatedCount} overdue approvals`);
  }

  return escalatedCount;
}

// ── Internal Helpers ──

async function getRequestOrThrow(approvalId: string): Promise<ApprovalRequestRecord> {
  const result = await safeQuery(
    `SELECT * FROM public.approval_requests WHERE request_id = $1`,
    [approvalId],
  );
  if (result.rows.length === 0) {
    throw new Error('Approval request not found');
  }
  return mapRequestRow(getFirstRow(result));
}

function mapChainRow(row: Record<string, any>): ApprovalChainRecord {
  const steps = typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps || [];
  return {
    chainId: row.chain_id,
    name: row.name,
    entityType: row.entity_type,
    steps,
    active: row.active,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ''),
  };
}

function mapRequestRow(row: Record<string, any>): ApprovalRequestRecord {
  return {
    requestId: row.request_id,
    chainId: row.chain_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    currentStep: row.current_step || 1,
    status: row.status,
    submittedBy: row.submitted_by,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ''),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || ''),
  };
}
