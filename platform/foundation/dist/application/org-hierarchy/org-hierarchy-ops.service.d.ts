import type { OrgNodeType } from './org-hierarchy.service';
export declare function bulkCreateNodes(tenantId: string, userId: string, nodes: Array<{
    type: OrgNodeType;
    name: string;
    nameAr?: string;
    parentId?: string;
    [k: string]: unknown;
}>): Promise<{
    created: number;
    ids: string[];
    errors: string[];
}>;
export declare function bulkUpdateStatus(tenantId: string, userId: string, nodeIds: string[], nodeType: OrgNodeType, status: string): Promise<{
    updated: number;
}>;
export declare function bulkDeleteNodes(tenantId: string, userId: string, nodeIds: string[], nodeType: OrgNodeType): Promise<{
    deleted: number;
}>;
export declare function bulkMoveNodes(tenantId: string, userId: string, moves: Array<{
    nodeId: string;
    nodeType: OrgNodeType;
    newParentId: string;
}>): Promise<{
    moved: number;
    errors: string[];
}>;
export interface OrgStructureSearchFilters {
    nodeType?: string;
    status?: string;
    searchTerm?: string;
    parentId?: string;
    headUserId?: string;
    locationId?: string;
    costCenterId?: string;
    createdAfter?: string;
    createdBefore?: string;
    limit?: number;
    offset?: number;
}
export declare function searchOrgStructure(tenantId: string, filters: OrgStructureSearchFilters): Promise<{
    data: unknown[];
    total: number;
    limit: number;
    offset: number;
}>;
export interface OrgStructureExportOptions {
    format: 'json' | 'csv' | 'excel';
    includeInactive?: boolean;
    includeMetadata?: boolean;
    includeMembers?: boolean;
    includeLocations?: boolean;
    includeCostCenters?: boolean;
    nodeTypes?: string[];
}
export declare function exportOrgStructure(tenantId: string, options: OrgStructureExportOptions): Promise<{
    data: unknown;
    mimeType: string;
    filename: string;
}>;
export declare function importOrgStructure(tenantId: string, userId: string, importData: Record<string, unknown>, format: string, _options: Record<string, unknown>): Promise<{
    imported: number;
    errors: string[];
}>;
export interface LocationAssignment {
    locationId: string;
    nodeId: string;
    nodeType: string;
    [k: string]: unknown;
}
export interface CostCenterAssignment {
    costCenterId: string;
    nodeId: string;
    nodeType: string;
    [k: string]: unknown;
}
export interface MemberAssignment {
    userId: string;
    nodeId: string;
    nodeType: string;
    [k: string]: unknown;
}
export declare function assignLocation(tenantId: string, userId: string, assignment: LocationAssignment): Promise<{
    assigned: boolean;
}>;
export declare function assignCostCenter(tenantId: string, userId: string, assignment: CostCenterAssignment): Promise<{
    assigned: boolean;
}>;
export declare function assignMember(tenantId: string, userId: string, assignment: MemberAssignment): Promise<{
    assigned: boolean;
}>;
export declare function bulkAssignMembers(tenantId: string, userId: string, assignments: MemberAssignment[]): Promise<{
    assigned: number;
    errors: string[];
}>;
