"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUserRoles = listUserRoles;
exports.assignRole = assignRole;
exports.revokeRole = revokeRole;
exports.listAvailableRoles = listAvailableRoles;
const db_1 = require("@dos/db");
const metrics_1 = require("../observability/metrics");
// W2.F2.2 — SoD precheck used by assignRole().
// Queries the tenant-schema sod_rules table (when present) and blocks
// role assignment if proposedRole conflicts with any of the user's
// currently active roles. Missing tenant schema or table degrades to
// allow (sod_rules is optional infrastructure on legacy tenants).
async function evaluateSodConflict(client, tenantId, userId, proposedRole) {
    try {
        const cur = await client.query(`SELECT ra.role_code
         FROM dos.user_role_assignments ra
         JOIN dos.users u ON u.user_id = ra.user_id
        WHERE ra.user_id = $1 AND u.tenant_id = $2 AND ra.is_active = TRUE`, [userId, tenantId]);
        const currentRoles = cur.rows.map((r) => r.role_code);
        const schema = (0, db_1.tenantSchema)(tenantId);
        const r = await client.query(`SELECT rule_code, rule_name, severity, description, conflict_a, conflict_b
         FROM "${schema}".sod_rules
        WHERE enabled = true
          AND ((conflict_a && ARRAY[$1]::text[] AND conflict_b && $2::text[])
            OR (conflict_b && ARRAY[$1]::text[] AND conflict_a && $2::text[]))`, [proposedRole, currentRoles.length > 0 ? currentRoles : ['__none__']]);
        return { has_conflicts: r.rows.length > 0, conflicts: r.rows };
    }
    catch (err) {
        if (err?.code === '42P01' || err?.code === '3F000') {
            return { has_conflicts: false, conflicts: [] };
        }
        throw err;
    }
}
async function listUserRoles(tenantId, userId) {
    const start = Date.now();
    try {
        return await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`SELECT ra.id            AS assignment_id,
                ra.user_id,
                ra.role_code,
                u.tenant_id      AS tenant_id,
                ra.scope,
                ra.assigned_by   AS granted_by,
                ra.assigned_at   AS granted_at,
                ra.is_active
           FROM dos.user_role_assignments ra
           JOIN dos.users u ON u.user_id = ra.user_id
          WHERE ra.user_id = $2 AND u.tenant_id = $1 AND ra.is_active = TRUE
          ORDER BY ra.assigned_at DESC`, [tenantId, userId]);
            return result.rows;
        });
    }
    finally {
        metrics_1.userMetrics.observeDb('role.list', Date.now() - start);
    }
}
async function assignRole(tenantId, userId, roleCode, grantedBy) {
    const start = Date.now();
    try {
        const row = await (0, db_1.withTenantClient)(tenantId, async (c) => {
            // Tenant-safety gate: verify target user actually belongs to the
            // caller's tenant BEFORE touching role rows.
            const tenantCheck = await c.query(`SELECT 1 FROM dos.users WHERE user_id = $1 AND tenant_id = $2 LIMIT 1`, [userId, tenantId]);
            if (tenantCheck.rows.length === 0) {
                const err = new Error('User not found in tenant');
                err.statusCode = 404;
                err.code = 'USER_NOT_FOUND';
                throw err;
            }
            // functional_role_id is NOT NULL on this table; resolve it from
            // the canonical role registry before INSERT.
            const role = await c.query(`SELECT id FROM dos.functional_roles WHERE code = $1 LIMIT 1`, [roleCode]);
            if (role.rows.length === 0) {
                const err = new Error(`Unknown role code: ${roleCode}`);
                err.statusCode = 400;
                err.code = 'INVALID_ROLE_CODE';
                throw err;
            }
            // W2.F2.2 — SoD precheck: block conflicting role grants.
            const sod = await evaluateSodConflict(c, tenantId, userId, roleCode);
            if (sod.has_conflicts) {
                const err = new Error('SoD conflict — role assignment blocked');
                err.statusCode = 409;
                err.code = 'SOD_CONFLICT';
                err.details = { conflicts: sod.conflicts };
                throw err;
            }
            const result = await c.query(`INSERT INTO dos.user_role_assignments
           (user_id, functional_role_id, role_code, assigned_by, assigned_at, is_active)
         VALUES ($1, $2, $3, $4, NOW(), TRUE)
         ON CONFLICT (user_id, functional_role_id)
           DO UPDATE SET is_active   = TRUE,
                         assigned_at = NOW(),
                         assigned_by = EXCLUDED.assigned_by
         RETURNING id             AS assignment_id,
                   user_id,
                   role_code,
                   scope,
                   assigned_by    AS granted_by,
                   assigned_at    AS granted_at,
                   is_active`, [userId, role.rows[0].id, roleCode, grantedBy ?? null]);
            const row = result.rows[0];
            return { ...row, tenant_id: tenantId };
        });
        metrics_1.userMetrics.roleAssigned(tenantId, roleCode);
        return row;
    }
    finally {
        metrics_1.userMetrics.observeDb('role.assign', Date.now() - start);
    }
}
async function revokeRole(tenantId, userId, roleCode) {
    const start = Date.now();
    try {
        const revoked = await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`UPDATE dos.user_role_assignments AS ra
            SET is_active = FALSE
           FROM dos.users u
          WHERE ra.user_id = u.user_id
            AND ra.user_id = $2
            AND ra.role_code = $3
            AND u.tenant_id = $1
            AND ra.is_active = TRUE
         RETURNING ra.id`, [tenantId, userId, roleCode]);
            return result.rows.length > 0;
        });
        if (revoked)
            metrics_1.userMetrics.roleRevoked(tenantId, roleCode);
        return revoked;
    }
    finally {
        metrics_1.userMetrics.observeDb('role.revoke', Date.now() - start);
    }
}
async function listAvailableRoles(tenantId) {
    const start = Date.now();
    try {
        return await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`SELECT ra.role_code, COUNT(*)::int AS count
           FROM dos.user_role_assignments ra
           JOIN dos.users u ON u.user_id = ra.user_id
          WHERE u.tenant_id = $1 AND ra.is_active = TRUE
          GROUP BY ra.role_code
          ORDER BY ra.role_code`, [tenantId]);
            return result.rows;
        });
    }
    finally {
        metrics_1.userMetrics.observeDb('role.listAvailable', Date.now() - start);
    }
}
//# sourceMappingURL=role.service.js.map