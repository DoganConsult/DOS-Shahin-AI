import { safeQuery, tenantSchema } from '@dos/db';
import { publish } from '../events/publish-with-dsoc';

export interface RoleAssignment {
  assignmentId: string;
  userId: string;
  roleCode: string;
  moduleCode: string | null;
  scopeType: string | null;
  scopeId: string | null;
  isActive: boolean;
  validFrom: string;
  validTo: string | null;
  assignedBy: string;
}

export async function assignRole(
  tenantId: string,
  userId: string,
  roleCode: string,
  opts: {
    moduleCode?: string;
    scopeType?: string;
    scopeId?: string;
    validTo?: string;
    assignedBy: string;
  },
): Promise<RoleAssignment> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".enterprise_user_role_assignments
       (user_id, role_code, module_code, scope_type, scope_id, is_active, valid_from, valid_to, created_by)
     VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), $6, $7)
     RETURNING assignment_id, valid_from`,
    [userId, roleCode, opts.moduleCode ?? null, opts.scopeType ?? null, opts.scopeId ?? null, opts.validTo ?? null, opts.assignedBy],
  );
  await publish('dauth.role.assigned', tenantId, { userId, roleCode, assignedBy: opts.assignedBy });
  const row = rows[0] as { assignment_id: string; valid_from: Date | string };
  return {
    assignmentId: row.assignment_id,
    userId,
    roleCode,
    moduleCode: opts.moduleCode ?? null,
    scopeType: opts.scopeType ?? null,
    scopeId: opts.scopeId ?? null,
    isActive: true,
    validFrom: row.valid_from
      ? (row.valid_from instanceof Date ? row.valid_from.toISOString() : String(row.valid_from))
      : new Date().toISOString(),
    validTo: opts.validTo ?? null,
    assignedBy: opts.assignedBy,
  };
}

export async function revokeRole(
  tenantId: string,
  userId: string,
  roleCode: string,
  revokedBy: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".enterprise_user_role_assignments
     SET is_active = FALSE, valid_to = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND role_code = $2 AND is_active = TRUE`,
    [userId, roleCode],
  );
  if ((result.rowCount ?? 0) > 0) {
    await publish('dauth.role.revoked', tenantId, { userId, roleCode, revokedBy });
    return true;
  }
  return false;
}

export async function getUserRoleAssignments(tenantId: string, userId: string): Promise<RoleAssignment[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT assignment_id, user_id, role_code, module_code, scope_type, scope_id,
            is_active, valid_from, valid_to, created_by
     FROM "${schema}".enterprise_user_role_assignments
     WHERE user_id = $1 AND is_active = TRUE
       AND (valid_to IS NULL OR valid_to > NOW())
     ORDER BY role_code`,
    [userId],
  );
  return rows.map(( r: any) => ({
    assignmentId: r.assignment_id,
    userId: r.user_id,
    roleCode: r.role_code,
    moduleCode: r.module_code,
    scopeType: r.scope_type,
    scopeId: r.scope_id,
    isActive: r.is_active === true,
    validFrom: r.valid_from?.toISOString?.() ?? '',
    validTo: r.valid_to?.toISOString?.() ?? null,
    assignedBy: r.created_by ?? '',
  }));
}

export async function getRoleAssignmentsByRole(tenantId: string, roleCode: string): Promise<RoleAssignment[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT assignment_id, user_id, role_code, module_code, scope_type, scope_id,
            is_active, valid_from, valid_to, created_by
     FROM "${schema}".enterprise_user_role_assignments
     WHERE role_code = $1 AND is_active = TRUE
       AND (valid_to IS NULL OR valid_to > NOW())
     ORDER BY user_id`,
    [roleCode],
  );
  return rows.map(( r: any) => ({
    assignmentId: r.assignment_id,
    userId: r.user_id,
    roleCode: r.role_code,
    moduleCode: r.module_code,
    scopeType: r.scope_type,
    scopeId: r.scope_id,
    isActive: r.is_active === true,
    validFrom: r.valid_from?.toISOString?.() ?? '',
    validTo: r.valid_to?.toISOString?.() ?? null,
    assignedBy: r.created_by ?? '',
  }));
}

export async function expireStaleAssignments(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".enterprise_user_role_assignments
     SET is_active = FALSE, updated_at = NOW()
     WHERE is_active = TRUE AND valid_to IS NOT NULL AND valid_to < NOW()`,
    [],
  );
  return result.rowCount ?? 0;
}
