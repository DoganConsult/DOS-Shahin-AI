import { safeQuery, tenantSchema } from '@dos/db';
import { publish } from '../events/publish-with-dsoc';

export interface FunctionalRole {
  roleId: string;
  roleCode: string;
  nameEn: string;
  nameAr: string;
  moduleCode: string | null;
  isSystem: boolean;
  isActive: boolean;
}

export async function getFunctionalRoles(tenantId: string, moduleCode?: string): Promise<FunctionalRole[]> {
  const schema = tenantSchema(tenantId);
  const filter = moduleCode ? `AND (module_code = $1 OR module_code IS NULL)` : '';
  const params: unknown[] = moduleCode ? [moduleCode] : [];
  const { rows } = await safeQuery(
    `SELECT role_id, role_code, name_en, name_ar, module_code, is_system, is_active
     FROM "${schema}".functional_roles
     WHERE is_active = TRUE ${filter}
     ORDER BY role_code`,
    params,
  );
  return rows.map((r: any) => ({
    roleId: r.role_id,
    roleCode: r.role_code,
    nameEn: r.name_en,
    nameAr: r.name_ar,
    moduleCode: r.module_code,
    isSystem: r.is_system === true,
    isActive: r.is_active === true,
  }));
}

export async function getFunctionalRole(tenantId: string, roleCode: string): Promise<FunctionalRole | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT role_id, role_code, name_en, name_ar, module_code, is_system, is_active
     FROM "${schema}".functional_roles
     WHERE role_code = $1 LIMIT 1`,
    [roleCode],
  );
  const r: any = rows[0];
  if (!r) return null;
  return {
    roleId: r.role_id,
    roleCode: r.role_code,
    nameEn: r.name_en,
    nameAr: r.name_ar,
    moduleCode: r.module_code,
    isSystem: r.is_system === true,
    isActive: r.is_active === true,
  };
}

export async function createFunctionalRole(
  tenantId: string,
  role: Omit<FunctionalRole, 'roleId' | 'isActive'>,
  createdBy: string,
): Promise<FunctionalRole> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".functional_roles (role_code, name_en, name_ar, module_code, is_system, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6)
     RETURNING role_id`,
    [role.roleCode, role.nameEn, role.nameAr, role.moduleCode, role.isSystem, createdBy],
  );
  await publish('dauth.role.created', tenantId, { roleCode: role.roleCode, createdBy });
  return { ...role, roleId: (rows[0] as { role_id: string }).role_id, isActive: true };
}

export async function deactivateFunctionalRole(tenantId: string, roleCode: string, deactivatedBy: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".functional_roles SET is_active = FALSE, updated_at = NOW()
     WHERE role_code = $1 AND is_system = FALSE`,
    [roleCode],
  );
  if ((result.rowCount ?? 0) > 0) {
    await publish('dauth.role.deactivated', tenantId, { roleCode, deactivatedBy });
    return true;
  }
  return false;
}

export async function getRolePermissions(tenantId: string, roleCode: string): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT rp.permission_code FROM "${schema}".role_permissions rp
     JOIN "${schema}".functional_roles fr ON fr.role_id = rp.role_id
     WHERE fr.role_code = $1 AND fr.is_active = TRUE`,
    [roleCode],
  );
  return rows.map((r: any) => r.permission_code);
}
