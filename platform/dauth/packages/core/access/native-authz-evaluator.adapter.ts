/**
 * NativeAuthzEvaluator — adapter that bridges the dauth-shared
 * `AuthzEvaluator` port to dauth-core's 14-step `evaluateAccess()` pipeline.
 *
 * Wiring direction (avoids the dauth-shared ↔ dauth-core circular dep):
 *
 *   dauth-shared declares the port + a globalThis registry slot
 *   dauth-core  imports the port, implements it via evaluateAccess()
 *               and registers it via setAuthzEvaluator() at bootstrap time
 *   middleware  in dauth-shared resolves the registered evaluator at
 *               request time (or falls back to LegacyClaimAuthzEvaluator)
 *
 * Once registered, every `requirePermission()`, `requireAnyPermission()`,
 * `requireDauth()`, and `requireOwnershipOf()` call routes through the
 * full pipeline (membership → tenant-active → RBAC → entitlement → ABAC →
 * ReBAC → SoD → delegation → lifecycle → SLA → ledger).
 *
 * Plan: /root/.claude/plans/need-to-clean-the-swift-trinket.md
 */
import type {
  AuthzEvaluator,
  AuthzEvaluationContext,
  AuthzDecision,
} from '@dos/dauth-shared';
import { setAuthzEvaluator } from '@dos/dauth-shared';
import { evaluateAccess, type AccessDecisionContext } from './decision-engine';

export class NativeAuthzEvaluator implements AuthzEvaluator {
  readonly name = 'dauth-native' as const;

  async evaluate(ctx: AuthzEvaluationContext): Promise<AuthzDecision> {
    const decisionCtx: AccessDecisionContext = {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      role: ctx.role,
      roles: ctx.roles,
      isSuperAdmin: ctx.isSuperAdmin,
      permissionCode: ctx.permissionCode,
      moduleCode: ctx.moduleCode,
      scopeType: ctx.scopeType,
      scopeId: ctx.scopeId,
      authorityRequired: ctx.authorityRequired,
      lifecycleFromState: ctx.lifecycleFromState,
      lifecycleToState: ctx.lifecycleToState,
      entityType: ctx.entityType,
      entityId: ctx.entityId,
      ownershipRequired: ctx.ownershipRequired,
      ip: ctx.ip,
      path: ctx.path,
      attributes: ctx.attributes,
      correlationId: ctx.correlationId,
      dryRun: ctx.dryRun,
    };

    const decision = await evaluateAccess(decisionCtx);

    // Translate AccessDecision → AuthzDecision (narrower middleware shape).
    // The pipeline already wrote to authz_decision_log unless dryRun.
    return {
      decision: decision.allowed
        ? 'allow'
        : decision.obligations?.requireDualApproval
        ? 'pending_approval'
        : decision.failedCheck === 'authority_check'
        ? 'escalated'
        : 'deny',
      reasonCode: decision.reasonCode ?? 'DAUTH_NATIVE',
      reason: decision.reason,
      matchedRoles: decision.matchedRole ? [decision.matchedRole] : undefined,
      matchedScopes: decision.matchedScopeType ? [decision.matchedScopeType] : undefined,
      correlationId: ctx.correlationId,
      engineResults: decision.engineResults,
      source: 'dauth-native',
    };
  }
}

/**
 * One-shot installer — call this from each service's bootstrap (typically in
 * `service-bootstrap.ts` right after `bootstrapDauth(...)`). Idempotent;
 * subsequent calls reseat the same instance.
 */
export function installNativeAuthzEvaluator(): NativeAuthzEvaluator {
  const evaluator = new NativeAuthzEvaluator();
  setAuthzEvaluator(evaluator);
  return evaluator;
}
