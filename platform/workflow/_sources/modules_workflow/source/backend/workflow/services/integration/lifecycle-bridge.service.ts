/**
 * Workflow Lifecycle Bridge Service — MP-02 §3 (Integration service family)
 *
 * Canonical bridge between the workflow execution engine and DAuth
 * lifecycle authorization. Centralises all DAuth lifecycle-auth calls
 * so that workflow code never imports from platform/dauth directly
 * except through this single integration point.
 *
 * MP-02 §7: Workflow must always use DAuth for permission checks, scope checks,
 * approval authority, sign-off, delegation, SoD, self-approval prevention,
 * lifecycle authorization, and acting-on-behalf-of rules.
 *
 * Law 11: Deny by default — if DAuth is unavailable the bridge denies.
 * Law 12: Audit by default — all bridge decisions are logged.
 */

import { logger } from '../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import {
  evaluateLifecycleTransition,
  evaluateSod,
  checkSelfApproval,
  validateDelegation,
  evaluateDelegatedAccess,
  canPerform,
  type SodCheckResult,
  type ActingOnBehalfOfContext,
  type DelegationScope,
} from '../../ports/auth.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { safeQuery } from "@dos/db";

// ── Transition Authorization ──────────────────────────────────────────────────

export interface WorkflowTransitionAuthInput {
  tenantId: string;
  userId: string;
  instanceId: string;
  moduleCode: string;
  entityType: string;
  entityId: string;
  fromState: string;
  toState: string;
  permissionCode: string;
  userRoles: string[];
  authorityLevelCode?: string;
  ownerId?: string;
  entityValue?: number;
}

export interface WorkflowTransitionAuthResult {
  allowed: boolean;
  reason: string;
  lifecycleAuthResult: unknown;
}

export async function authorizeWorkflowTransition(
  input: WorkflowTransitionAuthInput,
): Promise<WorkflowTransitionAuthResult> {
  try {
    const result = await evaluateLifecycleTransition(input.tenantId, input.userId, {
      moduleCode: input.moduleCode,
      entityType: input.entityType,
      entityId: input.entityId,
      fromState: input.fromState,
      toState: input.toState,
      permissionCode: input.permissionCode,
      userRoles: input.userRoles,
      authorityLevelCode: input.authorityLevelCode,
      ownerId: input.ownerId,
    });

    if (!result.allowed) {
      await recordAudit({
        tenantId: input.tenantId,
        userId: input.userId,
        module: 'workflow',
        action: 'lifecycle_auth_denied',
        entityType: input.entityType,
        entityId: input.instanceId,
        afterState: {
          reason: result.reason,
          deniedBy: 'lifecycle_auth',
          fromState: input.fromState,
          toState: input.toState,
          moduleCode: input.moduleCode,
        },
      }).catch(catchHandler(EC.EVENT_BUS));
    }

    return { allowed: result.allowed, reason: result.reason, lifecycleAuthResult: result };
  } catch (err) {
    logger.warn(
      '[LifecycleBridge] DAuth lifecycle check failed — denying by default (Law 11)',
      { instanceId: input.instanceId, error: toErrorMessage(err) },
    );
    return {
      allowed: false,
      reason: 'DAuth lifecycle authorization unavailable — deny by default (Law 11)',
      lifecycleAuthResult: {
        allowed: false,
        reason: 'unavailable',
        checks: {
          permissionValid: false,
          transitionValid: false,
          authorityValid: false,
          ownershipValid: false,
          sodValid: false,
          approvalRequired: false,
          approvalSatisfied: false,
        },
      },
    };
  }
}

// ── SoD Check ─────────────────────────────────────────────────────────────────

export interface WorkflowSodInput {
  tenantId: string;
  userRoles: string[];
  moduleCode: string;
}

export interface WorkflowSodResult {
  passed: boolean;
  violations: string[];
  outcome: SodCheckResult['outcome'];
}

export async function checkWorkflowSod(input: WorkflowSodInput): Promise<WorkflowSodResult> {
  try {
    const result = await evaluateSod(input.tenantId, input.userRoles, { moduleCode: input.moduleCode });

    return {
      passed: result.outcome === 'allow',
      violations: result.violations.map((v: any) => v.description ?? `${v.roleA} vs ${v.roleB}`),
      outcome: result.outcome,
    };
  } catch (err) {
    logger.warn('[LifecycleBridge] SoD check failed — denying by default', {
      error: toErrorMessage(err),
    });
    return { passed: false, violations: ['SoD engine unavailable — deny by default'], outcome: 'block' };
  }
}

// ── Self-Approval Prevention ──────────────────────────────────────────────────

export interface SelfApprovalInput {
  tenantId: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: string;
}

export async function preventSelfApprovalForWorkflow(
  input: SelfApprovalInput,
): Promise<{ blocked: boolean; reason: string }> {
  try {
    const result = await checkSelfApproval(
      input.tenantId,
      input.userId,
      input.entityType,
      input.entityId,
      input.action,
    );

    return {
      blocked: !result.allowed,
      reason: result.allowed ? 'ok' : 'Self-approval blocked by SoD policy',
    };
  } catch (err) {
    logger.warn('[LifecycleBridge] Self-approval check failed — blocking by default', {
      userId: input.userId,
      entityId: input.entityId,
      error: toErrorMessage(err),
    });
    return { blocked: true, reason: 'Self-approval guard unavailable — blocking by default' };
  }
}

// ── Delegation Validation ─────────────────────────────────────────────────────

export interface WorkflowDelegationInput {
  tenantId: string;
  agentId: string;
  requiredScope: DelegationScope;
}

export async function validateWorkflowDelegation(
  input: WorkflowDelegationInput,
): Promise<{ valid: boolean; reason: string }> {
  try {
    const grant = await validateDelegation(input.tenantId, input.agentId, input.requiredScope);
    return {
      valid: grant !== null,
      reason: grant ? 'delegation_valid' : 'no_active_delegation_grant',
    };
  } catch (err) {
    logger.warn('[LifecycleBridge] Delegation validation failed', {
      agentId: input.agentId,
      error: toErrorMessage(err),
    });
    return { valid: false, reason: 'Delegation validation unavailable' };
  }
}

// ── Acting-on-Behalf-of Resolution ───────────────────────────────────────────

export async function resolveWorkflowActingContext(
  ctx: ActingOnBehalfOfContext,
  permissionCode: string,
  moduleCode: string,
): Promise<{ allowed: boolean; reason: string }> {
  try {
    return await evaluateDelegatedAccess(ctx, permissionCode, moduleCode);
  } catch (err) {
    logger.warn('[LifecycleBridge] Acting-on-behalf-of resolution failed — denying by default', {
      delegateId: ctx.delegateId,
      error: toErrorMessage(err),
    });
    return { allowed: false, reason: 'Acting-on-behalf-of unavailable — deny by default' };
  }
}

// ── Permission Snapshot for Workflow Actions ──────────────────────────────────

export async function canPerformWorkflowAction(
  tenantId: string,
  userId: string,
  permissionCode: string,
): Promise<boolean> {
  try {
    return await canPerform(tenantId, userId, permissionCode);
  } catch (err) {
    logger.warn('[LifecycleBridge] canPerform check failed — denying by default', {
      userId,
      permissionCode,
      error: toErrorMessage(err),
    });
    return false;
  }
}
