"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logUserLifecycleEvent = logUserLifecycleEvent;
exports.getUserLifecycleEvents = getUserLifecycleEvents;
exports.getUserCertifications = getUserCertifications;
exports.addUserCertification = addUserCertification;
exports.getUserCompetencies = getUserCompetencies;
exports.upsertUserCompetency = upsertUserCompetency;
exports.getUserFavorites = getUserFavorites;
exports.addUserFavorite = addUserFavorite;
exports.removeUserFavorite = removeUserFavorite;
exports.getUserFunctionOverrides = getUserFunctionOverrides;
exports.getUserModulePermissions = getUserModulePermissions;
exports.getUserNotificationPreferences = getUserNotificationPreferences;
exports.upsertNotificationPreferences = upsertNotificationPreferences;
exports.getUserPerformanceMetrics = getUserPerformanceMetrics;
exports.getUserPreferencesV2 = getUserPreferencesV2;
exports.upsertUserPreferencesV2 = upsertUserPreferencesV2;
exports.getUserResponsibilities = getUserResponsibilities;
exports.getUserRoles = getUserRoles;
exports.getUserWorkflowPermissions = getUserWorkflowPermissions;
exports.getActiveSessions = getActiveSessions;
exports.terminateSession = terminateSession;
exports.getPersonProfile = getPersonProfile;
exports.upsertPersonProfile = upsertPersonProfile;
exports.getUserProfileExtended = getUserProfileExtended;
exports.upsertUserProfileExtended = upsertUserProfileExtended;
exports.getFieldRbacRoleMappings = getFieldRbacRoleMappings;
exports.upsertFieldRbacRoleMapping = upsertFieldRbacRoleMapping;
/**
 * DAuth User Extended — manages extended user profile, lifecycle, preferences, and capabilities.
 * Tables: user_lifecycle_events, user_certifications, user_competencies, user_favorites,
 *         user_function_overrides, user_module_permissions, user_notification_preferences,
 *         user_performance, user_preferences_v2, user_responsibilities, user_roles,
 *         user_workflow_permissions, user_availability, user_sessions, person_profiles,
 *         user_profiles_extended, field_rbac_role_mappings
 */
