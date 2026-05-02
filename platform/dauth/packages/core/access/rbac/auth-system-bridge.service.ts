/**
 * Authorization System Bridge — Migration 030 ↔ Migration 163 reconciliation
 *
 * This bridge service unifies the two parallel authorization systems:
 * - Migration 030/031: `roles`, `role_functions`, `role_function_permissions` (legacy canonical)
 * - Migration 163/164: `functional_roles`, `role_permissions`, `permissions` (enterprise model)
 *
 * Until full consolidation (planned Phase 7), this bridge:
 * 1. Reads from the enterprise model (163) as primary
 * 2. Falls back to legacy model (030) if enterprise data is missing
 * 3. Provides a unified API for all consumers
 *
 * Law 1: Single source of truth — this bridge IS the canonical access point
 * Law 2: DAuth owns auth — no external services should query raw tables
 *
 * @owner DAuth
 */
import { safeQuery, tenantSchema, getDbLogger } from '@dos/db';

const logger = getDbLogger();

export interface UnifiedRole {
  roleCode: string;
  nameEn: string;
  source: 'enterprise' | 'legacy';
  isSystem: boolean;
  isActive: boolean;
}

export interface UnifiedPermission {
  permissionCode: string;
  nameEn: string;
  moduleCode: string;
  source: 'enterprise' | 'legacy';
}

/**
 * Get all roles for a user, merging enterprise (163) and legacy (030) systems.
 * Enterprise roles take precedence.
 */
export async function getUnifiedUserRoles(tenantId: string, userId: string): Promise<UnifiedRole[]> {
  const schema = tenantSchema(tenantId);
  const roles: UnifiedRole[] = [];
  const seenCodes = new Set<string>();

  // 1. Enterprise model (Migration 163) — PRIMARY
  try {
    const { rows: enterpriseRows } = await safeQuery(
      `SELECT fr.role_code, fr.name_en, fr.is_system, fr.is_active
       FROM "${schema}".enterprise_user_role_assignments eura
       JOIN "${schema}".functional_roles fr ON fr.role_id = eura.role_id
       WHERE eura.user_id = $1 AND fr.is_active = TRUE
         AND (eura.valid_until IS NULL OR eura.valid_until > NOW())`,
      [userId],
    );
    for (const r of enterpriseRows as Array<{ role_code: string; name_en: string; is_system: boolean; is_active: boolean }>) {
      roles.push({ roleCode: r.role_code, nameEn: r.name_en, source: 'enterprise', isSystem: r.is_system, isActive: r.is_active });
      seenCodes.add(r.role_code);
    }
  } catch (err) {
    logger.warn(`[AuthBridge] Enterprise role lookup failed for user ${userId}: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Legacy model (Migration 030) — FALLBACK for roles not in enterprise system
  try {
    const { rows: legacyRows } = await safeQuery(
      `SELECT r.role_code, r.name_en, r.is_system, r.is_active
       FROM "${schema}".user_role_assignments ura
       JOIN "${schema}".roles r ON r.role_id = ura.role_id
       WHERE ura.user_id = $1 AND r.is_active = TRUE
         AND (ura.valid_until IS NULL OR ura.valid_until > NOW())`,
      [userId],
    );
    for (const r of legacyRows as Array<{ role_code: string; name_en: string; is_system: boolean; is_active: boolean }>) {
      if (!seenCodes.has(r.role_code)) {
        roles.push({ roleCode: r.role_code, nameEn: r.name_en, source: 'legacy', isSystem: r.is_system, isActive: r.is_active });
        seenCodes.add(r.role_code);
      }
    }
  } catch (err) {
    logger.warn(`[AuthBridge] Legacy role lookup failed for user ${userId}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return roles;
}

/**
 * Get all effective permissions for a user, merging both systems.
 * Enterprise permissions take precedence.
 */
export async function getUnifiedUserPermissions(tenantId: string, userId: string): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const permSet = new Set<string>();

  // 1. Enterprise model — PRIMARY
  try {
    const { rows } = await safeQuery(
      `SELECT DISTINCT p.permission_code
       FROM "${schema}".enterprise_user_role_assignments eura
       JOIN "${schema}".role_permissions rp ON rp.role_id = eura.role_id
       JOIN "${schema}".permissions p ON p.permission_code = rp.permission_code
       WHERE eura.user_id = $1 AND p.is_active = TRUE
         AND (eura.valid_until IS NULL OR eura.valid_until > NOW())`,
      [userId],
    );
    for (const r of rows) permSet.add(r.permission_code);
  } catch (err) {
    logger.warn(`[AuthBridge] Enterprise permission lookup failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Legacy model — FALLBACK
  try {
    const { rows } = await safeQuery(
      `SELECT DISTINCT rfp.permission_code
       FROM "${schema}".user_role_assignments ura
       JOIN "${schema}".role_function_permissions rfp ON rfp.role_id = ura.role_id
       WHERE ura.user_id = $1
         AND (ura.valid_until IS NULL OR ura.valid_until > NOW())`,
      [userId],
    );
    for (const r of rows) permSet.add(r.permission_code);
  } catch (err) {
    logger.warn(`[AuthBridge] Legacy permission lookup failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return Array.from(permSet).sort();
}

/**
 * Get diagnostic report showing which system each role comes from.
 * Useful for tracking migration progress from 030 → 163.
 */
export async function getAuthSystemDiagnostics(tenantId: string): Promise<{
  enterpriseRoleCount: number;
  legacyRoleCount: number;
  enterprisePermissionCount: number;
  legacyPermissionCount: number;
  bridgeStatus: 'enterprise_primary' | 'dual_active' | 'legacy_only';
}> {
  const schema = tenantSchema(tenantId);

  let enterpriseRoles = 0;
  let legacyRoles = 0;
  let enterprisePerms = 0;
  let legacyPerms = 0;

  try {
    const { rows: er } = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".functional_roles WHERE is_active = TRUE`);
    enterpriseRoles = (er[0] as { cnt?: number })?.cnt ?? 0;
  } catch { /* table may not exist */ }

  try {
    const { rows: lr } = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".roles WHERE is_active = TRUE`);
    legacyRoles = (lr[0] as { cnt?: number })?.cnt ?? 0;
  } catch { /* table may not exist */ }

  try {
    const { rows: ep } = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".permissions WHERE is_active = TRUE`);
    enterprisePerms = (ep[0] as { cnt?: number })?.cnt ?? 0;
  } catch { /* table may not exist */ }

  try {
    const { rows: lp } = await safeQuery(`SELECT COUNT(DISTINCT permission_code)::int AS cnt FROM "${schema}".role_function_permissions`);
    legacyPerms = (lp[0] as { cnt?: number })?.cnt ?? 0;
  } catch { /* table may not exist */ }

  const status = enterpriseRoles > 0 && legacyRoles > 0
    ? 'dual_active'
    : enterpriseRoles > 0 ? 'enterprise_primary' : 'legacy_only';

  return { enterpriseRoleCount: enterpriseRoles, legacyRoleCount: legacyRoles, enterprisePermissionCount: enterprisePerms, legacyPermissionCount: legacyPerms, bridgeStatus: status };
}
