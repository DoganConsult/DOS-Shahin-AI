"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrganizations = getOrganizations;
exports.getOrganizationBusinessUnits = getOrganizationBusinessUnits;
exports.getOrganizationById = getOrganizationById;
exports.createOrganization = createOrganization;
exports.updateOrganization = updateOrganization;
exports.deleteOrganization = deleteOrganization;
const database_port_js_1 = require("../../ports/database.port.js");
async function getOrganizations(tenantId) {
    const schema = (0, database_port_js_1.tenantSchema)(tenantId);
    const countResult = await (0, database_port_js_1.safeQuery)(`SELECT COUNT(*) AS count FROM "${schema}".organizations WHERE deleted_at IS NULL`);
    const listResult = await (0, database_port_js_1.safeQuery)(`SELECT * FROM "${schema}".organizations
     WHERE deleted_at IS NULL
     ORDER BY name_en ASC`);
    const rawCount = countResult.rows[0]?.count;
    const count = Number.isFinite(Number(rawCount)) ? Number(rawCount) : listResult.rows.length;
    return { count, rows: listResult.rows };
}
async function getOrganizationBusinessUnits(tenantId, orgId) {
    const schema = (0, database_port_js_1.tenantSchema)(tenantId);
    const result = await (0, database_port_js_1.safeQuery)(`SELECT * FROM "${schema}".business_units WHERE org_id = $1 AND deleted_at IS NULL ORDER BY name_en ASC`, [orgId]);
    return { count: result.rows.length, rows: result.rows };
}
async function getOrganizationById(tenantId, orgId) {
    const schema = (0, database_port_js_1.tenantSchema)(tenantId);
    const result = await (0, database_port_js_1.safeQuery)(`SELECT * FROM "${schema}".organizations WHERE org_id = $1 OR id = $1 LIMIT 1`, [orgId]);
    return result.rows[0] || null;
}
async function createOrganization(tenantId, payload) {
    const schema = (0, database_port_js_1.tenantSchema)(tenantId);
    const { name_en, metadata, name_ar, code, status } = payload;
    const result = await (0, database_port_js_1.safeQuery)(`INSERT INTO "${schema}".organizations (name_en, name_ar, code, status, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING *`, [name_en, name_ar ?? null, code ?? null, status ?? 'active', metadata ? JSON.stringify(metadata) : null]);
    return result.rows[0];
}
async function updateOrganization(tenantId, orgId, payload) {
    const schema = (0, database_port_js_1.tenantSchema)(tenantId);
    const { name_en, name_ar, code, status, metadata } = payload;
    const result = await (0, database_port_js_1.safeQuery)(`UPDATE "${schema}".organizations
     SET name_en = COALESCE($2, name_en),
         name_ar = COALESCE($3, name_ar),
         code = COALESCE($4, code),
         status = COALESCE($5, status),
         metadata = COALESCE($6, metadata),
         updated_at = NOW()
     WHERE org_id = $1 OR id = $1
     RETURNING *`, [orgId, name_en ?? null, name_ar ?? null, code ?? null, status ?? null, metadata ? JSON.stringify(metadata) : null]);
    return result.rows[0] || null;
}
async function deleteOrganization(tenantId, orgId) {
    const schema = (0, database_port_js_1.tenantSchema)(tenantId);
    const dependencyResult = await (0, database_port_js_1.safeQuery)(`SELECT COUNT(*) AS count FROM "${schema}".business_units WHERE org_id = $1 AND deleted_at IS NULL`, [orgId]);
    const result = await (0, database_port_js_1.safeQuery)(`UPDATE "${schema}".organizations
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE org_id = $1 OR id = $1
     RETURNING org_id`, [orgId]);
    if (!result.rows[0])
        return { deleted: false, linkedBusinessUnits: 0 };
    const rawCount = dependencyResult.rows[0]?.count;
    const linkedBusinessUnits = Number.isFinite(Number(rawCount)) ? Number(rawCount) : 0;
    return { deleted: true, linkedBusinessUnits };
}
//# sourceMappingURL=organization.service.js.map