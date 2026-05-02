/**
 * DAuth Security Posture — manages security compliance, posture snapshots, and policies.
 * Tables: security_compliance_attestations, security_events, security_posture_snapshots,
 *         authentication_policies, conditional_access_grants, effective_user_modules,
 *         effective_user_permissions, defense_lines, function_authorities,
 *         authority_level_catalog, authority_matrix, delegated_authorities,
 *         delegation_chains, sod_conflict_resolution_history
 */
import { safeQuery, tenantSchema } from '@dos/db';
import type { GenericRow } from '@dos/types/db';
import { getFirstRow } from '@dos/db';

// ── security_compliance_attestations ──

export async function listSecurityAttestations(tenantId: string, filters: { status?: string; limit?: number } = {}): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const limit = Math.min(200, filters.limit || 50);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".security_compliance_attestations ${where} ORDER BY created_at DESC LIMIT $${idx}`,
    [...params, limit],
  );
  return result.rows;
}

export async function createSecurityAttestation(tenantId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".security_compliance_attestations (control_id, attester_id, status, evidence_url, notes)
     VALUES ($1, $2, 'pending', $3, $4) RETURNING *`,
    [data.control_id, data.attester_id, data.evidence_url, data.notes],
  );
  return getFirstRow(result);
}

// ── security_posture_snapshots ──

export async function getLatestSecurityPosture(tenantId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".security_posture_snapshots ORDER BY snapshot_date DESC LIMIT 1`, []);
  return getFirstRow(result);
}

export async function createSecurityPostureSnapshot(tenantId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".security_posture_snapshots (snapshot_date, overall_score, dimension_scores, metadata)
     VALUES (CURRENT_DATE, $1, $2, $3) RETURNING *`,
    [data.overall_score, JSON.stringify(data.dimension_scores || {}), JSON.stringify(data.metadata || {})],
  );
  return getFirstRow(result);
}

// ── authentication_policies ──

export async function listAuthPolicies(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".authentication_policies WHERE is_active = TRUE ORDER BY priority`, []);
  return result.rows;
}

export async function getAuthPolicy(tenantId: string, policyId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".authentication_policies WHERE policy_id = $1`, [policyId]);
  return getFirstRow(result);
}

export async function upsertAuthPolicy(tenantId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".authentication_policies (policy_code, policy_name, conditions, actions, priority, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (policy_code) DO UPDATE SET policy_name = $2, conditions = $3, actions = $4, priority = $5, updated_at = NOW()
     RETURNING *`,
    [data.policy_code, data.policy_name, JSON.stringify(data.conditions || {}), JSON.stringify(data.actions || {}), data.priority || 0],
  );
  return getFirstRow(result);
}

// ── conditional_access_grants ──

export async function listConditionalAccessGrants(tenantId: string, userId?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const where = userId ? 'WHERE user_id = $1 AND is_active = TRUE' : 'WHERE is_active = TRUE';
  const params = userId ? [userId] : [];
  const result = await safeQuery(
    `SELECT * FROM "${schema}".conditional_access_grants ${where} ORDER BY created_at DESC`, params);
  return result.rows;
}

export async function createConditionalGrant(tenantId: string, data: Record<string, unknown>): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".conditional_access_grants (user_id, condition_type, condition_value, grant_permissions, expires_at, granted_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.user_id, data.condition_type, JSON.stringify(data.condition_value || {}),
     JSON.stringify(data.grant_permissions || []), data.expires_at, data.granted_by],
  );
  return getFirstRow(result);
}

// ── effective_user_modules ──

export async function getEffectiveUserModules(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".effective_user_modules WHERE user_id = $1`, [userId]);
  return result.rows;
}

// ── effective_user_permissions ──

export async function getEffectiveUserPermissions(tenantId: string, userId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".effective_user_permissions WHERE user_id = $1`, [userId]);
  return result.rows;
}

// ── defense_lines ──

export async function listDefenseLines(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".defense_lines WHERE is_active = TRUE ORDER BY line_number`, []);
  return result.rows;
}

// ── function_authorities ──

export async function listFunctionAuthorities(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".function_authorities WHERE is_active = TRUE ORDER BY authority_name`, []);
  return result.rows;
}

// ── authority_level_catalog ──

export async function listAuthorityLevelCatalog(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".authority_level_catalog ORDER BY level_rank`, []);
  return result.rows;
}

// ── authority_matrix ──

export async function getAuthorityMatrix(tenantId: string, roleId?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const where = roleId ? 'WHERE role_id = $1' : '';
  const params = roleId ? [roleId] : [];
  const result = await safeQuery(
    `SELECT * FROM "${schema}".authority_matrix ${where} ORDER BY authority_area`, params);
  return result.rows;
}

// ── delegated_authorities ──

export async function listDelegatedAuthorities(tenantId: string, userId?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const where = userId ? 'WHERE delegated_to = $1 AND is_active = TRUE' : 'WHERE is_active = TRUE';
  const params = userId ? [userId] : [];
  const result = await safeQuery(
    `SELECT * FROM "${schema}".delegated_authorities ${where} ORDER BY created_at DESC`, params);
  return result.rows;
}

// ── delegation_chains ──

export async function getDelegationChain(tenantId: string, delegationId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".delegation_chains WHERE root_delegation_id = $1 ORDER BY chain_depth`, [delegationId]);
  return result.rows;
}

// ── sod_conflict_resolution_history ──

export async function getSodResolutionHistory(tenantId: string, conflictId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".sod_conflict_resolution_history WHERE conflict_id = $1 ORDER BY created_at`, [conflictId]);
  return result.rows;
}

export async function logSodResolution(
  tenantId: string, conflictId: string, resolution: string, resolvedBy: string, notes?: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".sod_conflict_resolution_history (conflict_id, resolution, resolved_by, notes)
     VALUES ($1, $2, $3, $4)`,
    [conflictId, resolution, resolvedBy, notes],
  );
}
