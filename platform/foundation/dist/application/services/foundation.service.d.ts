/**
 * DOS Foundation Service — Canonical CRUD for org hierarchy entities.
 *
 * This service provides the single entry point for positions CRUD (with reports-to)
 * and re-exports the existing org hierarchy services for organizations, business_units,
 * departments, and teams.
 *
 * Existing coverage (no duplication needed):
 *   - organizations CRUD + hierarchy  → org-hierarchy.service.ts  (upsertOrgHierarchyNode, getOrgHierarchyTree)
 *   - business_units CRUD             → org-hierarchy.service.ts  (upsertOrgHierarchyNode type='division')
 *   - departments CRUD                → org-hierarchy.service.ts  (upsertOrgHierarchyNode type='department')
 *   - teams CRUD + members            → org-hierarchy.service.ts  (upsertOrgHierarchyNode type='team')
 *                                       org-hierarchy-ops.service.ts (assignMember, bulkAssignMembers, searchOrgStructure)
 *   - bulk ops                        → org-hierarchy-ops.service.ts (bulkCreate, bulkDelete, bulkMove, bulkUpdateStatus)
 *   - admin features                  → org-hierarchy-admin.service.ts (activation, templates, visualization, analytics)
 *   - team recommendations            → team-builder.service.ts
 *   - responsibility suggestions      → responsibility-suggest.service.ts
 *   - org pack seeding (provisioning) → ../provisioning/org-pack-seeding.service.ts
 *
 * This file adds: positions CRUD with reports-to hierarchy.
 */
export { getOrgHierarchyTree, upsertOrgHierarchyNode, validateOrgStructure, getOrgHierarchyAccessRules, getUserAccessibleDepartments, getUserAccessibleTeams, } from '../org-hierarchy/org-hierarchy.service';
export type { OrgNodeType, OrgHierarchyNode } from '../org-hierarchy/org-hierarchy.service';
export { bulkCreateNodes, bulkUpdateStatus, bulkDeleteNodes, bulkMoveNodes, searchOrgStructure, assignMember, bulkAssignMembers, } from '../org-hierarchy/org-hierarchy-ops.service';
export interface PositionRow {
    position_id: string;
    dept_id: string | null;
    title_en: string;
    title_ar: string | null;
    grade: string | null;
    reports_to_position_id: string | null;
    status: string;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    created_by: string | null;
    updated_by: string | null;
}
export interface CreatePositionInput {
    titleEn: string;
    titleAr?: string;
    deptId?: string;
    grade?: string;
    reportsToPositionId?: string;
    status?: string;
    metadata?: Record<string, unknown>;
}
export interface UpdatePositionInput {
    titleEn?: string;
    titleAr?: string;
    deptId?: string;
    grade?: string;
    reportsToPositionId?: string | null;
    status?: string;
    metadata?: Record<string, unknown>;
}
export interface PositionListOptions {
    deptId?: string;
    status?: string;
    searchTerm?: string;
    reportsToPositionId?: string;
    limit?: number;
    offset?: number;
}
/**
 * Create a new position in the tenant schema.
 */
export declare function createPosition(tenantId: string, userId: string, input: CreatePositionInput): Promise<PositionRow>;
/**
 * Retrieve a single position by ID.
 */
export declare function getPosition(tenantId: string, positionId: string): Promise<PositionRow | null>;
/**
 * List positions with optional filters and pagination.
 */
export declare function listPositions(tenantId: string, options?: PositionListOptions): Promise<{
    data: PositionRow[];
    total: number;
}>;
/**
 * Update an existing position. Supports partial updates.
 */
export declare function updatePosition(tenantId: string, userId: string, positionId: string, input: UpdatePositionInput): Promise<PositionRow | null>;
/**
 * Soft-delete a position.
 */
export declare function deletePosition(tenantId: string, userId: string, positionId: string): Promise<{
    deleted: boolean;
}>;
/**
 * Get the reporting chain (ancestors) for a position, walking up reports_to_position_id.
 * Returns an ordered array from the immediate supervisor to the top of the chain.
 * Stops at maxDepth (default 20) to prevent infinite loops from circular references.
 */
export declare function getPositionReportingChain(tenantId: string, positionId: string, maxDepth?: number): Promise<PositionRow[]>;
/**
 * Get direct reports for a position — all positions whose reports_to_position_id matches.
 */
export declare function getPositionDirectReports(tenantId: string, positionId: string): Promise<PositionRow[]>;
export declare function getNodes(tenantId: string, query?: Record<string, string>): Promise<unknown[]>;
export declare function getNodeById(tenantId: string, id: string): Promise<unknown | null>;
export declare function createNode(tenantId: string, input: any): Promise<any>;
export declare function updateNode(tenantId: string, id: string, input: any): Promise<any>;
export declare function deleteNode(tenantId: string, id: string, userId: string, nodeType?: any): Promise<boolean>;
export declare function transitionStatus(tenantId: string, id: string, toStatus: string, userId: string, nodeType?: any): Promise<any>;
export declare function getHierarchyTree(tenantId: string): Promise<unknown>;
export declare function getChildren(tenantId: string, parentId: string): Promise<unknown[]>;
