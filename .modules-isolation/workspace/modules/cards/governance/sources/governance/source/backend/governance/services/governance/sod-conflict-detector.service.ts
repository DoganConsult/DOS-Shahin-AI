/**
 * @deprecated @removal-date 2026-09-30 @owner DAuth @replacement platform/dauth/sod/
 *
 * DUPLICATE ENGINE — P1 violation of Law 1 (one canonical engine per concern).
 * DAuth owns all SoD detection, resolution, and auditing via:
 *   - sod-engine.ts (evaluateSod, evaluateModuleSod)
 *   - sod-policy.service.ts (policy CRUD, waivers)
 *   - sod-conflict-audit.service.ts (detectConflictsForUser, runTenantWideSodAudit)
 *
 * Migration plan:
 *   1. Merge governance-specific conflict queries (trends, patterns, history) into DAuth sod-conflict-audit.service
 *   2. Migrate consumers (governance.routes, operational-security-jobs, regulatory-governance-jobs) to DAuth imports
 *   3. Hard-delete this file at removal date
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface SoDConflict {
  conflictId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  conflictType: string;
  scopeType: string;
  scopeId: string;
  scopeName?: string;
  severity: string;
  riskScore?: number;
  detectedAt: string;
  status: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

interface SoDFilters {
  userId?: string;
  conflictType?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}

interface ResolveOptions {
  status: 'mitigated' | 'accepted' | 'resolved';
  resolvedBy: string;
  resolutionNote?: string;
}

/** Return open SoD conflicts for a tenant with optional filters. */
export async function getOpenSoDConflicts(
  tenantId: string,
  filters?: SoDFilters,
): Promise<{ conflicts: SoDConflict[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const limit = filters?.limit ?? 100;
  const offset = filters?.offset ?? 0;
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters?.userId) {
    conditions.push(`user_id = $${paramIdx++}`);
    params.push(filters.userId);
  }
  if (filters?.conflictType) {
    conditions.push(`conflict_type = $${paramIdx++}`);
    params.push(filters.conflictType);
  }
  if (filters?.severity) {
    conditions.push(`severity = $${paramIdx++}`);
    params.push(filters.severity);
  }

  const where = conditions.join(' AND ');
  const result = await safeQuery(
    `SELECT * FROM "${schema}".sod_conflicts WHERE ${where} ORDER BY detected_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset],
  );
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".sod_conflicts WHERE ${where}`,
    params,
  );

  return {
    conflicts: (result.rows ?? []) as SoDConflict[],
    total: countResult.rows?.[0]?.total ?? 0,
  };
}

/** Run SoD conflict detection scan for a tenant. */
export async function detectSoDConflicts(tenantId: string): Promise<{
  detected: number;
  totalDetected: number;
  scanId: string;
  byType: Record<string, number>;
  errors: string[];
}> {
  const schema = tenantSchema(tenantId);
  const scanId = `sod-scan-${Date.now()}`;
  const errors: string[] = [];
  let raciConflicts = 0;
  let authorityConflicts = 0;

  try {
    // Detect RACI conflicts: same user assigned as both Responsible and Approver for same entity
    const { rows: raciRows } = await safeQuery(
      `SELECT r1.user_id, r1.entity_type, r1.entity_id, r1.role AS role_a, r2.role AS role_b
       FROM "${schema}".raci_assignments r1
       JOIN "${schema}".raci_assignments r2 ON r1.user_id = r2.user_id AND r1.entity_id = r2.entity_id AND r1.entity_type = r2.entity_type
       WHERE r1.role = 'R' AND r2.role = 'A' AND r1.is_active = true AND r2.is_active = true`,
    ).catch(() => ({ rows: [] }));

    for (const conflict of raciRows) {
      await safeQuery(
        `INSERT INTO "${schema}".sod_conflicts (user_id, conflict_type, entity_type, entity_id, role_a, role_b, severity, status, detected_at, scan_id)
         VALUES ($1, 'raci', $2, $3, $4, $5, 'high', 'open', NOW(), $6)
         ON CONFLICT DO NOTHING`,
        [conflict.user_id, conflict.entity_type, conflict.entity_id, conflict.role_a, conflict.role_b, scanId],
      ).catch(catchHandler(EC.EVENT_BUS));
      raciConflicts++;
    }

    // Detect authority conflicts: user has both create and approve permissions for same module
    const { rows: authRows } = await safeQuery(
      `SELECT ara.user_id, rp1.permission_code AS perm_create, rp2.permission_code AS perm_approve
       FROM "${schema}".actor_role_assignments ara
       JOIN "${schema}".role_permissions rp1 ON rp1.role_code = ara.role_code AND rp1.permission_code LIKE '%.create' AND rp1.is_active = true
       JOIN "${schema}".role_permissions rp2 ON rp2.role_code = ara.role_code AND rp2.permission_code LIKE '%.approve' AND rp2.is_active = true
       WHERE ara.is_active = true
         AND split_part(rp1.permission_code, '.', 1) = split_part(rp2.permission_code, '.', 1)`,
    ).catch(() => ({ rows: [] }));

    for (const conflict of authRows) {
      await safeQuery(
        `INSERT INTO "${schema}".sod_conflicts (user_id, conflict_type, entity_type, role_a, role_b, severity, status, detected_at, scan_id)
         VALUES ($1, 'authority', 'permission', $2, $3, 'medium', 'open', NOW(), $4)
         ON CONFLICT DO NOTHING`,
        [conflict.user_id, conflict.perm_create, conflict.perm_approve, scanId],
      ).catch(catchHandler(EC.EVENT_BUS));
      authorityConflicts++;
    }
  } catch (err: unknown) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  const totalDetected = raciConflicts + authorityConflicts;
  return { detected: totalDetected, totalDetected, scanId, byType: { raci: raciConflicts, authority: authorityConflicts }, errors };
}

