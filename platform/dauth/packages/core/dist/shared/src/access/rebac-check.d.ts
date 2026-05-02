/**
 * Port-aware ReBAC check + ledger write.
 *
 * Callers (auth-service / gateway / any future guard) invoke
 * `checkRebacAndLog()` with a user/relation/object triple plus any DAuth
 * context. The function:
 *   1. Resolves the current ReBAC adapter via the factory (native by
 *      default, OpenFGA when `DAUTH_OPENFGA_ENFORCE=true`).
 *   2. Invokes check() on the primary.
 *   3. Optionally invokes check() on the shadow and logs divergence.
 *   4. Writes a row to `platform_dauth.authz_decision_log` with
 *      `engine_results.openfga = { allowed, modelVersion, latencyMs, trace }`
 *      so explainDecision / replay can see what OpenFGA said.
 *   5. Returns the final verdict the caller should act on.
 *
 * Ledger write uses `writeAuthDecision()` from `./audit/decision-ledger`.
 */
import type { SqlClient } from '../audit/decision-ledger';
import type { RebacCheckResult } from '../dauth-ports/rebac.port';
export interface CheckRebacAndLogInput {
    tenantId: string;
    userId: string;
    /** OpenFGA object, e.g. "tenant:abc123", "evidence:e1". */
    object: string;
    /** OpenFGA relation, e.g. "member", "owner", "can_approve". */
    relation: string;
    /** Optional action label emitted to the ledger (defaults to relation). */
    action?: string;
    /** Additional metadata folded into the ledger row. */
    correlationId?: string;
    requestPath?: string;
    requestMethod?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    /**
     * Optional SoD pairing. When the relation is one of the SoD-bound
     * relations (can_approve, can_sign_off, can_publish, can_close), the
     * caller may supply this guard so we run a tenant-side SoD evaluator
     * after OpenFGA returns allow. A blocking SoD verdict overrides allow
     * and adds an `engineResults.sod` bucket so divergence-report sees it.
     */
    sodGuard?: SodGuardEvaluator;
}
/**
 * SoD evaluator called by checkRebacAndLog when the relation is SoD-bound
 * AND OpenFGA returned allow. Implementations live in services that have
 * DB access; pass a closure to keep this module DB-free.
 */
export type SodGuardEvaluator = (input: {
    tenantId: string;
    userId: string;
    object: string;
    relation: string;
}) => Promise<SodGuardResult>;
export interface SodGuardResult {
    allowed: boolean;
    outcome: 'allow' | 'warn' | 'escalate' | 'block' | 'allow-with-audit';
    reason?: string;
    ruleCode?: string;
    waiverId?: string;
}
export interface CheckRebacAndLogResult {
    allowed: boolean;
    decisionId: string;
    primary: RebacCheckResult;
    shadow?: RebacCheckResult;
    /** true when shadow verdict diverges from primary. */
    divergence?: boolean;
    /** SoD pairing verdict when sodGuard was supplied. */
    sod?: SodGuardResult;
}
export declare function checkRebacAndLog(sql: SqlClient, input: CheckRebacAndLogInput): Promise<CheckRebacAndLogResult>;
