import type { FoundationEntityType, FoundationStatus } from '../domain/types/foundation.types';
export interface FoundationNodeContract {
    id: string;
    tenantId: string;
    entityType: FoundationEntityType;
    parentId: string | null;
    nameEn: string;
    nameAr: string | null;
    code: string;
    status: FoundationStatus;
    level: number;
    path: string;
    ownerId: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface FoundationHierarchyContract {
    tenantId: string;
    roots: FoundationNodeContract[];
    totalNodes: number;
    maxDepth: number;
}
export interface FoundationDiagnosticsContract {
    tenantId: string;
    generatedAt: string;
    hierarchyHealth: {
        totalNodes: number;
        orphanedNodes: number;
        duplicateCodes: number;
        maxDepth: number;
    };
    ownershipHealth: {
        nodesWithoutOwner: number;
        suspendedNodes: number;
    };
    warnings: string[];
    errors: string[];
}
