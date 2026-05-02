"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveOwnershipScope = resolveOwnershipScope;
exports.isEntityOwner = isEntityOwner;
exports.isPrimaryOwner = isPrimaryOwner;
exports.getEntityOwners = getEntityOwners;
exports.getOwnedEntityIds = getOwnedEntityIds;
exports.assignControlOwnership = assignControlOwnership;
exports.assignRiskOwnership = assignRiskOwnership;
exports.revokeControlOwnership = revokeControlOwnership;
exports.revokeRiskOwnership = revokeRiskOwnership;
/**
 * DAuth Ownership Scope Adapter — resolves entity ownership from DOS foundation tables.
 * Queries: grc_ownership_matrix view (union of control_owners, risk_owners, evidence_owners, etc.)
 * and domain-specific owner tables for write operations.
 *
 * The grc_ownership_matrix view provides a unified read surface across all
 * GRC entity types (control, risk, evidence, policy, etc.).
 */
const db_1 = require("@dos/db");
/**
 * Resolve all entities owned by a user, optionally filtered by entity type.
 * Reads from grc_ownership_matrix view which unifies all ownership tables.
 */
async function resolveOwnershipScope(tenantId, userId, entityType) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const params = [userId];
    let typeFilter = '';
    if (entityType) {
        typeFilter = ' AND entity_type = $2';
        params.push(entityType);
    }
    const { rows } = await (0, db_1.safeQuery)(`SELECT entity_type, entity_id::text, user_id, ownership_type,
            COALESCE(is_primary, FALSE) AS is_primary,
            primary_team_id::text, dept_id::text
     FROM "${schema}".grc_ownership_matrix
     WHERE user_id = $1${typeFilter}`, params);
    return rows.map((r) => ({
        entityType: r.entity_type,
        entityId: r.entity_id,
        userId: r.user_id,
        ownershipType: r.ownership_type,
        isPrimary: r.is_primary,
        primaryTeamId: r.primary_team_id,
        deptId: r.dept_id,
    }));
}
/**
 * Check if a user owns a specific entity (any ownership type).
 * Queries the grc_ownership_matrix view for an exact match.
 */
async function isEntityOwner(tenantId, userId, entityType, entityId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT 1 FROM "${schema}".grc_ownership_matrix
     WHERE user_id = $1 AND entity_type = $2 AND entity_id::text = $3
     LIMIT 1`, [userId, entityType, entityId]);
    return rows.length > 0;
}
/**
 * Check if a user is the PRIMARY owner of a specific entity.
 */
async function isPrimaryOwner(tenantId, userId, entityType, entityId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT 1 FROM "${schema}".grc_ownership_matrix
     WHERE user_id = $1 AND entity_type = $2 AND entity_id::text = $3 AND is_primary = TRUE
     LIMIT 1`, [userId, entityType, entityId]);
    return rows.length > 0;
}
/**
 * Get all owners for a specific entity.
 * Returns user IDs with their ownership type and primary flag.
 */
async function getEntityOwners(tenantId, entityType, entityId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT user_id, ownership_type, COALESCE(is_primary, FALSE) AS is_primary
     FROM "${schema}".grc_ownership_matrix
     WHERE entity_type = $1 AND entity_id::text = $2`, [entityType, entityId]);
    return rows.map((r) => ({
        userId: r.user_id,
        ownershipType: r.ownership_type,
        isPrimary: r.is_primary,
    }));
}
/**
 * Get all entity IDs owned by a user for a specific entity type.
 * Convenience wrapper returning just the IDs.
 */
async function getOwnedEntityIds(tenantId, userId, entityType) {
    const records = await resolveOwnershipScope(tenantId, userId, entityType);
    return records.map(r => r.entityId);
}
/**
 * Assign ownership for a control entity.
 * Uses the control_owners table directly for write operations.
 */
async function assignControlOwnership(tenantId, userId, controlId, ownershipType, isPrimary, assignedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".control_owners (control_id, user_id, ownership_type, is_primary, assigned_by, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (control_id, user_id) DO UPDATE SET
       ownership_type = EXCLUDED.ownership_type,
       is_primary = EXCLUDED.is_primary,
       deleted_at = NULL,
       updated_at = NOW()`, [controlId, userId, ownershipType, isPrimary, assignedBy]);
}
/**
 * Assign ownership for a risk entity.
 * Uses the risk_owners table directly for write operations.
 */
async function assignRiskOwnership(tenantId, userId, riskId, ownershipType, isPrimary, assignedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".risk_owners (risk_id, user_id, ownership_type, is_primary, assigned_by, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (risk_id, user_id) DO UPDATE SET
       ownership_type = EXCLUDED.ownership_type,
       is_primary = EXCLUDED.is_primary,
       deleted_at = NULL,
       updated_at = NOW()`, [riskId, userId, ownershipType, isPrimary, assignedBy]);
}
/**
 * Revoke ownership by soft-deleting the ownership record.
 * Works for control_owners table.
 */
async function revokeControlOwnership(tenantId, userId, controlId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`UPDATE "${schema}".control_owners SET deleted_at = NOW(), updated_at = NOW()
     WHERE control_id = $1 AND user_id = $2 AND deleted_at IS NULL`, [controlId, userId]);
}
/**
 * Revoke ownership by soft-deleting the ownership record.
 * Works for risk_owners table.
 */
async function revokeRiskOwnership(tenantId, userId, riskId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`UPDATE "${schema}".risk_owners SET deleted_at = NOW(), updated_at = NOW()
     WHERE risk_id = $1 AND user_id = $2 AND deleted_at IS NULL`, [riskId, userId]);
}
//# sourceMappingURL=ownership-scope.adapter.js.map