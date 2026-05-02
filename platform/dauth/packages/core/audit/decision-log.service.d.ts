/** Filter options for querying the decision log. */
export interface DecisionLogFilter {
    userId?: string;
    permissionCode?: string;
    decision?: 'allow' | 'deny';
    moduleCode?: string;
    correlationId?: string;
    /** Filter by one or more canonical reason codes. Matches any. */
    reasonCodes?: string[];
    /** Filter by policy-pack version (e.g. `evidence.approve@1.4.0`). */
    policyVersion?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
}
/** A single entry from the authz_decision_log table. */
export interface DecisionLogEntry {
    logId: string;
    userId: string;
    permissionCode: string;
    moduleCode: string | null;
    decision: 'allow' | 'deny';
    reason: string;
    matchedRole: string | null;
    scopeType: string | null;
    authorityLevel: string | null;
    correlationId: string | null;
    context: Record<string, unknown>;
    createdAt: string;
    /** Derived from context.reasonCode — stable surface for downstream code. */
    reasonCode?: string;
    /** Derived from context.policyVersion. */
    policyVersion?: string;
    /** Derived from context.modelVersion. */
    modelVersion?: string;
    /** Derived from context.engineResults — per-engine verdicts. */
    engineResults?: Record<string, unknown>;
    /** Derived from context.obligations. */
    obligations?: Record<string, unknown>;
}
/** Aggregated summary of decisions over a time range. */
export interface DecisionSummary {
    totalDecisions: number;
    allowCount: number;
    denyCount: number;
    topDeniedPermissions: {
        permissionCode: string;
        count: number;
    }[];
}
export declare function logAuthDecision(tenantId: string, data: {
    userId: string;
    permissionCode: string;
    moduleCode?: string;
    decision: 'allow' | 'deny';
    reason: string;
    matchedRole?: string;
    scopeType?: string;
    authorityLevel?: string;
    correlationId?: string;
    context?: Record<string, unknown>;
    /** Canonical reason code from `contracts/reason-codes.ts`. */
    reasonCode?: string;
    /** Policy pack + semver, e.g. `evidence.approve@1.4.0`. */
    policyVersion?: string;
    /** ReBAC model version (OpenFGA auth model id). */
    modelVersion?: string;
    /** Per-engine verdicts captured during shadow/enforce mode. */
    engineResults?: Record<string, unknown>;
    /** Obligations the caller must honor on allow. */
    obligations?: Record<string, unknown>;
}): Promise<void>;
/**
 * Query the decision log with flexible filters and pagination.
 * Supports filtering by userId, permissionCode, decision, moduleCode,
 * correlationId, and date range.
 */
export declare function queryDecisionLog(tenantId: string, filters: DecisionLogFilter): Promise<{
    entries: DecisionLogEntry[];
    total: number;
}>;
/**
 * Get all decisions sharing a correlation ID (same request/operation chain).
 */
export declare function getDecisionsByCorrelation(tenantId: string, correlationId: string): Promise<DecisionLogEntry[]>;
/**
 * Aggregate decision statistics over a date range:
 * total count, allow/deny split, and top denied permissions.
 */
export declare function getDecisionSummary(tenantId: string, dateFrom: string, dateTo: string): Promise<DecisionSummary>;
/**
 * Get the most recent denied decisions for monitoring and alerting.
 * Defaults to last 20 denials if limit is not specified.
 */
export declare function getRecentDenials(tenantId: string, limit?: number): Promise<DecisionLogEntry[]>;
