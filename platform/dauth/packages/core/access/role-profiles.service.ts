/**
 * DAuth Role Profiles — manages role profiles, assignments, bundles, and functions.
 * Tables: role_profiles, role_profile_assignments, role_functions, role_function_map,
 *         role_function_scope_map, functional_role_bundles, functional_role_bundle_items,
 *         role_permission_inheritance, role_defense_line_mappings, role_experience_profiles,
 *         role_learning_states, role_nav_sections, role_sla_defaults, role_team_mapping
 */
import { safeQuery, tenantSchema } from '@dos/db';
import type { GenericRow } from '@dos/types/db';
import { getFirstRow } from '@dos/db';

// ── role_profiles ──

export async function listRoleProfiles(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".role_profiles WHERE deleted_at IS NULL ORDER BY profile_name`, []);
  return result.rows;
}

export async function getRoleProfileById(tenantId: string, profileId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".role_profiles WHERE profile_id = $1 AND deleted_at IS NULL`, [profileId]);
  return getFirstRow(result);
}

export async function createRoleProfile(tenantId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".role_profiles (profile_code, profile_name, description, permissions, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.profile_code, data.profile_name, data.description, JSON.stringify(data.permissions || []), data.created_by],
  );
  return getFirstRow(result);
}

// ── role_profile_assignments ──

export async function assignProfile(tenantId: string, userId: string, profileId: string, assignedBy: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".role_profile_assignments (user_id, profile_id, assigned_by, is_active)
     VALUES ($1, $2, $3, TRUE) ON CONFLICT (user_id, profile_id) DO UPDATE SET is_active = TRUE, updated_at = NOW()
     RETURNING *`,
    [userId, profileId, assignedBy],
  );
  return getFirstRow(result);
}

export async function getUserProfileAssignments(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT rpa.*, rp.profile_name, rp.profile_code
     FROM "${schema}".role_profile_assignments rpa
     JOIN "${schema}".role_profiles rp ON rp.profile_id = rpa.profile_id AND rp.deleted_at IS NULL
     WHERE rpa.user_id = $1 AND rpa.is_active = TRUE`, [userId]);
  return result.rows;
}

// ── role_functions & role_function_map ──

export async function listRoleFunctions(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".role_functions WHERE is_active = TRUE ORDER BY function_name`, []);
  return result.rows;
}

export async function getRoleFunctionMappings(tenantId: string, roleId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT rfm.*, rf.function_name FROM "${schema}".role_function_map rfm
     JOIN "${schema}".role_functions rf ON rf.function_id = rfm.function_id
     WHERE rfm.role_id = $1`, [roleId]);
  return result.rows;
}

export async function getRoleFunctionScopeMap(tenantId: string, roleId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".role_function_scope_map WHERE role_id = $1`, [roleId]);
  return result.rows;
}

// ── functional_role_bundles & items ──

export async function listFunctionalRoleBundles(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".functional_role_bundles WHERE deleted_at IS NULL ORDER BY bundle_name`, []);
  return result.rows;
}

export async function getBundleItems(tenantId: string, bundleId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT frbi.*, fr.role_code, fr.role_name FROM "${schema}".functional_role_bundle_items frbi
     JOIN "${schema}".functional_roles fr ON fr.role_id = frbi.role_id
     WHERE frbi.bundle_id = $1`, [bundleId]);
  return result.rows;
}

export async function createBundle(tenantId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".functional_role_bundles (bundle_code, bundle_name, description, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.bundle_code, data.bundle_name, data.description, data.created_by],
  );
  return getFirstRow(result);
}

export async function addBundleItem(tenantId: string, bundleId: string, roleId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".functional_role_bundle_items (bundle_id, role_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING RETURNING *`,
    [bundleId, roleId],
  );
  return getFirstRow(result);
}

// ── role_permission_inheritance ──

export async function getRoleInheritance(tenantId: string, roleId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".role_permission_inheritance WHERE child_role_id = $1`, [roleId]);
  return result.rows;
}

// ── role_defense_line_mappings ──

export async function getRoleDefenseLineMappings(tenantId: string, roleId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".role_defense_line_mappings WHERE role_id = $1`, [roleId]);
  return result.rows;
}

// ── role_experience_profiles ──

export async function getRoleExperienceProfile(tenantId: string, roleId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".role_experience_profiles WHERE role_id = $1`, [roleId]);
  return getFirstRow(result);
}

// ── role_learning_states ──

export async function getRoleLearningState(tenantId: string, userId: string, roleId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".role_learning_states WHERE user_id = $1 AND role_id = $2`, [userId, roleId]);
  return getFirstRow(result);
}

// ── role_nav_sections ──

export async function getRoleNavSections(tenantId: string, roleId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".role_nav_sections WHERE role_id = $1 ORDER BY sort_order`, [roleId]);
  return result.rows;
}

// ── role_sla_defaults ──

export async function getRoleSlaDefaults(tenantId: string, roleId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".role_sla_defaults WHERE role_id = $1`, [roleId]);
  return result.rows;
}

// ── role_team_mapping ──

export async function getRoleTeamMappings(tenantId: string, roleId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".role_team_mapping WHERE role_id = $1`, [roleId]);
  return result.rows;
}
