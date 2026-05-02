"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRoleProfiles = listRoleProfiles;
exports.getRoleProfileById = getRoleProfileById;
exports.createRoleProfile = createRoleProfile;
exports.assignProfile = assignProfile;
exports.getUserProfileAssignments = getUserProfileAssignments;
exports.listRoleFunctions = listRoleFunctions;
exports.getRoleFunctionMappings = getRoleFunctionMappings;
exports.getRoleFunctionScopeMap = getRoleFunctionScopeMap;
exports.listFunctionalRoleBundles = listFunctionalRoleBundles;
exports.getBundleItems = getBundleItems;
exports.createBundle = createBundle;
exports.addBundleItem = addBundleItem;
exports.getRoleInheritance = getRoleInheritance;
exports.getRoleDefenseLineMappings = getRoleDefenseLineMappings;
exports.getRoleExperienceProfile = getRoleExperienceProfile;
exports.getRoleLearningState = getRoleLearningState;
exports.getRoleNavSections = getRoleNavSections;
exports.getRoleSlaDefaults = getRoleSlaDefaults;
exports.getRoleTeamMappings = getRoleTeamMappings;
/**
 * DAuth Role Profiles — manages role profiles, assignments, bundles, and functions.
 * Tables: role_profiles, role_profile_assignments, role_functions, role_function_map,
 *         role_function_scope_map, functional_role_bundles, functional_role_bundle_items,
 *         role_permission_inheritance, role_defense_line_mappings, role_experience_profiles,
 *         role_learning_states, role_nav_sections, role_sla_defaults, role_team_mapping
 */
const db_1 = require("@dos/db");
const db_2 = require("@dos/db");
// ── role_profiles ──
async function listRoleProfiles(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".role_profiles WHERE deleted_at IS NULL ORDER BY profile_name`, []);
    return result.rows;
}
async function getRoleProfileById(tenantId, profileId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".role_profiles WHERE profile_id = $1 AND deleted_at IS NULL`, [profileId]);
    return (0, db_2.getFirstRow)(result);
}
async function createRoleProfile(tenantId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".role_profiles (profile_code, profile_name, description, permissions, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`, [data.profile_code, data.profile_name, data.description, JSON.stringify(data.permissions || []), data.created_by]);
    return (0, db_2.getFirstRow)(result);
}
// ── role_profile_assignments ──
async function assignProfile(tenantId, userId, profileId, assignedBy) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".role_profile_assignments (user_id, profile_id, assigned_by, is_active)
     VALUES ($1, $2, $3, TRUE) ON CONFLICT (user_id, profile_id) DO UPDATE SET is_active = TRUE, updated_at = NOW()
     RETURNING *`, [userId, profileId, assignedBy]);
    return (0, db_2.getFirstRow)(result);
}
async function getUserProfileAssignments(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT rpa.*, rp.profile_name, rp.profile_code
     FROM "${schema}".role_profile_assignments rpa
     JOIN "${schema}".role_profiles rp ON rp.profile_id = rpa.profile_id AND rp.deleted_at IS NULL
     WHERE rpa.user_id = $1 AND rpa.is_active = TRUE`, [userId]);
    return result.rows;
}
// ── role_functions & role_function_map ──
async function listRoleFunctions(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".role_functions WHERE is_active = TRUE ORDER BY function_name`, []);
    return result.rows;
}
async function getRoleFunctionMappings(tenantId, roleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT rfm.*, rf.function_name FROM "${schema}".role_function_map rfm
     JOIN "${schema}".role_functions rf ON rf.function_id = rfm.function_id
     WHERE rfm.role_id = $1`, [roleId]);
    return result.rows;
}
async function getRoleFunctionScopeMap(tenantId, roleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".role_function_scope_map WHERE role_id = $1`, [roleId]);
    return result.rows;
}
// ── functional_role_bundles & items ──
async function listFunctionalRoleBundles(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".functional_role_bundles WHERE deleted_at IS NULL ORDER BY bundle_name`, []);
    return result.rows;
}
async function getBundleItems(tenantId, bundleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT frbi.*, fr.role_code, fr.role_name FROM "${schema}".functional_role_bundle_items frbi
     JOIN "${schema}".functional_roles fr ON fr.role_id = frbi.role_id
     WHERE frbi.bundle_id = $1`, [bundleId]);
    return result.rows;
}
async function createBundle(tenantId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".functional_role_bundles (bundle_code, bundle_name, description, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`, [data.bundle_code, data.bundle_name, data.description, data.created_by]);
    return (0, db_2.getFirstRow)(result);
}
async function addBundleItem(tenantId, bundleId, roleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".functional_role_bundle_items (bundle_id, role_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING RETURNING *`, [bundleId, roleId]);
    return (0, db_2.getFirstRow)(result);
}
// ── role_permission_inheritance ──
async function getRoleInheritance(tenantId, roleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".role_permission_inheritance WHERE child_role_id = $1`, [roleId]);
    return result.rows;
}
// ── role_defense_line_mappings ──
async function getRoleDefenseLineMappings(tenantId, roleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".role_defense_line_mappings WHERE role_id = $1`, [roleId]);
    return result.rows;
}
// ── role_experience_profiles ──
async function getRoleExperienceProfile(tenantId, roleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".role_experience_profiles WHERE role_id = $1`, [roleId]);
    return (0, db_2.getFirstRow)(result);
}
// ── role_learning_states ──
async function getRoleLearningState(tenantId, userId, roleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".role_learning_states WHERE user_id = $1 AND role_id = $2`, [userId, roleId]);
    return (0, db_2.getFirstRow)(result);
}
// ── role_nav_sections ──
async function getRoleNavSections(tenantId, roleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".role_nav_sections WHERE role_id = $1 ORDER BY sort_order`, [roleId]);
    return result.rows;
}
// ── role_sla_defaults ──
async function getRoleSlaDefaults(tenantId, roleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".role_sla_defaults WHERE role_id = $1`, [roleId]);
    return result.rows;
}
// ── role_team_mapping ──
async function getRoleTeamMappings(tenantId, roleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".role_team_mapping WHERE role_id = $1`, [roleId]);
    return result.rows;
}
//# sourceMappingURL=role-profiles.service.js.map