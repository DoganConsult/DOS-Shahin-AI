import type { ActorIdentity, ActorType, AccessProfile, FunctionalRole, DecisionAuthority, DecisionOutcome, AuthorityType } from '@dos/types/actor';
export declare function createActor(tenantId: string, input: {
    actorType: ActorType;
    displayName: string;
    displayNameAr?: string;
    email?: string;
    externalRef?: string;
    metadata?: Record<string, unknown>;
}): Promise<ActorIdentity>;
export declare function getActor(tenantId: string, actorId: string): Promise<ActorIdentity | null>;
export declare function getActorByEmail(tenantId: string, email: string): Promise<ActorIdentity | null>;
export declare function listActors(tenantId: string, filters?: {
    actorType?: ActorType;
    isActive?: boolean;
}): Promise<ActorIdentity[]>;
export declare function deactivateActor(tenantId: string, actorId: string): Promise<void>;
export declare function ensureHumanActor(tenantId: string, userId: string, email: string, displayName: string): Promise<ActorIdentity>;
export declare function ensureAgentActor(tenantId: string, agentCode: string, displayName: string): Promise<ActorIdentity>;
export declare function getAccessProfile(tenantId: string, profileCode: string): Promise<AccessProfile | null>;
export declare function listAccessProfiles(tenantId: string): Promise<AccessProfile[]>;
export declare function getFunctionalRole(tenantId: string, roleCode: string): Promise<FunctionalRole | null>;
export declare function listFunctionalRoles(tenantId: string, category?: string): Promise<FunctionalRole[]>;
export declare function getActorEffectivePermissions(tenantId: string, actorId: string): Promise<string[]>;
export declare function checkDecisionAuthority(tenantId: string, actorId: string, authorityType: AuthorityType, resourceType: string): Promise<{
    authorized: boolean;
    authority?: DecisionAuthority;
    reason: string;
}>;
export declare function recordActorAudit(tenantId: string, input: {
    actorId: string;
    actorType: ActorType;
    action: string;
    resourceType?: string;
    resourceId?: string;
    decision: DecisionOutcome;
    authorityCode?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}): Promise<void>;
