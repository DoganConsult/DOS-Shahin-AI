"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccessProfiles = getAccessProfiles;
exports.getAccessProfile = getAccessProfile;
exports.assignAccessProfile = assignAccessProfile;
exports.revokeAccessProfile = revokeAccessProfile;
exports.getUserAccessProfiles = getUserAccessProfiles;
const db_1 = require("@dos/db");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
async function getAccessProfiles(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT profile_code, name_en, name_ar, is_system, is_active,
            default_landing_page, allowed_modules
     FROM "${schema}".access_profiles
     WHERE is_active = TRUE ORDER BY profile_code`, []);
    return rows.map((r) => ({
        profileCode: r.profile_code,
        nameEn: r.name_en ?? '',
        nameAr: r.name_ar ?? '',
        isSystem: r.is_system === true,
        isActive: r.is_active === true,
        defaultLandingPage: r.default_landing_page ?? '/workspace-home',
        allowedModules: r.allowed_modules ?? [],
    }));
}
async function getAccessProfile(tenantId, profileCode) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT profile_code, name_en, name_ar, is_system, is_active,
            default_landing_page, allowed_modules
     FROM "${schema}".access_profiles
     WHERE profile_code = $1 LIMIT 1`, [profileCode]);
    if (!rows[0])
        return null;
    const r = rows[0];
    return {
        profileCode: r.profile_code,
        nameEn: r.name_en ?? '',
        nameAr: r.name_ar ?? '',
        isSystem: r.is_system === true,
        isActive: r.is_active === true,
        defaultLandingPage: r.default_landing_page ?? '/workspace-home',
        allowedModules: r.allowed_modules ?? [],
    };
}
async function assignAccessProfile(tenantId, userId, profileCode, assignedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".user_access_profiles (user_id, access_profile_code, is_active, created_by)
     VALUES ($1, $2, TRUE, $3)
     ON CONFLICT (user_id, access_profile_code) DO UPDATE SET is_active = TRUE, updated_at = NOW()`, [userId, profileCode, assignedBy]);
    await (0, publish_with_dsoc_1.publish)('dauth.access_profile.assigned', tenantId, { userId, profileCode, assignedBy });
}
async function revokeAccessProfile(tenantId, userId, profileCode, revokedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`UPDATE "${schema}".user_access_profiles SET is_active = FALSE, updated_at = NOW()
     WHERE user_id = $1 AND access_profile_code = $2`, [userId, profileCode]);
    await (0, publish_with_dsoc_1.publish)('dauth.access_profile.revoked', tenantId, { userId, profileCode, revokedBy });
}
async function getUserAccessProfiles(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT access_profile_code FROM "${schema}".user_access_profiles
     WHERE user_id = $1 AND is_active = TRUE`, [userId]);
    return rows.map((r) => r.access_profile_code);
}
//# sourceMappingURL=access-profile.service.js.map