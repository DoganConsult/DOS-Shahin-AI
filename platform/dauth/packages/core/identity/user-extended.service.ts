/**
 * DAuth User Extended — manages extended user profile, lifecycle, preferences, and capabilities.
 * Tables: user_lifecycle_events, user_certifications, user_competencies, user_favorites,
 *         user_function_overrides, user_module_permissions, user_notification_preferences,
 *         user_performance, user_preferences_v2, user_responsibilities, user_roles,
 *         user_workflow_permissions, user_availability, user_sessions, person_profiles,
 *         user_profiles_extended, field_rbac_role_mappings
 */
import { safeQuery, tenantSchema } from '@dos/db';
import type { GenericRow } from '@dos/types/db';
import { getFirstRow } from '@dos/db';

// ── user_lifecycle_events ──

export async function logUserLifecycleEvent(
  tenantId: string, userId: string, eventType: string, details: Record<string, unknown> = {},
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".user_lifecycle_events (user_id, event_type, details) VALUES ($1, $2, $3)`,
    [userId, eventType, JSON.stringify(details)],
  );
}

export async function getUserLifecycleEvents(tenantId: string, userId: string, limit = 50): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".user_lifecycle_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit],
  );
  return result.rows;
}

// ── user_certifications ──

export async function getUserCertifications(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".user_certifications WHERE user_id = $1 AND deleted_at IS NULL ORDER BY expiry_date`, [userId]);
  return result.rows;
}

export async function addUserCertification(tenantId: string, userId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".user_certifications (user_id, certification_name, issuer, issue_date, expiry_date, credential_url)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, data.certification_name, data.issuer, data.issue_date, data.expiry_date, data.credential_url],
  );
  return getFirstRow(result);
}

// ── user_competencies ──

export async function getUserCompetencies(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".user_competencies WHERE user_id = $1 ORDER BY proficiency_level DESC`, [userId]);
  return result.rows;
}

export async function upsertUserCompetency(
  tenantId: string, userId: string, competencyCode: string, proficiencyLevel: number,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".user_competencies (user_id, competency_code, proficiency_level)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, competency_code) DO UPDATE SET proficiency_level = $3, updated_at = NOW()
     RETURNING *`,
    [userId, competencyCode, proficiencyLevel],
  );
  return getFirstRow(result);
}

// ── user_favorites ──

export async function getUserFavorites(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".user_favorites WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
  return result.rows;
}

export async function addUserFavorite(tenantId: string, userId: string, entityType: string, entityId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".user_favorites (user_id, entity_type, entity_id) VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING RETURNING *`,
    [userId, entityType, entityId],
  );
  return getFirstRow(result);
}

export async function removeUserFavorite(tenantId: string, userId: string, entityType: string, entityId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".user_favorites WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3 RETURNING favorite_id`,
    [userId, entityType, entityId],
  );
  return (result.rows?.length ?? 0) > 0;
}

// ── user_function_overrides ──

export async function getUserFunctionOverrides(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".user_function_overrides WHERE user_id = $1 AND is_active = TRUE`, [userId]);
  return result.rows;
}

// ── user_module_permissions ──

export async function getUserModulePermissions(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".user_module_permissions WHERE user_id = $1`, [userId]);
  return result.rows;
}

// ── user_notification_preferences ──

export async function getUserNotificationPreferences(tenantId: string, userId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".user_notification_preferences WHERE user_id = $1`, [userId]);
  return getFirstRow(result);
}

export async function upsertNotificationPreferences(tenantId: string, userId: string, prefs: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".user_notification_preferences (user_id, preferences) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET preferences = $2, updated_at = NOW() RETURNING *`,
    [userId, JSON.stringify(prefs)],
  );
  return getFirstRow(result);
}

// ── user_performance ──

export async function getUserPerformanceMetrics(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".user_performance WHERE user_id = $1 ORDER BY period_end DESC`, [userId]);
  return result.rows;
}

// ── user_preferences_v2 ──

