"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFunctionalRoles = getFunctionalRoles;
exports.getFunctionalRole = getFunctionalRole;
exports.createFunctionalRole = createFunctionalRole;
exports.deactivateFunctionalRole = deactivateFunctionalRole;
exports.getRolePermissions = getRolePermissions;
const db_1 = require("@dos/db");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
async function getFunctionalRoles(tenantId, moduleCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const filter = moduleCode ? `AND (module_code = $1 OR module_code IS NULL)` : '';
    const params = moduleCode ? [moduleCode] : [];
    const { rows } = await (0, db_1.safeQuery)(`SELECT role_id, role_code, name_en, name_ar, module_code, is_system, is_active
     FROM "${schema}".functional_roles
     WHERE is_active = TRUE ${filter}
     ORDER BY role_code`, params);
    return rows.map((r) => ({
        roleId: r.role_id,
        roleCode: r.role_code,
        nameEn: r.name_en,
        nameAr: r.name_ar,
        moduleCode: r.module_code,
        isSystem: r.is_system === true,
        isActive: r.is_active === true,
    }));
}
async function getFunctionalRole(tenantId, roleCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT role_id, role_code, name_en, name_ar, module_code, is_system, is_active
     FROM "${schema}".functional_roles
     WHERE role_code = $1 LIMIT 1`, [roleCode]);
    const r = rows[0];
    if (!r)
        return null;
    return {
        roleId: r.role_id,
        roleCode: r.role_code,
        nameEn: r.name_en,
        nameAr: r.name_ar,
        moduleCode: r.module_code,
        isSystem: r.is_system === true,
        isActive: r.is_active === true,
    };
}
async function createFunctionalRole(tenantId, role, createdBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".functional_roles (role_code, name_en, name_ar, module_code, is_system, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6)
     RETURNING role_id`, [role.roleCode, role.nameEn, role.nameAr, role.moduleCode, role.isSystem, createdBy]);
    await (0, publish_with_dsoc_1.publish)('dauth.role.created', tenantId, { roleCode: role.roleCode, createdBy });
    return { ...role, roleId: rows[0].role_id, isActive: true };
}
async function deactivateFunctionalRole(tenantId, roleCode, deactivatedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`UPDATE "${schema}".functional_roles SET is_active = FALSE, updated_at = NOW()
     WHERE role_code = $1 AND is_system = FALSE`, [roleCode]);
    if ((result.rowCount ?? 0) > 0) {
        await (0, publish_with_dsoc_1.publish)('dauth.role.deactivated', tenantId, { roleCode, deactivatedBy });
        return true;
    }
    return false;
}
async function getRolePermissions(tenantId, roleCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT rp.permission_code FROM "${schema}".role_permissions rp
     JOIN "${schema}".functional_roles fr ON fr.role_id = rp.role_id
     WHERE fr.role_code = $1 AND fr.is_active = TRUE`, [roleCode]);
    return rows.map((r) => r.permission_code);
}
//# sourceMappingURL=functional-role.service.js.map