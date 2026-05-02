/**
 * DAuth Actor Assignments — manages actor-role and actor-access bindings.
 * Tables: actor_role_assignments, actor_access_assignments, actor_audit_log
 */
import { safeQuery, tenantSchema } from '@dos/db';
import type { GenericRow } from '@dos/types/db';
import { getFirstRow } from '@dos/db';

// ── actor_role_assignments ──

export async function getActorRoles(tenantId: string, actorId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".actor_role_assignments WHERE actor_id = $1 AND is_active = TRUE`,
    [actorId],
  );
  return result.rows;
}

export async function assignRoleToActor(
  tenantId: string, actorId: string, roleId: string, assignedBy: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".actor_role_assignments (actor_id, role_id, assigned_by, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (actor_id, role_id) DO UPDATE SET is_active = TRUE, assigned_by = $3, updated_at = NOW()
     RETURNING *`,
    [actorId, roleId, assignedBy],
  );
  return getFirstRow(result);
}

export async function revokeRoleFromActor(
  tenantId: string, actorId: string, roleId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".actor_role_assignments SET is_active = FALSE, updated_at = NOW()
     WHERE actor_id = $1 AND role_id = $2 AND is_active = TRUE RETURNING assignment_id`,
    [actorId, roleId],
  );
  return (result.rows?.length ?? 0) > 0;
}

// ── actor_access_assignments ──

export async function getActorAccessAssignments(tenantId: string, actorId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".actor_access_assignments WHERE actor_id = $1 AND is_active = TRUE`,
    [actorId],
  );
  return result.rows;
}

export async function assignAccessToActor(
  tenantId: string, actorId: string, profileId: string, assignedBy: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".actor_access_assignments (actor_id, access_profile_id, assigned_by, is_active)
     VALUES ($1, $2, $3, TRUE) RETURNING *`,
    [actorId, profileId, assignedBy],
  );
  return getFirstRow(result);
}

// ── actor_audit_log ──

export async function logActorAudit(
  tenantId: string, actorId: string, action: string, details: Record<string, unknown> = {},
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".actor_audit_log (actor_id, action, details) VALUES ($1, $2, $3)`,
    [actorId, action, JSON.stringify(details)],
  );
}

export async function getActorAuditLog(
  tenantId: string, actorId: string, limit = 50,
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".actor_audit_log WHERE actor_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [actorId, limit],
  );
  return result.rows;
}