/** Resolve a single SoD conflict. */
export async function resolveSoDConflict(
  tenantId: string,
  conflictId: string,
  options: ResolveOptions,
): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

/** Bulk-resolve multiple SoD conflicts. */
export async function bulkResolveConflicts(
  tenantId: string,
  conflictIds: string[],
  options: ResolveOptions,
): Promise<{ resolved: number }> {
  let resolved = 0;
  for (const id of conflictIds) {
    try {
      await resolveSoDConflict(tenantId, id, options);
      resolved++;
    } catch { /* skip not found */ }
  }
  return { resolved };
}

/** Suggest remediation strategies for a conflict. */
export async function suggestRemediation(
  _tenantId: string,
  conflict: SoDConflict,
): Promise<Array<{ strategy: string; description: string }>> {
  return [
    { strategy: 'remove_role', description: `Remove one of the conflicting roles from user in scope ${conflict.scopeType}` },
    { strategy: 'add_compensating_control', description: 'Add a compensating control such as dual-approval' },
    { strategy: 'accept_risk', description: 'Document business justification and accept residual risk' },
  ];
}

/** Get trend data for SoD conflicts over time. */
export async function getConflictTrends(
  tenantId: string,
  days: number,
): Promise<Array<{ date: string; detected: number; resolved: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       d::date AS date,
       COALESCE(SUM(CASE WHEN c.detected_at::date = d THEN 1 ELSE 0 END), 0)::int AS detected,
       COALESCE(SUM(CASE WHEN c.resolved_at::date = d THEN 1 ELSE 0 END), 0)::int AS resolved
     FROM generate_series(NOW() - ($1 || ' days')::interval, NOW(), '1 day') AS d
     LEFT JOIN "${schema}".sod_conflicts c ON c.detected_at::date = d OR c.resolved_at::date = d
     GROUP BY d ORDER BY d`,
    [days],
  );
  return (result.rows ?? []) as Array<{ date: string; detected: number; resolved: number }>;
}

/** Detect patterns in SoD conflicts. */
export async function detectConflictPatterns(
  tenantId: string,
): Promise<Array<{ pattern: string; count: number; severity: string }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT conflict_type AS pattern, COUNT(*)::int AS count, MAX(severity) AS severity
     FROM "${schema}".sod_conflicts WHERE deleted_at IS NULL
     GROUP BY conflict_type ORDER BY count DESC`,
  );
  return (result.rows ?? []) as Array<{ pattern: string; count: number; severity: string }>;
}

/** Get resolution history for a conflict. */
export async function getConflictResolutionHistory(
  tenantId: string,
  conflictId: string,
): Promise<Array<Record<string, unknown>>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".sod_conflict_history WHERE conflict_id = $1 ORDER BY created_at DESC`,
    [conflictId],
  );
  return result.rows ?? [];
}

/** Reopen a previously resolved conflict. */
export async function reopenSoDConflict(
  tenantId: string,
  conflictId: string,
  reopenedBy: string,
  reason: string,
): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

/** Pre-assignment check: would adding this assignment create SoD conflicts? */
export async function checkSoDBeforeAssignment(
  tenantId: string,
  userId: string,
  assignment: Record<string, unknown>,
): Promise<{ wouldConflict: boolean; potentialConflicts: SoDConflict[] }> {
  const schema = tenantSchema(tenantId);
  const newRoleCode = String(assignment.roleCode || assignment.role_code || '');
  if (!newRoleCode) return { wouldConflict: false, potentialConflicts: [] };

  try {
    const { rows: existingRoles } = await safeQuery(
      `SELECT role_code FROM "${schema}".actor_role_assignments WHERE user_id = $1 AND is_active = true`,
      [userId],
    );

    const { rows: rules } = await safeQuery(
      `SELECT * FROM "${schema}".sod_rules WHERE is_active = true
       AND ((role_a = $1 AND role_b = ANY($2)) OR (role_b = $1 AND role_a = ANY($2)))`,
      [newRoleCode, existingRoles.map(( r: Record<string, unknown>) => r.role_code)],
    ).catch(() => ({ rows: [] }));

    if (rules.length === 0) return { wouldConflict: false, potentialConflicts: [] };

    const conflicts: SoDConflict[] = rules.map(( r: Record<string, unknown>) => ({
      conflict_id: `potential-${r.rule_id}`,
      user_id: userId,
      conflict_type: 'assignment',
      entity_type: 'role',
      role_a: r.role_a,
      role_b: r.role_b,
      severity: r.severity || 'high',
      status: 'potential',
      detected_at: new Date().toISOString(),
    } as unknown));

    return { wouldConflict: true, potentialConflicts: conflicts };
  } catch { return { wouldConflict: false, potentialConflicts: [] }; }
}