export async function getUserPreferencesV2(tenantId: string, userId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".user_preferences_v2 WHERE user_id = $1`, [userId]);
  return getFirstRow(result);
}

export async function upsertUserPreferencesV2(tenantId: string, userId: string, prefs: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".user_preferences_v2 (user_id, preferences) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET preferences = $2, updated_at = NOW() RETURNING *`,
    [userId, JSON.stringify(prefs)],
  );
  return getFirstRow(result);
}

// ── user_responsibilities ──

export async function getUserResponsibilities(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".user_responsibilities WHERE user_id = $1 AND is_active = TRUE`, [userId]);
  return result.rows;
}

// ── user_roles ──

export async function getUserRoles(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT ur.*, r.role_code, r.role_name FROM "${schema}".user_roles ur
     JOIN "${schema}".roles r ON r.role_id = ur.role_id
     WHERE ur.user_id = $1 AND ur.is_active = TRUE`, [userId]);
  return result.rows;
}

// ── user_workflow_permissions ──

export async function getUserWorkflowPermissions(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".user_workflow_permissions WHERE user_id = $1`, [userId]);
  return result.rows;
}

// ── user_sessions ──

export async function getActiveSessions(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".user_sessions WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at DESC`, [userId]);
  return result.rows;
}

export async function terminateSession(tenantId: string, sessionId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".user_sessions SET is_active = FALSE, terminated_at = NOW() WHERE session_id = $1 RETURNING session_id`,
    [sessionId],
  );
  return (result.rows?.length ?? 0) > 0;
}

// ── person_profiles ──

export async function getPersonProfile(tenantId: string, userId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".person_profiles WHERE user_id = $1 AND deleted_at IS NULL`, [userId]);
  return getFirstRow(result);
}

export async function upsertPersonProfile(tenantId: string, userId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".person_profiles (user_id, first_name, last_name, display_name, phone, timezone, language)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       first_name = COALESCE($2, person_profiles.first_name),
       last_name = COALESCE($3, person_profiles.last_name),
       display_name = COALESCE($4, person_profiles.display_name),
       phone = COALESCE($5, person_profiles.phone),
       timezone = COALESCE($6, person_profiles.timezone),
       language = COALESCE($7, person_profiles.language),
       updated_at = NOW()
     RETURNING *`,
    [userId, data.first_name, data.last_name, data.display_name, data.phone, data.timezone, data.language],
  );
  return getFirstRow(result);
}

// ── user_profiles_extended ──

export async function getUserProfileExtended(tenantId: string, userId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".user_profiles_extended WHERE user_id = $1 AND deleted_at IS NULL`, [userId]);
  return getFirstRow(result);
}

export async function upsertUserProfileExtended(tenantId: string, userId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".user_profiles_extended (user_id, bio, avatar_url, department, job_title, location, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       bio = COALESCE($2, user_profiles_extended.bio),
       avatar_url = COALESCE($3, user_profiles_extended.avatar_url),
       department = COALESCE($4, user_profiles_extended.department),
       job_title = COALESCE($5, user_profiles_extended.job_title),
       location = COALESCE($6, user_profiles_extended.location),
       metadata = COALESCE($7, user_profiles_extended.metadata),
       updated_at = NOW()
     RETURNING *`,
    [userId, data.bio, data.avatar_url, data.department, data.job_title, data.location, JSON.stringify(data.metadata || {})],
  );
  return getFirstRow(result);
}

// ── field_rbac_role_mappings ──

export async function getFieldRbacRoleMappings(tenantId: string, roleId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".field_rbac_role_mappings WHERE role_id = $1 AND is_active = TRUE`, [roleId]);
  return result.rows;
}

export async function upsertFieldRbacRoleMapping(
  tenantId: string, roleId: string, entityType: string, fieldName: string, accessLevel: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".field_rbac_role_mappings (role_id, entity_type, field_name, access_level, is_active)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (role_id, entity_type, field_name) DO UPDATE SET access_level = $4, updated_at = NOW()
     RETURNING *`,
    [roleId, entityType, fieldName, accessLevel],
  );
  return getFirstRow(result);
}
