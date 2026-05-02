/**
 * Decision replay — re-evaluates a historical decision against current
 * policy/model versions and produces a diff. Powers the compliance answer
 * "would this decision come out the same today?".
 *
 * Usage:
 *   const r = await replayDecision({ tenantId, decisionId });
 *   if (!r.identical) logger.warn('policy drift for', r.action);
 *
 * Implementation:
 *   1. Load the ledger row by id (or correlationId).
 *   2. Reconstruct `AccessDecisionContext` from the stored fields + record_context.
 *   3. Run `evaluateAccess` with `dryRun: true` — no ledger write.
 *   4. Diff the current verdict against the stored one.
 */
import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import {
  evaluateAccess,
  type AccessDecisionContext,
} from '../access/decision-engine';
import { DAUTH_CONFIG } from '../dauth.config';

export interface ReplayDecisionInput {
  tenantId: string;
  decisionId?: string;
  correlationId?: string;
}

export interface ReplayDecisionResult {
  found: boolean;
  decisionId?: string;
  action?: string;
  originalDecision?: 'allow' | 'deny';
  originalReasonCode?: string;
  originalPolicyVersion?: string;
  originalModelVersion?: string;
  replayedAllowed?: boolean;
  replayedReasonCode?: string;
  replayedPolicyVersion?: string;
  replayedModelVersion?: string;
  /** True if the replayed verdict matches the original. */
  identical?: boolean;
  /** Fields that differ between original and replay. */
  delta?: string[];
}

export async function replayDecision(
  input: ReplayDecisionInput,
): Promise<ReplayDecisionResult> {
  if (!DAUTH_CONFIG.accessReplay.enabled) {
    throw new Error('[DAuth:Replay] disabled via DAUTH_ACCESS_REPLAY_ENABLED=false');
  }
  if (!input.decisionId && !input.correlationId) {
    throw new Error('[DAuth:Replay] decisionId or correlationId is required');
  }

  const schema = tenantSchema(input.tenantId);
  const row = await safeQuery(
    `SELECT id, user_id, permission_code, module_code, decision, reason,
            matched_role, matched_scope_type, authority_level, correlation_id,
            record_context, created_at
     FROM "${schema}".authz_decision_log
     WHERE ${input.decisionId ? 'id = $1' : 'correlation_id = $1'}
     ORDER BY created_at DESC
     LIMIT 1`,
    [input.decisionId ?? input.correlationId],
  );
  if (row.rows.length === 0) {
    return { found: false };
  }

  const r: any = row.rows[0];
  const ctxRec = (r.record_context ?? {}) as Record<string, unknown>;

  const ctx: AccessDecisionContext = {
    userId: r.user_id,
    tenantId: input.tenantId,
    role: r.matched_role ?? '',
    roles: Array.isArray((ctxRec.roles as unknown))
      ? (ctxRec.roles as string[])
      : r.matched_role
        ? [r.matched_role]
        : [],
    permissionCode: r.permission_code,
    moduleCode: r.module_code ?? undefined,
    scopeType: r.matched_scope_type ?? undefined,
    authorityRequired: r.authority_level ?? undefined,
    ip: typeof ctxRec.ip === 'string' ? ctxRec.ip : undefined,
    path: typeof ctxRec.path === 'string' ? ctxRec.path : undefined,
    attributes: (ctxRec.attributes as Record<string, unknown>) ?? undefined,
    dryRun: true,
    correlationId: `replay:${r.id}`,
    isSuperAdmin: ctxRec.isSuperAdmin === true,
  };

  let replayed;
  try {
    replayed = await evaluateAccess(ctx);
  } catch (err) {
    logger.warn('[DAuth:Replay] evaluateAccess threw during replay', {
      decisionId: r.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      found: true,
      decisionId: r.id,
      action: r.permission_code,
      originalDecision: r.decision,
    };
  }

  const delta: string[] = [];
  const originalAllowed = r.decision === 'allow';
  if (originalAllowed !== replayed.allowed) delta.push('decision');

  const originalReasonCode = typeof ctxRec.reasonCode === 'string' ? ctxRec.reasonCode : undefined;
  if (originalReasonCode !== replayed.reasonCode) delta.push('reasonCode');

  const originalPolicyVersion = typeof ctxRec.policyVersion === 'string'
    ? ctxRec.policyVersion
    : undefined;
  if (originalPolicyVersion !== replayed.policyVersion) delta.push('policyVersion');

  const originalModelVersion = typeof ctxRec.modelVersion === 'string'
    ? ctxRec.modelVersion
    : undefined;
  if (originalModelVersion !== replayed.modelVersion) delta.push('modelVersion');

  return {
    found: true,
    decisionId: r.id,
    action: r.permission_code,
    originalDecision: r.decision,
    originalReasonCode,
    originalPolicyVersion,
    originalModelVersion,
    replayedAllowed: replayed.allowed,
    replayedReasonCode: replayed.reasonCode,
    replayedPolicyVersion: replayed.policyVersion,
    replayedModelVersion: replayed.modelVersion,
    identical: delta.length === 0,
    delta,
  };
}
