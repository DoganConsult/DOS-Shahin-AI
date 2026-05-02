/**
 * Permission Service — DAuth canonical permission CRUD
 *
 * Manages the permissions registry and role-permission assignments.
 * Permission codes follow the module.resource.action format.
 *
 * @owner DAuth
 */
import { safeQuery, tenantSchema } from '@dos/db';
import { publish } from '../events/publish-with-dsoc';
import { logger } from '@dos/platform-core/observability';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Permission {
  permissionId: string;
  permissionCode: string;
  nameEn: string;
  nameAr: string;
  moduleCode: string;
  isSystem: boolean;
  isActive: boolean;
}

export interface CreatePermissionInput {
  permissionCode: string;
  nameEn: string;
  nameAr: string;
  moduleCode: string;
  isSystem?: boolean;
}

// ---------------------------------------------------------------------------
// Format validation
// ---------------------------------------------------------------------------

/** Validates module.resource.action format — three dot-separated alphanumeric/underscore segments. */
export function validatePermissionFormat(code: string): boolean {
  return /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(code);
}

// ---------------------------------------------------------------------------
// Permission CRUD
// ---------------------------------------------------------------------------

/** List permissions, optionally filtered by module code. */
export async function getPermissions(tenantId: string, moduleCode?: string): Promise<Permission[]> {
  const schema = tenantSchema(tenantId);
  const filter = moduleCode ? `AND module_code = $1` : '';
  const params: unknown[] = moduleCode ? [moduleCode] : [];
  const { rows } = await safeQuery(
    `SELECT permission_id, permission_code, name_en, name_ar, module_code, is_system, is_active
     FROM "${schema}".permissions
     WHERE is_active = TRUE ${filter}
     ORDER BY permission_code`,
    params,
  );
  return rows.map((r: any) => ({
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
export async function getPermission(tenantId: string, permissionCode: string): Promise<Permission | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT permission_id, permission_code, name_en, name_ar, module_code, is_system, is_active
     FROM "${schema}".permissions
     WHERE permission_code = $1`,
    [permissionCode],
  );
  if (rows.length === 0) return null;
  const r: any = rows[0];
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
export async function createPermission(
  tenantId: string,
  input: CreatePermissionInput,
  createdBy: string,
): Promise<Permission> {
  if (!validatePermissionFormat(input.permissionCode)) {
    throw new Error(
      `Invalid permission code "${input.permissionCode}". Must follow module.resource.action format.`,
    );
  }

  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".permissions
       (permission_code, name_en, name_ar, module_code, is_system, is_active, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6, NOW(), NOW())
     RETURNING permission_id, permission_code, name_en, name_ar, module_code, is_system, is_active`,
    [
      input.permissionCode,
      input.nameEn,
      input.nameAr,
      input.moduleCode,
      input.isSystem ?? false,
      createdBy,
    ],
  );

  const r: any = rows[0];
  const permission: Permission = {
    permissionId: r.permission_id,
    permissionCode: r.permission_code,
    nameEn: r.name_en,
    nameAr: r.name_ar,
    moduleCode: r.module_code,
    isSystem: r.is_system,
    isActive: r.is_active,
  };

  publish('dauth.permission.created', tenantId, { permissionCode: permission.permissionCode, createdBy });
  logger.info(`Permission created: ${permission.permissionCode} by ${createdBy}`);
  return permission;
}

/** Soft-deactivate a permission. System permissions are protected. */
export async function deactivatePermission(
  tenantId: string,
  permissionCode: string,
  deactivatedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Guard: system permissions cannot be deactivated
  const existing = await getPermission(tenantId, permissionCode);
  if (!existing) {
    throw new Error(`Permission "${permissionCode}" not found.`);
  }
  if (existing.isSystem) {
    throw new Error(`System permission "${permissionCode}" cannot be deactivated.`);
  }

  await safeQuery(
    `UPDATE "${schema}".permissions
     SET is_active = FALSE, updated_at = NOW()
     WHERE permission_code = $1`,
    [permissionCode],
  );

  publish('dauth.permission.deactivated', tenantId, { permissionCode, deactivatedBy });
  logger.info(`Permission deactivated: ${permissionCode} by ${deactivatedBy}`);
}

// ---------------------------------------------------------------------------
// Role-permission linking
// ---------------------------------------------------------------------------

/** Get all permissions assigned to a functional role. */
export async function getPermissionsByRole(tenantId: string, roleCode: string): Promise<Permission[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT p.permission_id, p.permission_code, p.name_en, p.name_ar, p.module_code, p.is_system, p.is_active
     FROM "${schema}".role_permissions rp
     JOIN "${schema}".functional_roles fr ON fr.role_id = rp.role_id
     JOIN "${schema}".permissions p ON p.permission_code = rp.permission_code
     WHERE fr.role_code = $1 AND p.is_active = TRUE
     ORDER BY p.permission_code`,
    [roleCode],
  );
  return rows.map((r: any) => ({
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
export async function assignPermissionToRole(
  tenantId: string,
  roleCode: string,
  permissionCode: string,
  assignedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Resolve role_id from role_code
  const { rows: roleRows } = await safeQuery(
    `SELECT role_id FROM "${schema}".functional_roles WHERE role_code = $1 AND is_active = TRUE`,
    [roleCode],
  );
  if (roleRows.length === 0) {
    throw new Error(`Functional role "${roleCode}" not found or inactive.`);
  }
  const roleId = (roleRows[0] as { role_id: string }).role_id;

  // Verify permission exists and is active
  const permission = await getPermission(tenantId, permissionCode);
  if (!permission || !permission.isActive) {
    throw new Error(`Permission "${permissionCode}" not found or inactive.`);
  }

  await safeQuery(
    `INSERT INTO "${schema}".role_permissions (role_id, permission_code)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [roleId, permissionCode],
  );

  publish('dauth.permission.assigned', tenantId, { roleCode, permissionCode, assignedBy });
  logger.info(`Permission ${permissionCode} assigned to role ${roleCode} by ${assignedBy}`);
}

/** Revoke a permission from a functional role. */
export async function revokePermissionFromRole(
  tenantId: string,
  roleCode: string,
  permissionCode: string,
  revokedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  const { rows: roleRows } = await safeQuery(
    `SELECT role_id FROM "${schema}".functional_roles WHERE role_code = $1`,
    [roleCode],
  );
  if (roleRows.length === 0) {
    throw new Error(`Functional role "${roleCode}" not found.`);
  }
  const roleId = (roleRows[0] as { role_id: string }).role_id;

  await safeQuery(
    `DELETE FROM "${schema}".role_permissions WHERE role_id = $1 AND permission_code = $2`,
    [roleId, permissionCode],
  );

  publish('dauth.permission.revoked', tenantId, { roleCode, permissionCode, revokedBy });
  logger.info(`Permission ${permissionCode} revoked from role ${roleCode} by ${revokedBy}`);
}
