"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOwnership = listOwnership;
exports.getOwnershipForEntity = getOwnershipForEntity;
exports.createOwnership = createOwnership;
exports.revokeOwnership = revokeOwnership;
exports.bulkReassignOwnership = bulkReassignOwnership;
const crypto_1 = require("crypto");
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
const COLS = `
  mapping_id, tenant_id, entity_type, entity_id,
  owner_user_id, owner_user_id AS owner_id,
  ownership_type,
  valid_from   AS effective_from,
  valid_to     AS effective_to,
  created_at, updated_at
`;
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
async function listOwnership(tenantId, opts = {}) {
    const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
    const params = [tenantId];
    if (opts.entity_type) {
        params.push(opts.entity_type);
        conditions.push(`entity_type = $${params.length}`);
    }
    if (opts.owner_id) {
        params.push(opts.owner_id);
        conditions.push(`owner_user_id = $${params.length}`);
    }
    return track('foundation.ownership.list', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT ${COLS} FROM dos.ownership_mappings WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`, params);
        return r.rows;
    }));
}
async function getOwnershipForEntity(tenantId, entityType, entityId) {
    return track('foundation.ownership.forEntity', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT om.mapping_id, om.tenant_id, om.entity_type, om.entity_id,
                om.owner_user_id, om.owner_user_id AS owner_id,
                om.ownership_type,
                om.valid_from AS effective_from,
                om.valid_to   AS effective_to,
                om.created_at, om.updated_at,
                u.email, u.display_name
           FROM dos.ownership_mappings om
           LEFT JOIN dos.users u ON u.user_id = om.owner_user_id
          WHERE om.entity_type = $1 AND om.entity_id = $2 AND om.tenant_id = $3 AND om.deleted_at IS NULL`, [entityType, entityId, tenantId]);
        return r.rows;
    }));
}
async function createOwnership(tenantId, input, _actorId) {
    const id = (0, crypto_1.randomUUID)();
    const ownerUserId = input.owner_user_id ?? input.owner_id;
    if (!ownerUserId) {
        const err = new Error('owner_user_id (or owner_id) is required');
        err.statusCode = 400;
        err.code = 'VALIDATION_FAILED';
        throw err;
    }
    return track('foundation.ownership.create', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO dos.ownership_mappings
           (mapping_id, tenant_id, entity_type, entity_id, owner_user_id, ownership_type, valid_from, valid_to, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()), $8, $9, NOW(), NOW())
         ON CONFLICT (tenant_id, entity_type, entity_id, owner_user_id, ownership_type)
           DO UPDATE SET valid_to = EXCLUDED.valid_to, updated_at = NOW(), deleted_at = NULL
         RETURNING ${COLS}`, [id, tenantId, input.entity_type, input.entity_id, ownerUserId,
            input.ownership_type ?? 'primary', input.effective_from ?? null, input.effective_to ?? null,
            _actorId]);
        return r.rows[0];
    }));
}
async function revokeOwnership(tenantId, id) {
    return track('foundation.ownership.revoke', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.ownership_mappings SET deleted_at = NOW(), updated_at = NOW()
          WHERE mapping_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        RETURNING mapping_id`, [id, tenantId]);
        return r.rows.length > 0;
    }));
}
async function bulkReassignOwnership(tenantId, input, _actorId) {
    if (!Array.isArray(input.entity_ids) || input.entity_ids.length === 0) {
        const err = new Error('entity_ids[] required');
        err.statusCode = 400;
        err.code = 'VALIDATION_FAILED';
        throw err;
    }
    const ownershipType = input.ownership_type ?? 'primary';
    return track('foundation.ownership.bulkReassign', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        await c.query('BEGIN');
        try {
            const revokeParams = [tenantId, input.entity_type, input.entity_ids, ownershipType];
            let revokeWhere = `tenant_id = $1 AND entity_type = $2 AND entity_id = ANY($3::varchar[])
                            AND ownership_type = $4 AND deleted_at IS NULL`;
            if (input.from_owner_user_id) {
                revokeParams.push(input.from_owner_user_id);
                revokeWhere += ` AND owner_user_id = $${revokeParams.length}`;
            }
            const revoked = await c.query(`UPDATE dos.ownership_mappings SET deleted_at = NOW(), updated_at = NOW()
            WHERE ${revokeWhere} RETURNING mapping_id`, revokeParams);
            let assigned = 0;
            for (const eid of input.entity_ids) {
                await c.query(`INSERT INTO dos.ownership_mappings
               (mapping_id, tenant_id, entity_type, entity_id, owner_user_id, ownership_type, valid_from, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW(), NOW())
             ON CONFLICT (tenant_id, entity_type, entity_id, owner_user_id, ownership_type)
               DO UPDATE SET deleted_at = NULL, valid_to = NULL, updated_at = NOW()`, [tenantId, input.entity_type, eid, input.to_owner_user_id, ownershipType]);
                assigned += 1;
            }
            await c.query('COMMIT');
            return { revoked: revoked.rows.length, assigned };
        }
        catch (e) {
            await c.query('ROLLBACK');
            throw e;
        }
    }));
}
//# sourceMappingURL=ownership-mapping.service.js.map