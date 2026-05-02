"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleAssignmentService = void 0;
exports.listRoleAssignments = listRoleAssignments;
exports.assignRole = assignRole;
exports.revokeRoleAssignment = revokeRoleAssignment;
const node_crypto_1 = require("node:crypto");
const db_1 = require("@dos/db");
const module_sdk_1 = require("@dos/module-sdk");
const metrics_1 = require("../observability/metrics");
async function listRoleAssignments(tenantId, userId) {
    const start = Date.now();
    try {
        return await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`SELECT assignment_id, tenant_id, user_id, role_code, scope, granted_by, granted_at, expires_at, is_active
           FROM dos.user_role_assignments
          WHERE tenant_id = $1 AND user_id = $2 AND is_active = TRUE
          ORDER BY granted_at DESC`, [tenantId, userId]);
            return result.rows;
        });
    }
    catch (err) {
        module_sdk_1.logger.error('[RoleAssignmentService] Failed to list role assignments', { tenantId, userId, error: (0, module_sdk_1.toErrorMessage)(err) });
        return [];
    }
    finally {
        metrics_1.userMetrics.observeDb('roleAssignment.list', Date.now() - start);
    }
}
async function assignRole(tenantId, userId, roleCode, assignedBy) {
    const id = (0, node_crypto_1.randomUUID)();
    const start = Date.now();
    try {
        const row = await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`INSERT INTO dos.user_role_assignments
           (assignment_id, tenant_id, user_id, role_code, granted_by, granted_at, is_active)
         VALUES ($1, $2, $3, $4, $5, NOW(), TRUE)
         ON CONFLICT (tenant_id, user_id, role_code) WHERE is_active = TRUE
           DO UPDATE SET granted_by = EXCLUDED.granted_by, granted_at = NOW()
         RETURNING assignment_id, tenant_id, user_id, role_code, scope, granted_by, granted_at, expires_at, is_active`, [id, tenantId, userId, roleCode, assignedBy]);
            return result.rows[0];
        });
        metrics_1.userMetrics.roleAssigned(tenantId, roleCode);
        module_sdk_1.logger.info('[RoleAssignmentService] Role assigned', { tenantId, userId, roleCode, assignedBy });
        return row;
    }
    catch (err) {
        module_sdk_1.logger.error('[RoleAssignmentService] Failed to assign role', { tenantId, userId, roleCode, error: (0, module_sdk_1.toErrorMessage)(err) });
        throw err;
    }
    finally {
        metrics_1.userMetrics.observeDb('roleAssignment.assign', Date.now() - start);
    }
}
async function revokeRoleAssignment(tenantId, userId, assignmentId) {
    const start = Date.now();
    try {
        const row = await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`UPDATE dos.user_role_assignments
         SET is_active = FALSE, revoked_at = NOW()
         WHERE assignment_id = $1 AND tenant_id = $2 AND user_id = $3 AND is_active = TRUE
         RETURNING assignment_id, role_code`, [assignmentId, tenantId, userId]);
            return result.rows[0];
        });
        if (row) {
            metrics_1.userMetrics.roleRevoked(tenantId, row.role_code);
            module_sdk_1.logger.info('[RoleAssignmentService] Role revoked', { tenantId, userId, assignmentId, roleCode: row.role_code });
            return true;
        }
        return false;
    }
    catch (err) {
        module_sdk_1.logger.error('[RoleAssignmentService] Failed to revoke role assignment', { tenantId, userId, assignmentId, error: (0, module_sdk_1.toErrorMessage)(err) });
        throw err;
    }
    finally {
        metrics_1.userMetrics.observeDb('roleAssignment.revoke', Date.now() - start);
    }
}
exports.RoleAssignmentService = {
    listRoleAssignments,
    assignRole,
    revokeRoleAssignment,
};
//# sourceMappingURL=role-assignment.service.js.map