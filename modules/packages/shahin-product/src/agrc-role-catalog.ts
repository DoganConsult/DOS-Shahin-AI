// @ts-nocheck — module-layer imports not yet extracted
/**
 * Shahin — AGRC Role & Permission Catalog
 *
 * Law 2: Security is data-driven. Role/permission data lives in DB tables
 * (functional_roles, permissions, role_permissions), not static TypeScript maps.
 *
 * This file provides runtime helpers that read from DB via AccessResolver.
 * It does NOT contain static permission grants.
 */

import { safeQuery, tenantSchema } from '@dos/db';

/** Get all known role codes for a tenant from DB. */
export async function getRoleCodes(tenantId: string): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT code FROM "${schema}".functional_roles WHERE is_active = TRUE ORDER BY code`,
  );
  return res.rows.map(( r: Record<string, unknown>) => r.code);
}

/** Get permission codes by role for a tenant from DB. */
export async function getPermissionsByRole(tenantId: string): Promise<Record<string, string[]>> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT fr.code AS role_code, p.code AS permission_code
     FROM "${schema}".role_permissions rp
     JOIN "${schema}".functional_roles fr ON fr.id = rp.functional_role_id
     JOIN "${schema}".permissions p ON p.id = rp.permission_id
     WHERE fr.is_active = TRUE
     ORDER BY fr.code, p.code`,
  );
  const result: Record<string, string[]> = {};
  for (const row of res.rows) {
    if (!result[row.role_code]) result[row.role_code] = [];
    result[row.role_code].push(row.permission_code);
  }
  return result;
}

/** Check if a role code exists in the tenant's functional_roles table. */
export async function isKnownRoleCode(tenantId: string, code: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT 1 FROM "${schema}".functional_roles WHERE code = $1 AND is_active = TRUE LIMIT 1`,
    [code],
  );
  return res.rows.length > 0;
}
