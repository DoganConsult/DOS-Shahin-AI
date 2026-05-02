import { type AccessDecision } from './decision-engine';
export interface CanInput {
    tenantId: string;
    userId: string;
    /** Action code, e.g. `evidence.approve`, `onboarding.invite`. */
    action: string;
    /** Resource under test. `type` is required; id/attrs forwarded to PDPs. */
    resource?: {
        type: string;
        id?: string;
        tenantId?: string;
        createdBy?: string;
        status?: string;
        attributes?: Record<string, unknown>;
    };
    /** Contextual attributes — emailVerified, workflowState, ip, userAgent, etc. */
    context?: Record<string, unknown>;
    /** Runtime hints — usually supplied by the middleware layer. */
    role?: string;
    roles?: string[];
    isSuperAdmin?: boolean;
    /** Scope hints — forwarded to Step 9. */
    scopeType?: string;
    scopeId?: string;
    /** Authority level required — forwarded to Step 10. */
    authorityRequired?: string;
    /** Lifecycle transition hints — forwarded to Step 12. */
    lifecycleFromState?: string;
    lifecycleToState?: string;
    /** When true, enforce entity ownership in Step 13. */
    ownershipRequired?: boolean;
    /** When true, run the pipeline without writing to the ledger. */
    dryRun?: boolean;
    /** Correlation id that ties this check to a request chain. */
    correlationId?: string;
}
export interface CanDecision {
    allowed: boolean;
    /** Unique id for this decision — used by `explainDecision`. */
    decisionId: string;
    /** Canonical reason codes — always at least one entry. */
    reasonCodes: string[];
    /** Free-form human-readable reason. */
    reason: string;
    /** Obligations the caller must honor (e.g. `{ requireDualApproval: true }`). */
    obligations: Record<string, unknown>;
    /** Policy/model versions stamped on the decision for replay. */
    policyVersion?: string;
    modelVersion?: string;
    /** Raw engine-level verdicts (shadow/enforce adapters) — diagnostic only. */
    engineResults?: Record<string, unknown>;
    /** Full 14-step trace when a verbose output is requested. */
    steps?: AccessDecision['steps'];
}
export interface CanOptions {
    /** Include the full 14-step trace in the result. Defaults to false. */
    verbose?: boolean;
}
/**
 * Evaluate whether a principal can perform an action on a resource.
 *
 * This is the single entrypoint callers should use — everything else in
 * `access/*` is either (a) a primitive the engine builds on or (b) a legacy
 * API kept for backward compatibility while existing call sites migrate.
 */
export declare function can(input: CanInput, opts?: CanOptions): Promise<CanDecision>;
