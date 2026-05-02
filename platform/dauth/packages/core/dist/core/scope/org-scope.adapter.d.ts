/**
 * Resolve which organizations a user has direct scope over,
 * from user_role_assignments with scope_type = 'organization'.
 */
export declare function resolveOrgScope(tenantId: string, userId: string): Promise<string[]>;
/**
 * Expand an organization scope to include all descendant entity IDs.
 * Traverses: organizations (parent_org_id) -> business_units (org_id)
 *   -> departments (bu_id) -> child departments/sections (parent_department_id).
 * Returns a flat array of all descendant IDs (org + BU + dept + section).
 */
export declare function expandOrgScope(tenantId: string, orgId: string): Promise<{
    orgIds: string[];
    buIds: string[];
    deptIds: string[];
    sectionIds: string[];
}>;
/**
 * Flatten expanded org scope into a single array of all entity IDs.
 * Useful for simple "is entity within org scope" checks.
 */
export declare function expandOrgScopeFlat(tenantId: string, orgId: string): Promise<string[]>;
/**
 * Check if a target entity (org, BU, dept, or section) falls within
 * any of the user's assigned organization scopes.
 */
export declare function isWithinOrgScope(tenantId: string, userId: string, targetEntityId: string): Promise<boolean>;
/**
 * Get all organizations for a tenant (active only).
 * Used for tenant-wide scope resolution.
 */
export declare function getAllOrganizations(tenantId: string): Promise<string[]>;
/**
 * Resolve the org_hierarchy_nodes/edges graph for an organization.
 * Returns node IDs grouped by node_type.
 * Falls back gracefully if org_hierarchy tables are empty.
 */
export declare function resolveOrgHierarchyGraph(tenantId: string, orgId: string): Promise<{
    nodeId: string;
    nodeType: string;
    entityId: string;
    level: number;
}[]>;
