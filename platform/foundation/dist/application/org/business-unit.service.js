"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusinessUnits = getBusinessUnits;
exports.getBusinessUnitById = getBusinessUnitById;
exports.createBusinessUnit = createBusinessUnit;
exports.updateBusinessUnit = updateBusinessUnit;
exports.deleteBusinessUnit = deleteBusinessUnit;
const database_port_js_1 = require("../../ports/database.port.js");
async function getBusinessUnits(tenantId) {
    const schema = (0, database_port_js_1.tenantSchema)(tenantId);
    const countResult = await (0, database_port_js_1.safeQuery)(`SELECT COUNT(*) AS count FROM "${schema}".business_units WHERE deleted_at IS NULL`);
    const listResult = await (0, database_port_js_1.safeQuery)(`SELECT * FROM "${schema}".business_units
     WHERE deleted_at IS NULL
     ORDER BY name_en ASC`);
    const rawCount = countResult.rows[0]?.count;
    const count = Number.isFinite(Number(rawCount)) ? Number(rawCount) : listResult.rows.length;
    return { count, rows: listResult.rows };
}
async function getBusinessUnitById(tenantId, buId) {
    const schema = (0, database_port_js_1.tenantSchema)(tenantId);
    const result = await (0, database_port_js_1.safeQuery)(`SELECT * FROM "${schema}".business_units WHERE bu_id = $1 OR id = $1 LIMIT 1`, [buId]);
    return result.rows[0] || null;
}
async function createBusinessUnit(tenantId, payload) {
    const schema = (0, database_port_js_1.tenantSchema)(tenantId);
    const { name_en, name_ar, code, org_id } = payload;
    const result = await (0, database_port_js_1.safeQuery)(`INSERT INTO "${schema}".business_units (name_en, name_ar, code, org_id, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
     RETURNING *`, [name_en, name_ar ?? null, code ?? null, org_id]);
    return result.rows[0];
}
async function updateBusinessUnit(tenantId, buId, payload) {
    const schema = (0, database_port_js_1.tenantSchema)(tenantId);
    const { name_en, name_ar, code, org_id, status } = payload;
    const result = await (0, database_port_js_1.safeQuery)(`UPDATE "${schema}".business_units
     SET name_en = COALESCE($2, name_en),
         name_ar = COALESCE($3, name_ar),
         code = COALESCE($4, code),
         org_id = COALESCE($5, org_id),
         status = COALESCE($6, status),
         updated_at = NOW()
     WHERE bu_id = $1 OR id = $1
     RETURNING *`, [buId, name_en ?? null, name_ar ?? null, code ?? null, org_id ?? null, status ?? null]);
    return result.rows[0] || null;
}
async function deleteBusinessUnit(tenantId, buId) {
    const schema = (0, database_port_js_1.tenantSchema)(tenantId);
    const dependencyResult = await (0, database_port_js_1.safeQuery)(`SELECT COUNT(*) AS count FROM "${schema}".departments WHERE bu_id = $1 AND deleted_at IS NULL`, [buId]);
    const result = await (0, database_port_js_1.safeQuery)(`UPDATE "${schema}".business_units
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE bu_id = $1 OR id = $1
     RETURNING bu_id`, [buId]);
    if (!result.rows[0])
        return { deleted: false, linkedDepartments: 0 };
    const rawCount = dependencyResult.rows[0]?.count;
    const linkedDepartments = Number.isFinite(Number(rawCount)) ? Number(rawCount) : 0;
    return { deleted: true, linkedDepartments };
}
//# sourceMappingURL=business-unit.service.js.map