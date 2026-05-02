/**
 * Public Foundation DTOs — pure TypeScript, zero runtime.
 *
 * These are the canonical request/response shapes for cross-module consumers.
 */
import type { FoundationEntityType, FoundationStatus } from './foundation.types';
export interface FoundationNodeCreateDTO {
    entityType: FoundationEntityType;
    parentId?: string | null;
    nameEn: string;
    nameAr?: string | null;
    code: string;
    ownerId?: string | null;
    metadata?: Record<string, unknown>;
}
export interface FoundationNodeUpdateDTO {
    nameEn?: string;
    nameAr?: string | null;
    code?: string;
    parentId?: string | null;
    ownerId?: string | null;
    status?: FoundationStatus;
    metadata?: Record<string, unknown>;
}
export interface FoundationNodeResponseDTO {
    id: string;
    entityType: FoundationEntityType;
    parentId: string | null;
    nameEn: string;
    nameAr: string | null;
    code: string;
    status: FoundationStatus;
    level: number;
    path: string;
    ownerId: string | null;
    children?: FoundationNodeResponseDTO[];
    createdAt: string;
    updatedAt: string;
}
export interface FoundationTreeResponseDTO {
    roots: FoundationNodeResponseDTO[];
    totalNodes: number;
}
export interface FoundationListQueryDTO {
    entityType?: FoundationEntityType;
    status?: FoundationStatus;
    parentId?: string | null;
    ownerId?: string | null;
    search?: string;
    limit?: number;
    offset?: number;
}
export interface FoundationListResponseDTO<T = FoundationNodeResponseDTO> {
    rows: T[];
    total: number;
    limit: number;
    offset: number;
}
export interface FoundationDiagnosticsDTO {
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
