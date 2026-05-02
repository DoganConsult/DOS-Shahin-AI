/**
 * DAuth Contract — Access Snapshot (GET /api/auth/access)
 *
 * Canonical shape returned by the access snapshot endpoint.
 * Extends the base AccessSnapshot with full posture, actor, and audit metadata.
 *
 * Field names follow table-classification.ts Bucket 1 (runtime truth) columns.
 * Permission codes follow module.resource.action naming convention.
 */
/** Identity posture — how the actor authenticated. */
export type IdentityPosture = 'password' | 'mfa' | 'sso' | 'delegated' | 'api_key';
/** Actor type — classification of the principal. */
export type ActorType = 'human' | 'service' | 'agent' | 'system';
/** Actor identity block returned inside every access snapshot. */
export interface ActorInfo {
    userId: string;
    email: string;
    displayName: string;
    actorType: ActorType;
    identityPosture: IdentityPosture;
    mfaVerified: boolean;
}
/** Tenant membership context. */
export interface TenantMembership {
    tenantId: string;
    tenantStatus: string;
    plan: string;
    membershipStatus: string;
    membershipType: string;
    joinedAt: string;
}
import type { ScopeBinding } from './scope-resolution.contract';
export type { ScopeBinding };
/** Landing hint — suggested landing page per role/profile. */
export interface LandingHint {
    landingPage: string;
    fallbackPage: string;
}
/** Audit trace metadata attached to every snapshot for traceability. */
export interface AuditTraceMeta {
    snapshotGeneratedAt: string;
    correlationId: string;
    cacheHit: boolean;
    evaluationDurationMs: number;
}
/** A position the user holds (Foundation owns the structure). */
export interface CurrentPosition {
    positionId: string;
    titleEn: string;
    titleAr: string | null;
    code: string | null;
    level: number | null;
    buId: string | null;
}
/** A denied action — populated when the FE asks for the cached negative set. */
export interface DeniedActionEntry {
    actionCode: string;
    reasonCode: string;
    correlationId?: string;
}
/** A pending approval the user is involved in (as maker or checker). */
export interface PendingApprovalEntry {
    entityType: string;
    entityId: string;
    requiredAuthority: string;
    requestedAt: string;
}
/** SLA breach attached to an entity in the user's scope. */
export interface SlaBreachEntry {
    entityType: string;
    entityId: string;
    breachAt: string;
    escalationLevel: number;
}
/** Escalation routed to the user. */
export interface EscalationEntry {
    entityType: string;
    entityId: string;
    escalatedTo: string;
    reason: string;
}
/** Policy inherited from an ancestor scope (org / BU / department). */
export interface InheritedPolicyEntry {
    policyCode: string;
    source: string;
    level: number;
}
/**
 * Full access snapshot — the canonical response from GET /api/auth/access
 * (legacy) and from GET /api/foundation/access-snapshot (5-brain entry).
 *
 * Includes identity posture, actor info, tenant membership, access profiles,
 * functional roles, effective permissions, scope bindings, decision authorities,
 * allowed modules/products, allowed dashboards, landing hints, audit trace,
 * and (Phase B-2) Foundation-composed structure fields.
 */
export interface FullAccessSnapshot {
    actor: ActorInfo;
    tenant: TenantMembership;
    accessProfiles: string[];
    functionalRoles: string[];
    effectivePermissions: string[];
    scopeBindings: ScopeBinding[];
    decisionAuthorities: string[];
    allowedModules: string[];
    allowedProducts: string[];
    allowedDashboards: string[];
    landingHint: LandingHint;
    audit: AuditTraceMeta;
    /** Primary position metadata from Foundation. */
    currentPosition?: CurrentPosition | null;
    /** Best-effort role-profile code derived from the primary position. */
    currentRoleProfile?: string | null;
    /** Denials in the recent window — debug aid for FE. Capped at 50. */
    deniedActions?: DeniedActionEntry[];
    /** Approvals pending for the user (as maker awaiting checker, or vice versa). */
    pendingApprovals?: PendingApprovalEntry[];
    /** SLA breaches for entities in the user's scope. */
    slaBreaches?: SlaBreachEntry[];
    /** Escalations currently routed to the user. */
    escalations?: EscalationEntry[];
    /** Policies inherited from ancestor scopes (Foundation inheritance walk). */
    inheritedPolicies?: InheritedPolicyEntry[];
}
