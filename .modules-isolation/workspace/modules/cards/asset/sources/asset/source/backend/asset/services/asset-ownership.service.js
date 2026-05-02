"use strict";
// ============================================
// Asset Ownership Service
// Ownership assignment, transfer, history
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOwners = getOwners;
exports.getOwnerHistory = getOwnerHistory;
exports.assignOwner = assignOwner;
exports.revokeOwner = revokeOwner;
exports.transferOwner = transferOwner;
exports.getUnownedEntities = getUnownedEntities;
exports.getOwnershipStats = getOwnershipStats;
const database_port_1 = require("../ports/database.port");
const events_port_1 = require("../ports/events.port");
const resilience_1 = require("@dos/platform-core/resilience");
async function getOwners(tenantId, entityType, entityId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT * FROM "${ts}".asset_owners
    WHERE entity_type = $1 AND entity_id = $2 AND revoked_at IS NULL
    ORDER BY owner_type
  `, [entityType, entityId]);
    return rows;
}
async function getOwnerHistory(tenantId, entityType, entityId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT * FROM "${ts}".asset_owners
    WHERE entity_type = $1 AND entity_id = $2
    ORDER BY created_at DESC
  `, [entityType, entityId]);
    return rows;
}
async function assignOwner(tenantId, userId, input) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    // Revoke previous active owner of same type
    await (0, database_port_1.safeQuery)(`
    UPDATE "${ts}".asset_owners
    SET revoked_at = NOW()
    WHERE entity_type = $1 AND entity_id = $2 AND owner_type = $3 AND revoked_at IS NULL
  `, [input.entity_type, input.entity_id, input.owner_type]);
    // Insert new ownership
    const { rows } = await (0, database_port_1.safeQuery)(`
    INSERT INTO "${ts}".asset_owners (entity_type, entity_id, owner_type, owner_user_id, assigned_by, notes)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `, [input.entity_type, input.entity_id, input.owner_type, input.owner_user_id, userId, input.notes || '']);
    (0, events_port_1.emitEvent)({
        tenantId, userId, module: 'asset', event: 'owner_assigned',
        entityType: input.entity_type, entityId: input.entity_id,
        data: { ownerType: input.owner_type, ownerUserId: input.owner_user_id },
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return rows[0];
}
async function revokeOwner(tenantId, userId, ownershipId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    UPDATE "${ts}".asset_owners SET revoked_at = NOW()
    WHERE ownership_id = $1 AND revoked_at IS NULL RETURNING *
  `, [ownershipId]);
    if (rows[0]) {
        (0, events_port_1.emitEvent)({
            tenantId, userId, module: 'asset', event: 'owner_revoked',
            entityType: rows[0].entity_type, entityId: rows[0].entity_id,
            data: { ownerType: rows[0].owner_type, ownerUserId: rows[0].owner_user_id },
        }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
    return rows[0] || null;
}
async function transferOwner(tenantId, userId, entityType, entityId, ownerType, newOwnerId, notes) {
    return assignOwner(tenantId, userId, { entity_type: entityType, entity_id: entityId, owner_type: ownerType, owner_user_id: newOwnerId, notes });
}
async function getUnownedEntities(tenantId, entityType, page = 1, pageSize = 25) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const offset = (page - 1) * pageSize;
    const table = entityType === 'application' ? 'applications' : entityType === 'business_service' ? 'business_services' : 'assets';
    const idCol = entityType === 'application' ? 'application_id' : entityType === 'business_service' ? 'service_id' : 'asset_id';
    const countR = await (0, database_port_1.safeQuery)(`
    SELECT COUNT(*)::int AS total FROM "${ts}".${table} e
    WHERE e.deleted_at IS NULL AND NOT EXISTS (
      SELECT 1 FROM "${ts}".asset_owners o WHERE o.entity_type = $1 AND o.entity_id = e.${idCol} AND o.revoked_at IS NULL
    )
  `, [entityType]);
    const total = countR.rows[0]?.total || 0;
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT e.* FROM "${ts}".${table} e
    WHERE e.deleted_at IS NULL AND NOT EXISTS (
      SELECT 1 FROM "${ts}".asset_owners o WHERE o.entity_type = $1 AND o.entity_id = e.${idCol} AND o.revoked_at IS NULL
    )
    ORDER BY e.created_at DESC LIMIT $2 OFFSET $3
  `, [entityType, pageSize, offset]);
    return { data: rows, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}
async function getOwnershipStats(tenantId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT
      COUNT(DISTINCT CASE WHEN entity_type = 'asset' THEN entity_id END)::int AS owned_assets,
      COUNT(DISTINCT CASE WHEN entity_type = 'application' THEN entity_id END)::int AS owned_applications,
      COUNT(DISTINCT CASE WHEN entity_type = 'business_service' THEN entity_id END)::int AS owned_services,
      COUNT(DISTINCT owner_user_id)::int AS unique_owners
    FROM "${ts}".asset_owners WHERE revoked_at IS NULL
  `);
    return rows[0];
}
//# sourceMappingURL=asset-ownership.service.js.map