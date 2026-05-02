export type IdentityPosture = 'password' | 'mfa' | 'sso' | 'delegated' | 'api_key';
export type ActorType = 'human' | 'service' | 'agent' | 'system';
export interface ActorInfo {
    userId: string;
    email: string;
    displayName: string;
    actorType: ActorType;
    identityPosture: IdentityPosture;
    mfaVerified: boolean;
}
export interface TenantMembership {
    tenantId: string;
    tenantStatus: string;
    plan: string;
    membershipStatus: string;
    membershipType: string;
    joinedAt: string;
}
export interface AccessScopeBinding {
    scopeType: string;
    scopeId: string;
    roleCode: string;
}
export interface LandingHint {
    landingPage: string;
    fallbackPage: string;
}
export interface AuditTraceMeta {
    snapshotGeneratedAt: string;
    correlationId: string;
    cacheHit: boolean;
    evaluationDurationMs: number;
}
export interface FullAccessSnapshot {
    actor: ActorInfo;
    tenant: TenantMembership;
    accessProfiles: string[];
    functionalRoles: string[];
    effectivePermissions: string[];
    scopeBindings: AccessScopeBinding[];
    decisionAuthorities: string[];
    allowedModules: string[];
    allowedProducts: string[];
    allowedDashboards: string[];
    landingHint: LandingHint;
    audit: AuditTraceMeta;
}
export type AccessSnapshot = FullAccessSnapshot;
