"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveExternalScope = resolveExternalScope;
exports.isWithinExternalScope = isWithinExternalScope;
exports.hasExternalPermission = hasExternalPermission;
exports.getExternalEntityIds = getExternalEntityIds;
/**
 * DAuth External Scope Adapter — resolves scope for external/federated users.
 * Queries: external_user_scopes table (migration 011).
 *
 * External users (auditors, vendors, regulators) have limited scope defined
 * by explicit grants in external_user_scopes rather than role assignments
 * in the foundation hierarchy.
 *
 * Spec: Patch 3 §2.9.3
 */
const db_1 = require("@dos/db");
/**
 * Resolve all external scope grants for a user.
 * Returns the list of entities and permissions the external user can access.
 */
async function resolveExternalScope(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT scope_id, user_id, role, entity_type, entity_id, permissions
     FROM "${schema}".external_user_scopes
     WHERE user_id = $1`, [userId]);
    return rows.map((r) => {
        const row = r;
        return {
            scopeId: row.scope_id,
            userId: row.user_id,
            role: row.role,
            entityType: row.entity_type,
            entityId: row.entity_id,
            permissions: Array.isArray(row.permissions) ? row.permissions : [],
        };
    });
}
/**
 * Check if an external user has scope over a specific entity.
 */
async function isWithinExternalScope(tenantId, userId, targetEntityType, targetEntityId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT 1 FROM "${schema}".external_user_scopes
     WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
     LIMIT 1`, [userId, targetEntityType, targetEntityId]);
    return rows.length > 0;
}
/**
 * Check if an external user has a specific permission on a specific entity.
 */
async function hasExternalPermission(tenantId, userId, entityType, entityId, permission) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT permissions FROM "${schema}".external_user_scopes
     WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
     LIMIT 1`, [userId, entityType, entityId]);
    if (rows.length === 0)
        return false;
    const perms = Array.isArray(rows[0].permissions) ? rows[0].permissions : [];
    return perms.includes(permission);
}
/**
 * Get all entity IDs of a given type that an external user can access.
 */
async function getExternalEntityIds(tenantId, userId, entityType) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT entity_id FROM "${schema}".external_user_scopes
     WHERE user_id = $1 AND entity_type = $2`, [userId, entityType]);
    return rows.map((r) => r.entity_id);
}
//# sourceMappingURL=external-scope.adapter.js.map