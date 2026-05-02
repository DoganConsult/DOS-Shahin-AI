"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrgTree = getOrgTree;
exports.getManagerChain = getManagerChain;
exports.getSubtree = getSubtree;
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
const MAX_DEPTH = 10;
async function getOrgTree(tenantId) {
    return track('foundation.hierarchy.tree', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`WITH RECURSIVE org_tree AS (
           SELECT o.organization_id AS node_id, o.name_en, o.name_ar, o.code, o.org_type AS node_type,
                  o.parent_id, 0 AS depth, ARRAY[o.organization_id] AS path
             FROM dos.organizations o
            WHERE o.tenant_id = $1 AND o.parent_id IS NULL AND o.deleted_at IS NULL
           UNION ALL
           SELECT o.organization_id, o.name_en, o.name_ar, o.code, o.org_type,
                  o.parent_id, t.depth + 1, t.path || o.organization_id
             FROM dos.organizations o
             JOIN org_tree t ON o.parent_id = t.node_id
            WHERE o.tenant_id = $1 AND o.deleted_at IS NULL AND t.depth < ${MAX_DEPTH}
         )
         SELECT * FROM org_tree ORDER BY depth, name_en`, [tenantId]);
        return r.rows;
    }));
}
/**
 * Walk the manager chain UPWARDS from a user's primary position via
 * dos.positions.reports_to until either the chain ends (reports_to IS NULL)
 * or MAX_DEPTH is hit. At each level, attach the current active holder
 * (position_assignments where ended_at IS NULL).
 *
 * Returns [] when the user has no active position assignment.
 */
async function getManagerChain(tenantId, userId) {
    return track('foundation.hierarchy.manager_chain', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`WITH RECURSIVE chain AS (
           SELECT p.position_id, p.title_en, p.title_ar, p.code, p.level, p.bu_id,
                  p.reports_to, 0 AS depth
             FROM dos.positions p
             JOIN dos.position_assignments pa
               ON pa.position_id = p.position_id
              AND pa.tenant_id = $1
              AND pa.user_id = $2
              AND pa.ended_at IS NULL
              AND pa.is_primary = TRUE
            WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
           UNION ALL
           SELECT p2.position_id, p2.title_en, p2.title_ar, p2.code, p2.level, p2.bu_id,
                  p2.reports_to, c.depth + 1
             FROM dos.positions p2
             JOIN chain c ON p2.position_id = c.reports_to
            WHERE p2.tenant_id = $1 AND p2.deleted_at IS NULL AND c.depth < ${MAX_DEPTH}
         )
         SELECT chain.position_id, chain.title_en, chain.title_ar, chain.code, chain.level,
                chain.bu_id, chain.depth,
                (SELECT pa2.user_id
                   FROM dos.position_assignments pa2
                  WHERE pa2.position_id = chain.position_id
                    AND pa2.tenant_id = $1
                    AND pa2.ended_at IS NULL
                    AND pa2.is_primary = TRUE
                  ORDER BY pa2.assigned_at DESC
                  LIMIT 1) AS holder_user_id
           FROM chain
         ORDER BY chain.depth ASC`, [tenantId, userId]);
        return r.rows;
    }));
}
async function getSubtree(tenantId, rootId) {
    return track('foundation.hierarchy.subtree', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`WITH RECURSIVE subtree AS (
           SELECT organization_id AS node_id, name_en, name_ar, code, org_type AS node_type,
                  parent_id, 0 AS depth
             FROM dos.organizations
            WHERE organization_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
           UNION ALL
           SELECT o.organization_id, o.name_en, o.name_ar, o.code, o.org_type,
                  o.parent_id, s.depth + 1
             FROM dos.organizations o
             JOIN subtree s ON o.parent_id = s.node_id
            WHERE o.tenant_id = $2 AND o.deleted_at IS NULL AND s.depth < ${MAX_DEPTH}
         )
         SELECT * FROM subtree ORDER BY depth, name_en`, [rootId, tenantId]);
        return r.rows;
    }));
}
//# sourceMappingURL=org-hierarchy.service.js.map