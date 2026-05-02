import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import {
  queryDecisionLog,
  type DecisionLogEntry,
} from '../audit/decision-log.service';

export interface DauthDiagnosticsResult {
  tenantId: string;
  timestamp: string;
  expiredDelegations: number;
  orphanedSessions: number;
  staleAccessSnapshots: number;
  sodViolationsAccumulated: number;
  lockedAccounts: number;
  pendingAccessReviews: number;
  staleInvitations: number;
  usersWithoutRoles: number;
  expiredRoleAssignments: number;
}

export async function runDauthDiagnostics(tenantId: string): Promise<DauthDiagnosticsResult> {
  const schema = tenantSchema(tenantId);
  const timestamp = new Date().toISOString();

  const [
    expiredDelegations,
    orphanedSessions,
    sodViolations,
    lockedAccounts,
    pendingReviews,
    staleInvitations,
    usersWithoutRoles,
    expiredAssignments,
  ] = await Promise.all([
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".delegations
       WHERE is_active = TRUE AND valid_to < NOW()`,
    ).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { logger.debug('[DAuth:Diagnostics] query degraded', { error: (err as Error).message }); return 0; }),

    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM sessions
       WHERE tenant_id = $1 AND status = 'active'
         AND last_activity_at < NOW() - INTERVAL '48 hours'`,
      [tenantId],
    ).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { logger.debug('[DAuth:Diagnostics] query degraded', { error: (err as Error).message }); return 0; }),

    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".sod_conflict_resolution_history
       WHERE resolution_status = 'unresolved'`,
    ).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { logger.debug('[DAuth:Diagnostics] query degraded', { error: (err as Error).message }); return 0; }),

    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM users
       WHERE tenant_id = $1 AND status = 'locked'`,
      [tenantId],
    ).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { logger.debug('[DAuth:Diagnostics] query degraded', { error: (err as Error).message }); return 0; }),

    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".access_reviews
       WHERE status = 'pending'`,
    ).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { logger.debug('[DAuth:Diagnostics] query degraded', { error: (err as Error).message }); return 0; }),

    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM invitations
       WHERE tenant_id = $1 AND status = 'pending'
         AND created_at < NOW() - INTERVAL '72 hours'`,
      [tenantId],
    ).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { logger.debug('[DAuth:Diagnostics] query degraded', { error: (err as Error).message }); return 0; }),

    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM users u
       WHERE u.tenant_id = $1 AND u.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".enterprise_user_role_assignments era
           WHERE era.user_id = u.user_id AND era.is_active = TRUE
         )`,
      [tenantId],
    ).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { logger.debug('[DAuth:Diagnostics] query degraded', { error: (err as Error).message }); return 0; }),

    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".enterprise_user_role_assignments
       WHERE is_active = TRUE AND valid_to IS NOT NULL AND valid_to < NOW()`,
    ).then(r => parseInt(r.rows[0]?.cnt ?? '0', 10)).catch((err) => { logger.debug('[DAuth:Diagnostics] query degraded', { error: (err as Error).message }); return 0; }),
  ]);

  const result: DauthDiagnosticsResult = {
    tenantId,
    timestamp,
    expiredDelegations,
    orphanedSessions,
    staleAccessSnapshots: 0,
    sodViolationsAccumulated: sodViolations,
    lockedAccounts,
    pendingAccessReviews: pendingReviews,
    staleInvitations,
    usersWithoutRoles,
    expiredRoleAssignments: expiredAssignments,
  };

  const issues = Object.entries(result)
    .filter(([k, v]) => typeof v === 'number' && v > 0 && k !== 'tenantId')
    .map(([k, v]) => `${k}=${v}`);

  if (issues.length > 0) {
    logger.warn('[DAuth:Diagnostics] issues detected', { tenantId, issues: issues.join(', ') });
  }

  return result;
}

/**
 * Rehydrate a historical decision for debugging. Answers: "why did this
 * user get denied?" end-to-end — which of the 14 steps failed, which
 * reason code was emitted, and which engine results (Cerbos / OpenFGA)
 * fed into it.
 *
 * Looks up by either the ledger primary key (`id`) or the correlation id
 * that ties a request chain together.
 */
export interface ExplainDecisionInput {
  tenantId: string;
  /** Either a ledger row id (uuid) or a correlation id (string). */
  decisionId?: string;
  correlationId?: string;
}

export interface ExplainDecisionResult {
  found: boolean;
  tenantId: string;
  primary?: DecisionLogEntry;
  /** Sibling decisions that share the correlation id (same request chain). */
  chain: DecisionLogEntry[];
  /** Rendered trace — one line per check + per engine. */
  trace: string[];
}

