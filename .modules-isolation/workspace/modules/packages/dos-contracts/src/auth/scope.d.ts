export type ScopeType = 'tenant' | 'organization' | 'business_unit' | 'department' | 'section' | 'team' | 'position' | 'entity';
export interface ScopeBinding {
    scopeType: ScopeType;
    scopeId: string;
    roleCode: string;
    inherited: boolean;
}
export interface ScopeResolutionRequest {
    userId: string;
    tenantId: string;
    targetScopeType?: ScopeType;
    targetScopeId?: string;
    includeInherited?: boolean;
}
export interface ScopeResolutionResult {
    userId: string;
    tenantId: string;
    bindings: ScopeBinding[];
    hierarchy: ScopeHierarchyNode[];
    resolvedAt: string;
}
export interface ScopeHierarchyNode {
    scopeType: ScopeType;
    scopeId: string;
    name: string;
    parentScopeType: ScopeType | null;
    parentScopeId: string | null;
    depth: number;
}
export interface ScopeCheckRequest {
    userId: string;
    tenantId: string;
    requiredScopeType: ScopeType;
    requiredScopeId: string;
}
export interface ScopeCheckResult {
    allowed: boolean;
    matchedBinding?: ScopeBinding;
    reason?: string;
}
export interface OwnershipScopeRequest {
    tenantId: string;
    entityType: string;
    entityId: string;
}
export interface OwnershipScopeResult {
    isOwner: boolean;
    isPrimaryOwner: boolean;
    ownershipType?: string;
    ownerId?: string;
}