const db_1 = require("@dos/db");
const db_2 = require("@dos/db");
// ── user_lifecycle_events ──
async function logUserLifecycleEvent(tenantId, userId, eventType, details = {}) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".user_lifecycle_events (user_id, event_type, details) VALUES ($1, $2, $3)`, [userId, eventType, JSON.stringify(details)]);
}
async function getUserLifecycleEvents(tenantId, userId, limit = 50) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_lifecycle_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, limit]);
    return result.rows;
}
// ── user_certifications ──
async function getUserCertifications(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_certifications WHERE user_id = $1 AND deleted_at IS NULL ORDER BY expiry_date`, [userId]);
    return result.rows;
}
async function addUserCertification(tenantId, userId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".user_certifications (user_id, certification_name, issuer, issue_date, expiry_date, credential_url)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [userId, data.certification_name, data.issuer, data.issue_date, data.expiry_date, data.credential_url]);
    return (0, db_2.getFirstRow)(result);
}
// ── user_competencies ──
async function getUserCompetencies(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_competencies WHERE user_id = $1 ORDER BY proficiency_level DESC`, [userId]);
    return result.rows;
}
async function upsertUserCompetency(tenantId, userId, competencyCode, proficiencyLevel) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".user_competencies (user_id, competency_code, proficiency_level)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, competency_code) DO UPDATE SET proficiency_level = $3, updated_at = NOW()
     RETURNING *`, [userId, competencyCode, proficiencyLevel]);
    return (0, db_2.getFirstRow)(result);
}
// ── user_favorites ──
async function getUserFavorites(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_favorites WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
    return result.rows;
}
async function addUserFavorite(tenantId, userId, entityType, entityId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".user_favorites (user_id, entity_type, entity_id) VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING RETURNING *`, [userId, entityType, entityId]);
    return (0, db_2.getFirstRow)(result);
}
async function removeUserFavorite(tenantId, userId, entityType, entityId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`DELETE FROM "${schema}".user_favorites WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3 RETURNING favorite_id`, [userId, entityType, entityId]);
    return (result.rows?.length ?? 0) > 0;
}
// ── user_function_overrides ──
async function getUserFunctionOverrides(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_function_overrides WHERE user_id = $1 AND is_active = TRUE`, [userId]);
    return result.rows;
}
// ── user_module_permissions ──
async function getUserModulePermissions(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_module_permissions WHERE user_id = $1`, [userId]);
    return result.rows;
}
// ── user_notification_preferences ──
async function getUserNotificationPreferences(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_notification_preferences WHERE user_id = $1`, [userId]);
    return (0, db_2.getFirstRow)(result);
}
async function upsertNotificationPreferences(tenantId, userId, prefs) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".user_notification_preferences (user_id, preferences) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET preferences = $2, updated_at = NOW() RETURNING *`, [userId, JSON.stringify(prefs)]);
    return (0, db_2.getFirstRow)(result);
}
// ── user_performance ──
async function getUserPerformanceMetrics(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_performance WHERE user_id = $1 ORDER BY period_end DESC`, [userId]);
    return result.rows;
}
// ── user_preferences_v2 ──
async function getUserPreferencesV2(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_preferences_v2 WHERE user_id = $1`, [userId]);
    return (0, db_2.getFirstRow)(result);
}
async function upsertUserPreferencesV2(tenantId, userId, prefs) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".user_preferences_v2 (user_id, preferences) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET preferences = $2, updated_at = NOW() RETURNING *`, [userId, JSON.stringify(prefs)]);
    return (0, db_2.getFirstRow)(result);
}
// ── user_responsibilities ──
async function getUserResponsibilities(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_responsibilities WHERE user_id = $1 AND is_active = TRUE`, [userId]);
    return result.rows;
}
// ── user_roles ──
async function getUserRoles(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT ur.*, r.role_code, r.role_name FROM "${schema}".user_roles ur
     JOIN "${schema}".roles r ON r.role_id = ur.role_id
     WHERE ur.user_id = $1 AND ur.is_active = TRUE`, [userId]);
    return result.rows;
}
// ── user_workflow_permissions ──
async function getUserWorkflowPermissions(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_workflow_permissions WHERE user_id = $1`, [userId]);
    return result.rows;
}
// ── user_sessions ──
async function getActiveSessions(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_sessions WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at DESC`, [userId]);
    return result.rows;
}
async function terminateSession(tenantId, sessionId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`UPDATE "${schema}".user_sessions SET is_active = FALSE, terminated_at = NOW() WHERE session_id = $1 RETURNING session_id`, [sessionId]);
    return (result.rows?.length ?? 0) > 0;
}
// ── person_profiles ──
async function getPersonProfile(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".person_profiles WHERE user_id = $1 AND deleted_at IS NULL`, [userId]);
    return (0, db_2.getFirstRow)(result);
}
async function upsertPersonProfile(tenantId, userId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".person_profiles (user_id, first_name, last_name, display_name, phone, timezone, language)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       first_name = COALESCE($2, person_profiles.first_name),
       last_name = COALESCE($3, person_profiles.last_name),
       display_name = COALESCE($4, person_profiles.display_name),
       phone = COALESCE($5, person_profiles.phone),
       timezone = COALESCE($6, person_profiles.timezone),
       language = COALESCE($7, person_profiles.language),
       updated_at = NOW()
     RETURNING *`, [userId, data.first_name, data.last_name, data.display_name, data.phone, data.timezone, data.language]);
    return (0, db_2.getFirstRow)(result);
}
// ── user_profiles_extended ──
async function getUserProfileExtended(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_profiles_extended WHERE user_id = $1 AND deleted_at IS NULL`, [userId]);
    return (0, db_2.getFirstRow)(result);
}
async function upsertUserProfileExtended(tenantId, userId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".user_profiles_extended (user_id, bio, avatar_url, department, job_title, location, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       bio = COALESCE($2, user_profiles_extended.bio),
       avatar_url = COALESCE($3, user_profiles_extended.avatar_url),
       department = COALESCE($4, user_profiles_extended.department),
       job_title = COALESCE($5, user_profiles_extended.job_title),
       location = COALESCE($6, user_profiles_extended.location),
       metadata = COALESCE($7, user_profiles_extended.metadata),
       updated_at = NOW()
     RETURNING *`, [userId, data.bio, data.avatar_url, data.department, data.job_title, data.location, JSON.stringify(data.metadata || {})]);
    return (0, db_2.getFirstRow)(result);
}
// ── field_rbac_role_mappings ──
async function getFieldRbacRoleMappings(tenantId, roleId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".field_rbac_role_mappings WHERE role_id = $1 AND is_active = TRUE`, [roleId]);
    return result.rows;
}
async function upsertFieldRbacRoleMapping(tenantId, roleId, entityType, fieldName, accessLevel) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".field_rbac_role_mappings (role_id, entity_type, field_name, access_level, is_active)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (role_id, entity_type, field_name) DO UPDATE SET access_level = $4, updated_at = NOW()
     RETURNING *`, [roleId, entityType, fieldName, accessLevel]);
    return (0, db_2.getFirstRow)(result);
}
//# sourceMappingURL=user-extended.service.js.map