export async function explainDecision(
  input: ExplainDecisionInput,
): Promise<ExplainDecisionResult> {
  const { tenantId } = input;
  if (!input.decisionId && !input.correlationId) {
    return {
      found: false,
      tenantId,
      chain: [],
      trace: ['explainDecision: either decisionId or correlationId is required'],
    };
  }

  let primary: DecisionLogEntry | undefined;
  let chain: DecisionLogEntry[] = [];

  if (input.correlationId) {
    const { entries } = await queryDecisionLog(tenantId, {
      correlationId: input.correlationId,
      limit: 100,
    });
    chain = entries;
    primary = entries[0];
  } else if (input.decisionId) {
    const schema = tenantSchema(tenantId);
    const row = await safeQuery(
      `SELECT id, user_id, permission_code, module_code, decision, reason,
              matched_role, matched_scope_type, authority_level, correlation_id,
              record_context, created_at
       FROM "${schema}".authz_decision_log
       WHERE id = $1 LIMIT 1`,
      [input.decisionId],
    );
    if (row.rows.length > 0) {
      const r: any = row.rows[0];
      const ctx = (r.record_context ?? {}) as Record<string, unknown>;
      primary = {
        logId: r.id,
        userId: r.user_id,
        permissionCode: r.permission_code,
        moduleCode: r.module_code,
        decision: r.decision,
        reason: r.reason,
        matchedRole: r.matched_role,
        scopeType: r.matched_scope_type,
        authorityLevel: r.authority_level,
        correlationId: r.correlation_id,
        context: ctx,
        createdAt: r.created_at,
        reasonCode: typeof ctx.reasonCode === 'string' ? ctx.reasonCode : undefined,
        policyVersion: typeof ctx.policyVersion === 'string' ? ctx.policyVersion : undefined,
        modelVersion: typeof ctx.modelVersion === 'string' ? ctx.modelVersion : undefined,
        engineResults: (ctx.engineResults as Record<string, unknown>) ?? undefined,
        obligations: (ctx.obligations as Record<string, unknown>) ?? undefined,
      };
      if (primary.correlationId) {
        const { entries } = await queryDecisionLog(tenantId, {
          correlationId: primary.correlationId,
          limit: 100,
        });
        chain = entries;
      } else {
        chain = [primary];
      }
    }
  }

  if (!primary) {
    return { found: false, tenantId, chain: [], trace: ['No decision found'] };
  }

  const trace: string[] = [];
  trace.push(
    `[${primary.decision.toUpperCase()}] ${primary.permissionCode} — user=${primary.userId} @ ${primary.createdAt}`,
  );
  if (primary.reasonCode) trace.push(`reason_code: ${primary.reasonCode}`);
  trace.push(`reason: ${primary.reason}`);
  if (primary.policyVersion) trace.push(`policy: ${primary.policyVersion}`);
  if (primary.modelVersion) trace.push(`model:  ${primary.modelVersion}`);

  const ctx = primary.context ?? {};
  const failedStep = (ctx as any).failedStep;
  const failedCheck = (ctx as any).failedCheck;
  if (typeof failedStep === 'number') {
    trace.push(`failed_step: ${failedStep}  failed_check: ${failedCheck}`);
  }

  if (primary.engineResults) {
    for (const [engine, result] of Object.entries(primary.engineResults)) {
      trace.push(`engine[${engine}]: ${JSON.stringify(result)}`);
    }
  }
  if (primary.obligations && Object.keys(primary.obligations).length > 0) {
    trace.push(`obligations: ${JSON.stringify(primary.obligations)}`);
  }

  if (chain.length > 1) {
    trace.push(`chain: ${chain.length} decisions share correlationId=${primary.correlationId}`);
  }

  return { found: true, tenantId, primary, chain, trace };
}

export async function getDauthHealthSummary(tenantId: string): Promise<{
  healthy: boolean;
  score: number;
  issues: string[];
}> {
  const diag = await runDauthDiagnostics(tenantId);
  const issues: string[] = [];

  if (diag.expiredDelegations > 0) issues.push(`${diag.expiredDelegations} expired delegation(s) still active`);
  if (diag.orphanedSessions > 0) issues.push(`${diag.orphanedSessions} orphaned session(s) idle >48h`);
  if (diag.sodViolationsAccumulated > 0) issues.push(`${diag.sodViolationsAccumulated} unresolved SoD violation(s)`);
  if (diag.lockedAccounts > 0) issues.push(`${diag.lockedAccounts} locked account(s)`);
  if (diag.pendingAccessReviews > 0) issues.push(`${diag.pendingAccessReviews} pending access review(s)`);
  if (diag.staleInvitations > 0) issues.push(`${diag.staleInvitations} stale invitation(s) >72h`);
  if (diag.usersWithoutRoles > 0) issues.push(`${diag.usersWithoutRoles} active user(s) without role assignments`);
  if (diag.expiredRoleAssignments > 0) issues.push(`${diag.expiredRoleAssignments} expired role assignment(s) still active`);

  const maxScore = 100;
  const penalty = issues.length * 10;
  const score = Math.max(0, maxScore - penalty);

  return { healthy: issues.length === 0, score, issues };
}
