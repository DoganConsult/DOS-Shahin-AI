"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePermissionFormat = validatePermissionFormat;
exports.getPermissions = getPermissions;
exports.getPermission = getPermission;
exports.createPermission = createPermission;
exports.deactivatePermission = deactivatePermission;
exports.getPermissionsByRole = getPermissionsByRole;
exports.assignPermissionToRole = assignPermissionToRole;
exports.revokePermissionFromRole = revokePermissionFromRole;
/**
 * Permission Service — DAuth canonical permission CRUD
 *
 * Manages the permissions registry and role-permission assignments.
 * Permission codes follow the module.resource.action format.
 *
 * @owner DAuth
 */
const db_1 = require("@dos/db");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
const observability_1 = require("@dos/platform-core/observability");
// ---------------------------------------------------------------------------
// Format validation
// ---------------------------------------------------------------------------
/** Validates module.resource.action format — three dot-separated alphanumeric/underscore segments. */
function validatePermissionFormat(code) {
    return /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(code);
}
// ---------------------------------------------------------------------------
// Permission CRUD
// ---------------------------------------------------------------------------
/** List permissions, optionally filtered by module code. */
async function getPermissions(tenantId, moduleCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const filter = moduleCode ? `AND module_code = $1` : '';
    const params = moduleCode ? [moduleCode] : [];
    const { rows } = await (0, db_1.safeQuery)(`SELECT permission_id, permission_code, name_en, name_ar, module_code, is_system, is_active
     FROM "${schema}".permissions
     WHERE is_active = TRUE ${filter}
     ORDER BY permission_code`, params);
    return rows.map((r) => ({
        permissionId: r.permission_id,
        permissionCode: r.permission_code,
        nameEn: r.name_en,
        nameAr: r.name_ar,
        moduleCode: r.module_code,
        isSystem: r.is_system,
        isActive: r.is_active,
    }));
}
/** Lookup a single permission by code. */
async function getPermission(tenantId, permissionCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT permission_id, permission_code, name_en, name_ar, module_code, is_system, is_active
     FROM "${schema}".permissions
     WHERE permission_code = $1`, [permissionCode]);
    if (rows.length === 0)
        return null;
    const r = rows[0];
    return {
        permissionId: r.permission_id,
        permissionCode: r.permission_code,
        nameEn: r.name_en,
        nameAr: r.name_ar,
        moduleCode: r.module_code,
        isSystem: r.is_system,
        isActive: r.is_active,
    };
}
/** Create a new permission. Validates module.resource.action format. */
async function createPermission(tenantId, input, createdBy) {
    if (!validatePermissionFormat(input.permissionCode)) {
        throw new Error(`Invalid permission code "${input.permissionCode}". Must follow module.resource.action format.`);
    }
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".permissions
       (permission_code, name_en, name_ar, module_code, is_system, is_active, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6, NOW(), NOW())
     RETURNING permission_id, permission_code, name_en, name_ar, module_code, is_system, is_active`, [
        input.permissionCode,
        input.nameEn,
        input.nameAr,
        input.moduleCode,
        input.isSystem ?? false,
        createdBy,
    ]);
    const r = rows[0];
    const permission = {
        permissionId: r.permission_id,
        permissionCode: r.permission_code,
        nameEn: r.name_en,
        nameAr: r.name_ar,
        moduleCode: r.module_code,
        isSystem: r.is_system,
        isActive: r.is_active,
    };
    (0, publish_with_dsoc_1.publish)('dauth.permission.created', tenantId, { permissionCode: permission.permissionCode, createdBy });
    observability_1.logger.info(`Permission created: ${permission.permissionCode} by ${createdBy}`);
    return permission;
}
/** Soft-deactivate a permission. System permissions are protected. */
async function deactivatePermission(tenantId, permissionCode, deactivatedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    // Guard: system permissions cannot be deactivated
    const existing = await getPermission(tenantId, permissionCode);
    if (!existing) {
        throw new Error(`Permission "${permissionCode}" not found.`);
    }
    if (existing.isSystem) {
        throw new Error(`System permission "${permissionCode}" cannot be deactivated.`);
    }
    await (0, db_1.safeQuery)(`UPDATE "${schema}".permissions
     SET is_active = FALSE, updated_at = NOW()
     WHERE permission_code = $1`, [permissionCode]);
    (0, publish_with_dsoc_1.publish)('dauth.permission.deactivated', tenantId, { permissionCode, deactivatedBy });
    observability_1.logger.info(`Permission deactivated: ${permissionCode} by ${deactivatedBy}`);
}
// ---------------------------------------------------------------------------
// Role-permission linking
// ---------------------------------------------------------------------------
/** Get all permissions assigned to a functional role. */
async function getPermissionsByRole(tenantId, roleCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT p.permission_id, p.permission_code, p.name_en, p.name_ar, p.module_code, p.is_system, p.is_active
     FROM "${schema}".role_permissions rp
     JOIN "${schema}".functional_roles fr ON fr.role_id = rp.role_id
     JOIN "${schema}".permissions p ON p.permission_code = rp.permission_code
     WHERE fr.role_code = $1 AND p.is_active = TRUE
     ORDER BY p.permission_code`, [roleCode]);
    return rows.map((r) => ({
        permissionId: r.permission_id,
        permissionCode: r.permission_code,
        nameEn: r.name_en,
        nameAr: r.name_ar,
        moduleCode: r.module_code,
        isSystem: r.is_system,
        isActive: r.is_active,
    }));
}
/** Assign a permission to a functional role. */
async function assignPermissionToRole(tenantId, roleCode, permissionCode, assignedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    // Resolve role_id from role_code
    const { rows: roleRows } = await (0, db_1.safeQuery)(`SELECT role_id FROM "${schema}".functional_roles WHERE role_code = $1 AND is_active = TRUE`, [roleCode]);
    if (roleRows.length === 0) {
        throw new Error(`Functional role "${roleCode}" not found or inactive.`);
    }
    const roleId = roleRows[0].role_id;
    // Verify permission exists and is active
    const permission = await getPermission(tenantId, permissionCode);
    if (!permission || !permission.isActive) {
        throw new Error(`Permission "${permissionCode}" not found or inactive.`);
    }
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".role_permissions (role_id, permission_code)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`, [roleId, permissionCode]);
    (0, publish_with_dsoc_1.publish)('dauth.permission.assigned', tenantId, { roleCode, permissionCode, assignedBy });
    observability_1.logger.info(`Permission ${permissionCode} assigned to role ${roleCode} by ${assignedBy}`);
}
/** Revoke a permission from a functional role. */
async function revokePermissionFromRole(tenantId, roleCode, permissionCode, revokedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows: roleRows } = await (0, db_1.safeQuery)(`SELECT role_id FROM "${schema}".functional_roles WHERE role_code = $1`, [roleCode]);
    if (roleRows.length === 0) {
        throw new Error(`Functional role "${roleCode}" not found.`);
    }
    const roleId = roleRows[0].role_id;
    await (0, db_1.safeQuery)(`DELETE FROM "${schema}".role_permissions WHERE role_id = $1 AND permission_code = $2`, [roleId, permissionCode]);
    (0, publish_with_dsoc_1.publish)('dauth.permission.revoked', tenantId, { roleCode, permissionCode, revokedBy });
    observability_1.logger.info(`Permission ${permissionCode} revoked from role ${roleCode} by ${revokedBy}`);
}
//# sourceMappingURL=permission.service.js.map