import { type DecisionLogEntry } from '../audit/decision-log.service';
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
export declare function runDauthDiagnostics(tenantId: string): Promise<DauthDiagnosticsResult>;
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
export declare function explainDecision(input: ExplainDecisionInput): Promise<ExplainDecisionResult>;
export declare function getDauthHealthSummary(tenantId: string): Promise<{
    healthy: boolean;
    score: number;
    issues: string[];
}>;
