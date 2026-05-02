import { randomUUID } from 'node:crypto';
import { withTenantClient } from '@dos/db';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { userMetrics } from '../observability/metrics';

export interface RoleAssignment {
  assignment_id: string;
  tenant_id: string;
  user_id: string;
  role_code: string;
  scope: string | null;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export async function listRoleAssignments(tenantId: string, userId: string): Promise<RoleAssignment[]> {
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `SELECT assignment_id, tenant_id, user_id, role_code, scope, granted_by, granted_at, expires_at, is_active
           FROM dos.user_role_assignments
          WHERE tenant_id = $1 AND user_id = $2 AND is_active = TRUE
          ORDER BY granted_at DESC`,
        [tenantId, userId],
      );
      return result.rows as RoleAssignment[];
    });
  } catch (err) {
    logger.error('[RoleAssignmentService] Failed to list role assignments', { tenantId, userId, error: toErrorMessage(err) });
    return [];
  } finally {
    userMetrics.observeDb('roleAssignment.list', Date.now() - start);
  }
}

export async function assignRole(
  tenantId: string,
  userId: string,
  roleCode: string,
  assignedBy: string,
): Promise<RoleAssignment> {
  const id = randomUUID();
  const start = Date.now();

  try {
    const row = await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `INSERT INTO dos.user_role_assignments
           (assignment_id, tenant_id, user_id, role_code, granted_by, granted_at, is_active)
         VALUES ($1, $2, $3, $4, $5, NOW(), TRUE)
         ON CONFLICT (tenant_id, user_id, role_code) WHERE is_active = TRUE
           DO UPDATE SET granted_by = EXCLUDED.granted_by, granted_at = NOW()
         RETURNING assignment_id, tenant_id, user_id, role_code, scope, granted_by, granted_at, expires_at, is_active`,
        [id, tenantId, userId, roleCode, assignedBy],
      );
      return result.rows[0] as RoleAssignment;
    });
    userMetrics.roleAssigned(tenantId, roleCode);
    logger.info('[RoleAssignmentService] Role assigned', { tenantId, userId, roleCode, assignedBy });
    return row;
  } catch (err) {
    logger.error('[RoleAssignmentService] Failed to assign role', { tenantId, userId, roleCode, error: toErrorMessage(err) });
    throw err;
  } finally {
    userMetrics.observeDb('roleAssignment.assign', Date.now() - start);
  }
}

export async function revokeRoleAssignment(tenantId: string, userId: string, assignmentId: string): Promise<boolean> {
  const start = Date.now();
  try {
    const row = await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `UPDATE dos.user_role_assignments
         SET is_active = FALSE, revoked_at = NOW()
         WHERE assignment_id = $1 AND tenant_id = $2 AND user_id = $3 AND is_active = TRUE
         RETURNING assignment_id, role_code`,
        [assignmentId, tenantId, userId],
      );
      return result.rows[0] as { assignment_id: string; role_code: string } | undefined;
    });
    if (row) {
      userMetrics.roleRevoked(tenantId, row.role_code);
      logger.info('[RoleAssignmentService] Role revoked', { tenantId, userId, assignmentId, roleCode: row.role_code });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[RoleAssignmentService] Failed to revoke role assignment', { tenantId, userId, assignmentId, error: toErrorMessage(err) });
    throw err;
  } finally {
    userMetrics.observeDb('roleAssignment.revoke', Date.now() - start);
  }
}

export const RoleAssignmentService = {
  listRoleAssignments,
  assignRole,
  revokeRoleAssignment,
};
