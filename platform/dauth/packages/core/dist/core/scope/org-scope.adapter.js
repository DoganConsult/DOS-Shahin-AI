"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveOrgScope = resolveOrgScope;
exports.expandOrgScope = expandOrgScope;
exports.expandOrgScopeFlat = expandOrgScopeFlat;
exports.isWithinOrgScope = isWithinOrgScope;
exports.getAllOrganizations = getAllOrganizations;
exports.resolveOrgHierarchyGraph = resolveOrgHierarchyGraph;
/**
 * DAuth Org Scope Adapter — resolves organization scope from DOS foundation tables.
 * Queries: organizations, business_units, departments.
 * Uses org_hierarchy_nodes/org_hierarchy_edges when available, falls back to
 * direct FK traversal on foundation tables.
 */
const db_1 = require("@dos/db");
/**
 * Resolve which organizations a user has direct scope over,
 * from user_role_assignments with scope_type = 'organization'.
 */
async function resolveOrgScope(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT DISTINCT scope_id FROM "${schema}".user_role_assignments
     WHERE user_id = $1 AND scope_type = 'organization' AND active = TRUE`, [userId]);
    return rows.map((r) => r.scope_id);
}
/**
 * Expand an organization scope to include all descendant entity IDs.
 * Traverses: organizations (parent_org_id) -> business_units (org_id)
 *   -> departments (bu_id) -> child departments/sections (parent_department_id).
 * Returns a flat array of all descendant IDs (org + BU + dept + section).
 */
async function expandOrgScope(tenantId, orgId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    // 1. Expand child organizations (via parent_org_id)
    const childOrgs = await (0, db_1.safeQuery)(`WITH RECURSIVE org_tree AS (
       SELECT org_id::text FROM "${schema}".organizations WHERE org_id::text = $1 AND status = 'active'
       UNION ALL
       SELECT o.org_id::text FROM "${schema}".organizations o
       JOIN org_tree ot ON o.parent_org_id::text = ot.org_id
       WHERE o.status = 'active'
     )
     SELECT org_id FROM org_tree`, [orgId]);
    const orgIds = childOrgs.rows.map((r) => r.org_id);
    // 2. Get all business units under these organizations
    const bus = orgIds.length > 0
        ? await (0, db_1.safeQuery)(`SELECT bu_id::text FROM "${schema}".business_units
         WHERE org_id::text = ANY($1) AND status = 'active'`, [orgIds])
        : { rows: [] };
    const buIds = bus.rows.map((r) => r.bu_id);
    // 3. Get all departments under those business units
    const depts = buIds.length > 0
        ? await (0, db_1.safeQuery)(`SELECT dept_id::text, parent_department_id::text FROM "${schema}".departments
         WHERE bu_id::text = ANY($1) AND status = 'active'`, [buIds])
        : { rows: [] };
    // Separate top-level departments from sections (child departments)
    const deptIds = [];
    const sectionIds = [];
    for (const r of depts.rows) {
        if (r.parent_department_id) {
            sectionIds.push(r.dept_id);
        }
        else {
            deptIds.push(r.dept_id);
        }
    }
    return { orgIds, buIds, deptIds, sectionIds };
}
/**
 * Flatten expanded org scope into a single array of all entity IDs.
 * Useful for simple "is entity within org scope" checks.
 */
async function expandOrgScopeFlat(tenantId, orgId) {
    const expanded = await expandOrgScope(tenantId, orgId);
    return [...expanded.orgIds, ...expanded.buIds, ...expanded.deptIds, ...expanded.sectionIds];
}
/**
 * Check if a target entity (org, BU, dept, or section) falls within
 * any of the user's assigned organization scopes.
 */
async function isWithinOrgScope(tenantId, userId, targetEntityId) {
    const directOrgs = await resolveOrgScope(tenantId, userId);
    if (directOrgs.includes(targetEntityId))
        return true;
    for (const orgId of directOrgs) {
        const descendants = await expandOrgScopeFlat(tenantId, orgId);
        if (descendants.includes(targetEntityId))
            return true;
    }
    return false;
}
/**
 * Get all organizations for a tenant (active only).
 * Used for tenant-wide scope resolution.
 */
async function getAllOrganizations(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT org_id::text FROM "${schema}".organizations WHERE status = 'active'`, []);
    return rows.map((r) => r.org_id);
}
/**
 * Resolve the org_hierarchy_nodes/edges graph for an organization.
 * Returns node IDs grouped by node_type.
 * Falls back gracefully if org_hierarchy tables are empty.
 */
async function resolveOrgHierarchyGraph(tenantId, orgId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    // Find the root node for this organization
    const rootNode = await (0, db_1.safeQuery)(`SELECT node_id FROM "${schema}".org_hierarchy_nodes
     WHERE entity_id::text = $1 AND node_type = 'organization' AND deleted_at IS NULL
     LIMIT 1`, [orgId]);
    if (rootNode.rows.length === 0)
        return [];
    // Traverse edges downward from the root node
    const { rows } = await (0, db_1.safeQuery)(`WITH RECURSIVE graph AS (
       SELECT n.node_id, n.node_type, n.entity_id::text, n.level
       FROM "${schema}".org_hierarchy_nodes n
       WHERE n.node_id = $1 AND n.deleted_at IS NULL
       UNION ALL
       SELECT cn.node_id, cn.node_type, cn.entity_id::text, cn.level
       FROM "${schema}".org_hierarchy_edges e
       JOIN "${schema}".org_hierarchy_nodes cn ON cn.node_id = e.child_node_id
       JOIN graph g ON e.parent_node_id = g.node_id
       WHERE e.deleted_at IS NULL AND cn.deleted_at IS NULL
     )
     SELECT node_id, node_type, entity_id, level FROM graph`, [rootNode.rows[0].node_id]);
    return rows.map((r) => ({
        nodeId: r.node_id,
        nodeType: r.node_type,
        entityId: r.entity_id,
        level: Number(r.level),
    }));
}
//# sourceMappingURL=org-scope.adapter.js.map