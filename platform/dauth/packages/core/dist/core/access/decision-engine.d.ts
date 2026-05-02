export interface AccessDecisionContext {
    userId: string;
    tenantId: string;
    role: string;
    roles?: string[];
    isSuperAdmin?: boolean;
    permissionCode: string;
    moduleCode?: string;
    scopeType?: string;
    scopeId?: string;
    authorityRequired?: string;
    lifecycleFromState?: string;
    lifecycleToState?: string;
    entityType?: string;
    entityId?: string;
    ip?: string;
    path?: string;
    actorId?: string;
    ownershipRequired?: boolean;
    /**
     * Free-form attributes forwarded to external PDPs (Cerbos / OPA) and
     * stamped onto the decision ledger. Used for ABAC context: emailVerified,
     * workflowState, dataClass, region, onboardingStatus, etc.
     * Optional — existing callers are unaffected.
     */
    attributes?: Record<string, unknown>;
    /** Correlation id that ties this decision to a request chain. */
    correlationId?: string;
    /** When true, run pipeline without writing to the decision ledger. */
    dryRun?: boolean;
}
/**
 * Top-level decision verdict required by the 5-brain architecture spec.
 * - `allow`            — service may execute the action.
 * - `deny`             — service must reject; reasonCode explains why.
 * - `pending_approval` — action queued for maker/checker; not executed yet.
 * - `escalated`        — SLA breach or risk threshold; routed to escalation owner.
 */
export type AccessVerdict = 'allow' | 'deny' | 'pending_approval' | 'escalated';
/** Per-engine sub-verdicts, surfaced as named fields for downstream code. */
export interface SodResult {
    passed: boolean;
    conflicts?: Array<{
        roleA: string;
        roleB: string;
        level: string;
    }>;
    waiverApplied?: boolean;
}
export interface OpenFgaResult {
    consulted: boolean;
    allowed?: boolean;
    modelVersion?: string;
    source?: string;
}
export interface KeycloakIdentityResult {
    consulted: boolean;
    userId?: string;
    realm?: string;
    emailVerified?: boolean;
    mfaSatisfied?: boolean;
}
export interface LifecycleResult {
    consulted: boolean;
    allowed: boolean;
    fromState?: string;
    toState?: string;
    reason?: string;
}
export interface SlaResult {
    consulted: boolean;
    breached: boolean;
    policyCode?: string;
    dueAt?: string;
    escalatedTo?: string;
    reason?: string;
}
export interface AccessDecision {
    /** Backward-compatible boolean (true iff verdict === 'allow'). */
    allowed: boolean;
    /** 4-valued verdict per 5-brain spec. */
    decision: AccessVerdict;
    failedStep: number | null;
    failedCheck: string | null;
    reason: string;
    matchedRole?: string;
    matchedRoles?: string[];
    matchedScopeType?: string;
    matchedScopes?: string[];
    delegatedFrom?: string;
    steps: StepResult[];
    /** Canonical reason code from `contracts/reason-codes.ts`. Always set. */
    reasonCode?: string;
    /** Per-engine verdicts when shadow/enforce adapters ran. Diagnostic only. */
    engineResults?: Record<string, unknown>;
    /** Obligations the caller must honor (e.g. requireDualApproval). */
    obligations?: Record<string, unknown>;
    /** Policy-pack version evaluated — stamped onto the ledger for replay. */
    policyVersion?: string;
    /** Relationship-graph model version — OpenFGA auth model id. */
    modelVersion?: string;
    /** Correlation id propagated from the request chain. */
    correlationId?: string;
    sodResult?: SodResult;
    openFgaResult?: OpenFgaResult;
    keycloakIdentity?: KeycloakIdentityResult;
    lifecycleResult?: LifecycleResult;
    slaResult?: SlaResult;
}
interface StepResult {
    step: number;
    name: string;
    passed: boolean;
    detail?: string;
}
export declare function invalidatePermissionCache(tenantId?: string): void;
export declare function evaluateAccess(ctx: AccessDecisionContext): Promise<AccessDecision>;
export {};
