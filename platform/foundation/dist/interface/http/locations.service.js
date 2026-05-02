"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listLocations = listLocations;
exports.getLocation = getLocation;
exports.listChildLocations = listChildLocations;
exports.listLocationBUs = listLocationBUs;
exports.createLocation = createLocation;
exports.updateLocation = updateLocation;
exports.deleteLocation = deleteLocation;
exports.assignBuToLocation = assignBuToLocation;
exports.removeBuFromLocation = removeBuFromLocation;
const node_crypto_1 = require("node:crypto");
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
async function listLocations(tenantId, opts = {}) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 25;
    const offset = (page - 1) * pageSize;
    const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
    const params = [tenantId];
    if (opts.location_type) {
        params.push(opts.location_type);
        conditions.push(`location_type = $${params.length}`);
    }
    if (opts.country) {
        params.push(opts.country);
        conditions.push(`country = $${params.length}`);
    }
    if (opts.parent_id) {
        params.push(opts.parent_id);
        conditions.push(`parent_location_id = $${params.length}`);
    }
    if (opts.search) {
        params.push(`%${opts.search}%`);
        conditions.push(`(name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    return track('foundation.location.list', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const countRes = await c.query(`SELECT COUNT(*) AS count FROM dos.locations ${where}`, params);
        const listParams = [...params, pageSize, offset];
        const listRes = await c.query(`SELECT * FROM dos.locations ${where} ORDER BY created_at DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`, listParams);
        return { data: listRes.rows, total: parseInt(countRes.rows[0]?.count || '0', 10) };
    }));
}
async function getLocation(tenantId, id) {
    return track('foundation.location.getById', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.locations WHERE location_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [id, tenantId]);
        return r.rows[0] ?? null;
    }));
}
async function listChildLocations(tenantId, parentId) {
    return track('foundation.location.children', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.locations WHERE parent_location_id = $1 AND tenant_id = $2 AND deleted_at IS NULL ORDER BY name_en`, [parentId, tenantId]);
        return r.rows;
    }));
}
async function listLocationBUs(tenantId, locationId) {
    return track('foundation.location.bus', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT bu.* FROM dos.business_units bu
          JOIN dos.location_bu_map lbm ON lbm.bu_id = bu.bu_id
         WHERE lbm.location_id = $1 AND bu.tenant_id = $2 AND bu.deleted_at IS NULL
         ORDER BY bu.name_en`, [locationId, tenantId]);
        return r.rows;
    }));
}
async function createLocation(tenantId, input, actorId) {
    const id = (0, node_crypto_1.randomUUID)();
    return track('foundation.location.create', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO dos.locations
           (location_id, tenant_id, name_en, name_ar, code, location_type, country, city, address,
            parent_location_id, latitude, longitude, status, description, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, 'active'), $14, $15, NOW(), NOW())
         RETURNING *`, [id, tenantId, input.name_en, input.name_ar ?? null, input.code ?? null,
            input.location_type ?? 'office', input.country ?? null, input.city ?? null, input.address ?? null,
            input.parent_location_id ?? null, input.latitude ?? null, input.longitude ?? null,
            input.status ?? null, input.description ?? null, actorId]);
        return r.rows[0];
    }));
}
async function updateLocation(tenantId, id, input) {
    return track('foundation.location.update', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.locations
         SET name_en = COALESCE($3, name_en), name_ar = COALESCE($4, name_ar),
             code = COALESCE($5, code), location_type = COALESCE($6, location_type),
             country = COALESCE($7, country), city = COALESCE($8, city),
             address = COALESCE($9, address), parent_location_id = COALESCE($10, parent_location_id),
             latitude = COALESCE($11, latitude), longitude = COALESCE($12, longitude),
             status = COALESCE($13, status), description = COALESCE($14, description), updated_at = NOW()
         WHERE location_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING *`, [id, tenantId, input.name_en ?? null, input.name_ar ?? null, input.code ?? null,
            input.location_type ?? null, input.country ?? null, input.city ?? null, input.address ?? null,
            input.parent_location_id ?? null, input.latitude ?? null, input.longitude ?? null,
            input.status ?? null, input.description ?? null]);
        return r.rows[0] ?? null;
    }));
}
async function deleteLocation(tenantId, id) {
    return track('foundation.location.delete', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.locations SET deleted_at = NOW(), updated_at = NOW()
         WHERE location_id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING location_id`, [id, tenantId]);
        return r.rows.length > 0;
    }));
}
async function assignBuToLocation(tenantId, locationId, buId) {
    return track('foundation.location.assignBu', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        await c.query(`INSERT INTO dos.location_bu_map (location_id, bu_id, tenant_id, created_at)
         VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`, [locationId, buId, tenantId]);
    }));
}
async function removeBuFromLocation(tenantId, locationId, buId) {
    return track('foundation.location.removeBu', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        await c.query(`DELETE FROM dos.location_bu_map WHERE location_id = $1 AND bu_id = $2 AND tenant_id = $3`, [locationId, buId, tenantId]);
    }));
}
//# sourceMappingURL=locations.service.js.map