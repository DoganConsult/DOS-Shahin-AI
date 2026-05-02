/**
 * DAuth Authorization Audit — manages authorization decision logs and mismatch tracking.
 * Tables: authorization_audit_log, authorization_decision_log, authorization_mismatch_log,
 *         authorization_permissions, guard_decision_log, rbac_config_audit, permission_analytics,
 *         permission_templates, role_assignment_audit, role_assignment_history, role_usage_audit,
 *         role_transition_requests
 */
import { safeQuery, tenantSchema } from '@dos/db';
import type { GenericRow } from '@dos/types/db';
import { getFirstRow } from '@dos/db';

// ── authorization_audit_log ──

export async function logAuthorizationAudit(
  tenantId: string, userId: string, resource: string, action: string, decision: string, details: Record<string, unknown> = {},
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".authorization_audit_log (user_id, resource, action, decision, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, resource, action, decision, JSON.stringify(details)],
  );
}

export async function getAuthorizationAuditLog(
  tenantId: string, filters: { userId?: string; resource?: string; decision?: string; limit?: number } = {},
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters.userId) { conditions.push(`user_id = $${idx++}`); params.push(filters.userId); }
  if (filters.resource) { conditions.push(`resource = $${idx++}`); params.push(filters.resource); }
  if (filters.decision) { conditions.push(`decision = $${idx++}`); params.push(filters.decision); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = Math.min(500, filters.limit || 100);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".authorization_audit_log ${where} ORDER BY created_at DESC LIMIT $${idx}`,
    [...params, limit],
  );
  return result.rows;
}

// ── authorization_decision_log ──

export async function logDecision(
  tenantId: string, userId: string, permissionCode: string, granted: boolean, reason: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".authorization_decision_log (user_id, permission_code, granted, reason)
     VALUES ($1, $2, $3, $4)`,
    [userId, permissionCode, granted, reason],
  );
}

// ── authorization_mismatch_log ──

export async function logMismatch(
  tenantId: string, userId: string, expectedPermission: string, actualResult: string, context: Record<string, unknown> = {},
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".authorization_mismatch_log (user_id, expected_permission, actual_result, context)
     VALUES ($1, $2, $3, $4)`,
    [userId, expectedPermission, actualResult, JSON.stringify(context)],
  );
}

export async function getMismatches(tenantId: string, limit = 50): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".authorization_mismatch_log ORDER BY created_at DESC LIMIT $1`, [limit]);
  return result.rows;
}

// ── authorization_permissions ──

export async function listAuthorizationPermissions(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".authorization_permissions WHERE is_active = TRUE ORDER BY permission_code`, []);
  return result.rows;
}

// ── guard_decision_log ──

export async function logGuardDecision(
  tenantId: string, guardName: string, userId: string, result: string, durationMs: number, details: Record<string, unknown> = {},
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".guard_decision_log (guard_name, user_id, result, duration_ms, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [guardName, userId, result, durationMs, JSON.stringify(details)],
  );
}

// ── rbac_config_audit ──

export async function logRbacConfigChange(
  tenantId: string, entityType: string, entityId: string, action: string, changedBy: string, before: unknown, after: unknown,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".rbac_config_audit (entity_type, entity_id, action, changed_by, before_state, after_state)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [entityType, entityId, action, changedBy, JSON.stringify(before), JSON.stringify(after)],
  );
}

// ── permission_analytics ──

export async function getPermissionAnalytics(tenantId: string, permissionCode?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const where = permissionCode ? 'WHERE permission_code = $1' : '';
  const params = permissionCode ? [permissionCode] : [];
  const result = await safeQuery(
    `SELECT * FROM "${schema}".permission_analytics ${where} ORDER BY usage_count DESC LIMIT 100`, params);
  return result.rows;
}

// ── permission_templates ──

export async function listPermissionTemplates(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".permission_templates WHERE is_active = TRUE ORDER BY template_name`, []);
  return result.rows;
}

export async function getPermissionTemplate(tenantId: string, templateId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".permission_templates WHERE template_id = $1`, [templateId]);
  return getFirstRow(result);
}

// ── role_assignment_audit ──

export async function logRoleAssignmentAudit(
  tenantId: string, userId: string, roleId: string, action: string, performedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".role_assignment_audit (user_id, role_id, action, performed_by)
     VALUES ($1, $2, $3, $4)`,
    [userId, roleId, action, performedBy],
  );
}

// ── role_assignment_history ──

export async function getRoleAssignmentHistory(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".role_assignment_history WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
  return result.rows;
}

// ── role_usage_audit ──

export async function logRoleUsage(tenantId: string, userId: string, roleId: string, action: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".role_usage_audit (user_id, role_id, action_performed) VALUES ($1, $2, $3)`,
    [userId, roleId, action],
  );
}

// ── role_transition_requests ──

export async function createRoleTransitionRequest(
  tenantId: string, userId: string, fromRoleId: string, toRoleId: string, reason: string, requestedBy: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".role_transition_requests (user_id, from_role_id, to_role_id, reason, requested_by, status)
     VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
    [userId, fromRoleId, toRoleId, reason, requestedBy],
  );
  return getFirstRow(result);
}

export async function decideRoleTransition(
  tenantId: string, requestId: string, decision: 'approved' | 'rejected', decidedBy: string,
): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".role_transition_requests SET status = $2, decided_by = $3, decided_at = NOW(), updated_at = NOW()
     WHERE request_id = $1 RETURNING *`,
    [requestId, decision, decidedBy],
  );
  return getFirstRow(result);
}
