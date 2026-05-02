"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshUserPermissions = refreshUserPermissions;
exports.assignUserFromPlatformRole = assignUserFromPlatformRole;
exports.reassignUserOnRoleChange = reassignUserOnRoleChange;
exports.bulkAssignTenantUsers = bulkAssignTenantUsers;
const database_port_1 = require("../../ports/database.port");
const blueprint_port_1 = require("../../ports/blueprint.port");
const foundation_publishers_1 = require("../../infrastructure/messaging/foundation.publishers");
async function refreshUserPermissions(tenantId, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    await (0, database_port_1.safeQuery)(`DELETE FROM "${schema}".effective_user_permissions WHERE user_id = $1`, [userId]);
    await (0, database_port_1.safeQuery)(`DELETE FROM "${schema}".effective_user_modules WHERE user_id = $1`, [userId]);
    const permResult = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".effective_user_permissions (user_id, permission_code)
     SELECT DISTINCT $1, p.code
     FROM "${schema}".enterprise_user_role_assignments eura
     JOIN "${schema}".functional_roles fr ON fr.code = eura.functional_role_code AND fr.is_active = TRUE
     JOIN "${schema}".role_permissions rp ON rp.functional_role_id = fr.id
     JOIN "${schema}".permissions p ON p.id = rp.permission_id
     WHERE eura.user_id = $1 AND eura.is_active = TRUE
     ON CONFLICT DO NOTHING`, [userId]);
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".effective_user_modules (user_id, module_code)
     SELECT DISTINCT $1, fr.module_code
     FROM "${schema}".enterprise_user_role_assignments eura
     JOIN "${schema}".functional_roles fr ON fr.code = eura.functional_role_code AND fr.is_active = TRUE
     WHERE eura.user_id = $1 AND eura.is_active = TRUE
     ON CONFLICT DO NOTHING`, [userId]);
    return permResult.rowCount ?? 0;
}
async function assignUserFromPlatformRole(tenantId, userId, platformRole) {
    const blueprint = await (0, blueprint_port_1.getTenantBlueprint)(tenantId);
    if (!blueprint)
        return { bundles: [], roles: [], permissionsCount: 0 };
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const mappingResult = await (0, database_port_1.safeQuery)(`SELECT bundle_code, access_profile_code
     FROM "${schema}".platform_role_tenant_role_map
     WHERE platform_role = $1 AND is_active = TRUE`, [platformRole]);
    if (mappingResult.rows.length === 0)
        return { bundles: [], roles: [], permissionsCount: 0 };
    const bundles = [];
    const roles = [];
    for (const mapping of mappingResult.rows) {
        bundles.push(mapping.bundle_code);
        await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".user_access_profiles (user_id, access_profile_code)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, mapping.access_profile_code]);
        const bundleItems = await (0, blueprint_port_1.getBundleItems)(tenantId, mapping.bundle_code);
        for (const item of bundleItems) {
            const frResult = await (0, database_port_1.safeQuery)(`SELECT module_code FROM "${schema}".functional_roles WHERE code = $1 AND is_active = TRUE LIMIT 1`, [item.functional_role_code]);
            const moduleCode = frResult.rows[0]?.module_code ?? null;
            const insertResult = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".enterprise_user_role_assignments
           (user_id, functional_role_code, module_code, authority_level, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT DO NOTHING
         RETURNING user_id`, [userId, item.functional_role_code, moduleCode, item.authority_level]);
            roles.push(item.functional_role_code);
            // J-1: emit foundation.role.assigned (the dotted variant) for each
            // newly-assigned (user, role) pair so the OpenFGA tuple-sync
            // subscriber writes role:<tenant>/<role>#assignee@user:<id>.
            // The ON CONFLICT branch returns 0 rows; only emit on real inserts.
            if ((insertResult.rowCount ?? 0) > 0) {
                await (0, foundation_publishers_1.publish)('foundation.role.assigned', {
                    eventType: 'foundation.role.assigned',
                    tenantId,
                    entityId: item.functional_role_code,
                    userId,
                    payload: {
                        tenantId,
                        userId,
                        roleCode: item.functional_role_code,
                        moduleCode,
                        authorityLevel: item.authority_level,
                        platformRole,
                    },
                });
            }
        }
    }
    const permissionsCount = await refreshUserPermissions(tenantId, userId);
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".assignment_resolution_log
       (user_id, platform_role, bundles, roles, permissions_count, resolved_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`, [userId, platformRole, JSON.stringify(bundles), JSON.stringify(roles), permissionsCount]);
    await (0, blueprint_port_1.logPolicyDecision)(tenantId, {
        decision_type: 'user_assignment',
        user_id: userId,
        platform_role: platformRole,
        bundles,
        roles,
        permissions_count: permissionsCount,
    });
    return { bundles, roles, permissionsCount };
}
async function reassignUserOnRoleChange(tenantId, userId, oldRole, newRole) {
    await (0, blueprint_port_1.getTenantBlueprint)(tenantId);
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    // J-1: capture roles being deactivated so we can emit one
    // foundation.role.unassigned event per (user, role) for downstream
    // consumers (governance/audit/privacy/openfga).
    const previouslyActive = await (0, database_port_1.safeQuery)(`SELECT functional_role_code, module_code
       FROM "${schema}".enterprise_user_role_assignments
      WHERE user_id = $1 AND is_active = TRUE`, [userId]);
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".enterprise_user_role_assignments SET is_active = FALSE WHERE user_id = $1`, [userId]);
    for (const row of previouslyActive.rows ?? []) {
        await (0, foundation_publishers_1.publish)('foundation.role.unassigned', {
            eventType: 'foundation.role.unassigned',
            tenantId,
            entityId: row.functional_role_code,
            userId,
            payload: {
                tenantId,
                userId,
                roleCode: row.functional_role_code,
                moduleCode: row.module_code,
                oldRole,
                newRole,
            },
        }).catch(() => undefined);
    }
    await (0, database_port_1.safeQuery)(`DELETE FROM "${schema}".effective_user_permissions WHERE user_id = $1`, [userId]);
    await (0, database_port_1.safeQuery)(`DELETE FROM "${schema}".effective_user_modules WHERE user_id = $1`, [userId]);
    const result = await assignUserFromPlatformRole(tenantId, userId, newRole);
    await (0, blueprint_port_1.logPolicyDecision)(tenantId, {
        decision_type: 'user_reassignment',
        user_id: userId,
        old_role: oldRole,
        new_role: newRole,
        bundles: result.bundles,
        roles: result.roles,
        permissions_count: result.permissionsCount,
    });
    return result;
}
async function bulkAssignTenantUsers(tenantId) {
    await (0, blueprint_port_1.getTenantBlueprint)(tenantId);
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const usersResult = await (0, database_port_1.safeQuery)(`SELECT user_id, role FROM "${schema}".users WHERE is_active = TRUE`);
    for (const user of usersResult.rows) {
        await assignUserFromPlatformRole(tenantId, user.user_id, user.role);
    }
    await (0, blueprint_port_1.logPolicyDecision)(tenantId, {
        decision_type: 'bulk_assignment',
        users_processed: usersResult.rows.length,
    });
    return { usersProcessed: usersResult.rows.length };
}
//# sourceMappingURL=user-assignment.service.js.map