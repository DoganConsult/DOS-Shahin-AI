import type { AccessDecision, AccessDecisionContext, ApprovalChainResult, AuthorityCheckRequest, AuthorityCheckResult, DelegationGrant, DelegationGrantRequest, DelegationRevocation, DelegationValidation, FullAccessSnapshot, LifecycleAuthDecision, LifecycleTransitionRequest, OwnershipScopeRequest, OwnershipScopeResult, PrincipalContext, ScopeCheckRequest, ScopeCheckResult, ScopeResolutionRequest, ScopeResolutionResult, SessionCreateRequest, SessionInfo, SessionTokenPair, SignOffRequirement, SignOffResult, SodAssignmentCheckRequest, SodAssignmentCheckResult, SodCheckRequest, SodCheckResult } from '@dos/contracts/auth';
import type { PrincipalIdentity, SecurityPolicyConfig } from '@dos/types/auth';
export interface IdentityPort {
    resolvePrincipal(userId: string): Promise<PrincipalIdentity | null>;
    resolvePrincipalByEmail?(email: string): Promise<PrincipalIdentity | null>;
    validateTenantMembership?(userId: string, tenantId: string): Promise<boolean>;
    isPrincipalActive?(userId: string): Promise<boolean>;
}
export interface SessionPort {
    createSession(input: SessionCreateRequest): Promise<SessionTokenPair>;
    refreshSession(refreshToken: string): Promise<SessionTokenPair>;
    destroySession(refreshToken: string): Promise<void>;
    isSessionValid?(sessionId: string): Promise<boolean>;
    getSessionInfo?(sessionId: string): Promise<SessionInfo | null>;
}
export interface AccessPort {
    evaluateAccess(input: AccessDecisionContext): Promise<AccessDecision>;
    getAccessSnapshot?(userId: string, tenantId: string): Promise<FullAccessSnapshot>;
    canPerform?(userId: string, tenantId: string, permission: string): Promise<boolean>;
}
export interface ScopePort {
    resolveScope(input: ScopeResolutionRequest): Promise<ScopeResolutionResult>;
    checkScope?(input: ScopeCheckRequest): Promise<ScopeCheckResult>;
    resolveOwnership?(input: OwnershipScopeRequest): Promise<OwnershipScopeResult>;
}
export interface AuthorityPort {
    checkAuthority(input: AuthorityCheckRequest): Promise<AuthorityCheckResult>;
    getApprovalChain?(entityType: string, entityId: string): Promise<ApprovalChainResult>;
    signOff?(requirement: SignOffRequirement): Promise<SignOffResult>;
}
export interface DelegationPort {
    createDelegationGrant(input: DelegationGrantRequest): Promise<DelegationGrant>;
    revokeDelegationGrant(input: DelegationRevocation): Promise<void>;
    validateDelegation(grantId: string, tenantId: string): Promise<DelegationValidation>;
}
export interface SodPort {
    evaluateSod(input: SodCheckRequest): Promise<SodCheckResult>;
    evaluateAssignment?(input: SodAssignmentCheckRequest): Promise<SodAssignmentCheckResult>;
}
export interface LifecycleAuthPort {
    evaluateLifecycleTransition(input: LifecycleTransitionRequest): Promise<LifecycleAuthDecision>;
}
export interface AuditPort {
    logDecision(entry: Record<string, unknown>): Promise<void>;
}
export interface SecurityPolicyPort {
    getSecurityPolicy(tenantId: string): Promise<SecurityPolicyConfig | null>;
}
export interface DauthRuntimePorts {
    identity: IdentityPort;
    session: SessionPort;
    access: AccessPort;
    scope: ScopePort;
    authority?: AuthorityPort;
    delegation?: DelegationPort;
    sod?: SodPort;
    lifecycleAuth?: LifecycleAuthPort;
    audit?: AuditPort;
    securityPolicy?: SecurityPolicyPort;
    principalContext?(userId: string, tenantId: string): Promise<PrincipalContext | null>;
}
