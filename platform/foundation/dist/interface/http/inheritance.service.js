"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInheritance = getInheritance;
/**
 * Foundation inheritance service — walks a scope's parent chain (org / BU /
 * department) and aggregates inherited items at each level. The first
 * concrete consumer is policy inheritance from `governance_policies` (when
 * the governance schema is present); the API shape is generic so other
 * inherited concerns (security baseline, SoD requirement, SLA policy) can
 * plug in by adding a fetcher in INHERITANCE_FETCHERS below.
 *
 * Inheritance rules per the plan:
 *   • Security baseline cannot be weakened by child orgs.
 *   • SoD cannot be disabled by child orgs.
 *   • MFA / password / security policy can only become stricter.
 *   • Approval matrix can become stricter.
 *   • SLA can be overridden only when allowed.
 *   • Direct user exceptions require audit + expiry.
 *
 * This service returns the RAW inheritance chain. Tightening / merge logic
 * is the consumer's responsibility (DAuth for SoD/security baseline, DOS for
 * SLA, etc.). Foundation only owns "what is inherited from where."
 *
 * Plan: docs/plans/need-to-clean-the-swift-trinket.md (Phase B-1)
 */
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
const MAX_DEPTH = 10;
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
async function ancestorChain(client, tenantId, scopeType, scopeId) {
    if (scopeType === 'organization') {
        const r = await client.query(`WITH RECURSIVE chain AS (
         SELECT organization_id AS id, name_en AS name, parent_id, 0 AS level
           FROM dos.organizations
          WHERE organization_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         UNION ALL
         SELECT o.organization_id, o.name_en, o.parent_id, c.level + 1
           FROM dos.organizations o
           JOIN chain c ON o.organization_id = c.parent_id
          WHERE o.tenant_id = $2 AND o.deleted_at IS NULL AND c.level < ${MAX_DEPTH}
       )
       SELECT id, name, level FROM chain ORDER BY level ASC`, [scopeId, tenantId]);
        return r.rows.map((row) => ({
            id: row.id, name: row.name, level: Number(row.level),
        }));
    }
    if (scopeType === 'business_unit') {
        const r = await client.query(`WITH RECURSIVE chain AS (
         SELECT bu_id AS id, name_en AS name, parent_bu_id AS parent, 0 AS level
           FROM dos.business_units
          WHERE bu_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         UNION ALL
         SELECT b.bu_id, b.name_en, b.parent_bu_id, c.level + 1
           FROM dos.business_units b
           JOIN chain c ON b.bu_id = c.parent
          WHERE b.tenant_id = $2 AND b.deleted_at IS NULL AND c.level < ${MAX_DEPTH}
       )
       SELECT id, name, level FROM chain ORDER BY level ASC`, [scopeId, tenantId]);
        return r.rows.map((row) => ({
            id: row.id, name: row.name, level: Number(row.level),
        }));
    }
    // department
    const r = await client.query(`WITH RECURSIVE chain AS (
       SELECT department_id AS id, COALESCE(display_name, department_code) AS name,
              parent_id AS parent, 0 AS level
         FROM dos.departments
        WHERE department_id = $1 AND tenant_id = $2
       UNION ALL
       SELECT d.department_id, COALESCE(d.display_name, d.department_code), d.parent_id, c.level + 1
         FROM dos.departments d
         JOIN chain c ON d.department_id = c.parent
        WHERE d.tenant_id = $2 AND c.level < ${MAX_DEPTH}
     )
     SELECT id, name, level FROM chain ORDER BY level ASC`, [scopeId, tenantId]);
    return r.rows.map((row) => ({
        id: row.id, name: row.name, level: Number(row.level),
    }));
}
/**
 * Resolve inheritance for a scope. Currently returns the ancestor chain
 * with empty itemized lists; downstream consumers (governance, workflow)
 * extend this by registering fetchers. The shape is stable so the FE can
 * already render the chain even before policy/SLA links are wired.
 */
async function getInheritance(tenantId, scopeType, scopeId) {
    return track('foundation.inheritance.resolve', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const chain = await ancestorChain(c, tenantId, scopeType, scopeId);
        // Initial implementation: chain only. Hooks for itemized inheritance
        // (governance policies, SoD, SLA) will plug in here without changing
        // the route contract — they fill the inheritedItems[] array.
        const inheritedItems = [];
        return { scopeType, scopeId, chain, inheritedItems };
    }));
}
//# sourceMappingURL=inheritance.service.js.map