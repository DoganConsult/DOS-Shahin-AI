"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBusinessUnits = listBusinessUnits;
exports.getBusinessUnit = getBusinessUnit;
exports.createBusinessUnit = createBusinessUnit;
exports.updateBusinessUnit = updateBusinessUnit;
exports.deleteBusinessUnit = deleteBusinessUnit;
const node_crypto_1 = require("node:crypto");
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
async function listBusinessUnits(tenantId, opts = {}) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 25;
    const offset = (page - 1) * pageSize;
    const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
    const params = [tenantId];
    if (opts.organization_id) {
        params.push(opts.organization_id);
        conditions.push(`organization_id = $${params.length}`);
    }
    if (opts.search) {
        params.push(`%${opts.search}%`);
        conditions.push(`(name_en ILIKE $${params.length} OR name_ar ILIKE $${params.length} OR code ILIKE $${params.length})`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    return track('foundation.bu.list', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const countRes = await c.query(`SELECT COUNT(*) AS count FROM dos.business_units ${where}`, params);
        const listParams = [...params, pageSize, offset];
        const listRes = await c.query(`SELECT * FROM dos.business_units ${where} ORDER BY created_at DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`, listParams);
        return { data: listRes.rows, total: parseInt(countRes.rows[0]?.count || '0', 10) };
    }));
}
async function getBusinessUnit(tenantId, id) {
    return track('foundation.bu.getById', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.business_units WHERE bu_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [id, tenantId]);
        return r.rows[0] ?? null;
    }));
}
async function createBusinessUnit(tenantId, input, actorId) {
    const id = (0, node_crypto_1.randomUUID)();
    return track('foundation.bu.create', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO dos.business_units
           (bu_id, tenant_id, name_en, name_ar, code, organization_id, parent_bu_id, bu_type, status, description, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'active'), $10, $11, NOW(), NOW())
         RETURNING *`, [id, tenantId, input.name_en, input.name_ar ?? null, input.code ?? null,
            input.organization_id ?? null, input.parent_bu_id ?? null, input.bu_type ?? 'department',
            input.status ?? null, input.description ?? null, actorId]);
        return r.rows[0];
    }));
}
async function updateBusinessUnit(tenantId, id, input) {
    return track('foundation.bu.update', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.business_units
         SET name_en = COALESCE($3, name_en), name_ar = COALESCE($4, name_ar),
             code = COALESCE($5, code), organization_id = COALESCE($6, organization_id),
             parent_bu_id = COALESCE($7, parent_bu_id), bu_type = COALESCE($8, bu_type),
             status = COALESCE($9, status), description = COALESCE($10, description), updated_at = NOW()
         WHERE bu_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING *`, [id, tenantId, input.name_en ?? null, input.name_ar ?? null, input.code ?? null,
            input.organization_id ?? null, input.parent_bu_id ?? null, input.bu_type ?? null,
            input.status ?? null, input.description ?? null]);
        return r.rows[0] ?? null;
    }));
}
async function deleteBusinessUnit(tenantId, id) {
    return track('foundation.bu.delete', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.business_units SET deleted_at = NOW(), updated_at = NOW()
         WHERE bu_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING bu_id`, [id, tenantId]);
        return r.rows.length > 0;
    }));
}
//# sourceMappingURL=business-units.service.js.map