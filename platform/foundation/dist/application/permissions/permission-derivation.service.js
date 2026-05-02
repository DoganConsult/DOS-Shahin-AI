"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveUserPermissions = deriveUserPermissions;
exports.deriveVisibleModules = deriveVisibleModules;
exports.deriveNavigation = deriveNavigation;
exports.userHasPermission = userHasPermission;
const database_port_1 = require("../../ports/database.port");
const blueprint_port_1 = require("../../ports/blueprint.port");
const platform_port_1 = require("../../ports/platform.port");
const AUTHORITY_RANK = {
    view: 1,
    submit: 2,
    review: 3,
    approve_low: 4,
    approve_medium: 5,
    approve_high: 6,
    approve: 7,
    manage: 8,
    super_admin: 9,
};
const ROLE_LANDING_PAGE = {
    risk_manager: '/risk/register',
    compliance_officer: '/compliance/overview',
    audit_lead: '/audit/overview',
    admin: '/admin-hub',
};
const MODULE_WIDGETS = {
    risk: 'risk_heatmap',
    compliance: 'compliance_posture',
    audit: 'audit_pipeline',
    incident: 'incident_timeline',
};
async function deriveUserPermissions(tenantId, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const userResult = await (0, database_port_1.safeQuery)(`SELECT role FROM "${schema}".users WHERE id = $1 LIMIT 1`, [userId]);
    const platformRole = userResult.rows[0]?.role ?? 'user';
    const profileResult = await (0, database_port_1.safeQuery)(`SELECT access_profile_code FROM "${schema}".user_access_profiles WHERE user_id = $1 LIMIT 1`, [userId]);
    const accessProfileCode = profileResult.rows[0]?.access_profile_code ?? null;
    const assignmentsResult = await (0, database_port_1.safeQuery)(`SELECT functional_role_code, module_code, authority_level
     FROM "${schema}".enterprise_user_role_assignments
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY functional_role_code`, [userId]);
    const functionalRoles = [];
    const moduleCodes = new Set();
    const authorityLevels = {};
    for (const row of assignmentsResult.rows) {
        if (!functionalRoles.includes(row.functional_role_code)) {
            functionalRoles.push(row.functional_role_code);
        }
        if (row.module_code)
            moduleCodes.add(row.module_code);
        const existing = authorityLevels[row.functional_role_code];
        const existingRank = existing ? (AUTHORITY_RANK[existing] ?? 0) : 0;
        const newRank = AUTHORITY_RANK[row.authority_level] ?? 0;
        if (newRank > existingRank) {
            authorityLevels[row.functional_role_code] = row.authority_level;
        }
    }
    const bundleResult = await (0, database_port_1.safeQuery)(`SELECT bundle_code FROM "${schema}".platform_role_tenant_role_map WHERE platform_role = $1 AND is_active = TRUE`, [platformRole]);
    const bundles = bundleResult.rows.map((r) => r.bundle_code);
    let permissions = [];
    const permResult = await (0, database_port_1.safeQuery)(`SELECT DISTINCT p.code AS permission_code
     FROM "${schema}".enterprise_user_role_assignments eura
     JOIN "${schema}".functional_roles fr ON fr.code = eura.functional_role_code AND fr.is_active = TRUE
     JOIN "${schema}".role_permissions rp ON rp.functional_role_id = fr.id
     JOIN "${schema}".permissions p ON p.id = rp.permission_id
     WHERE eura.user_id = $1 AND eura.is_active = TRUE`, [userId]);
    permissions = permResult.rows.map((r) => r.permission_code);
    if (accessProfileCode === 'platform_super_admin') {
        const allPermsResult = await (0, database_port_1.safeQuery)(`SELECT code, module_code FROM "${schema}".permissions WHERE is_active = TRUE`);
        permissions = allPermsResult.rows.map((r) => r.code);
        for (const row of allPermsResult.rows) {
            if (row.module_code)
                moduleCodes.add(row.module_code);
        }
    }
    return {
        user_id: userId,
        platform_role: platformRole,
        access_profile_code: accessProfileCode,
        bundles: bundles,
        functional_roles: functionalRoles,
        permissions,
        module_codes: [...moduleCodes],
        authority_levels: authorityLevels,
    };
}
async function deriveVisibleModules(tenantId, userId) {
    const chain = await deriveUserPermissions(tenantId, userId);
    const activeModules = await (0, platform_port_1.getActiveModuleCodes)(tenantId);
    const visible = chain.module_codes.filter((m) => activeModules.includes(m));
    await (0, blueprint_port_1.logPolicyDecision)(tenantId, {
        decision_type: 'visible_modules',
        user_id: userId,
        user_modules: chain.module_codes,
        active_modules: activeModules,
        visible,
    });
    return visible;
}
async function deriveNavigation(tenantId, userId) {
    const visibleModules = await deriveVisibleModules(tenantId, userId);
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const roleResult = await (0, database_port_1.safeQuery)(`SELECT role FROM "${schema}".users WHERE id = $1 LIMIT 1`, [userId]);
    const role = roleResult.rows[0]?.role ?? 'user';
    const landingPage = ROLE_LANDING_PAGE[role] ?? (visibleModules.length > 0 ? `/${visibleModules[0]}/overview` : '/dashboard');
    const dashboardWidgets = visibleModules
        .map((m) => MODULE_WIDGETS[m])
        .filter(Boolean);
    return {
        visible_modules: visibleModules,
        landing_page: landingPage,
        dashboard_widgets: dashboardWidgets,
    };
}
async function userHasPermission(tenantId, userId, permissionCode) {
    const chain = await deriveUserPermissions(tenantId, userId);
    return chain.permissions.includes(permissionCode);
}
//# sourceMappingURL=permission-derivation.service.js.map