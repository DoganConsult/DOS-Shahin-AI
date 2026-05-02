import { safeQuery, tenantSchema } from '@dos/db';
import { evaluateSod } from './sod-engine';
import { publish } from '../events/publish-with-dsoc';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface SodConflictRecord {
  conflictId: string;
  userId: string;
  ruleCode: string;
  roleCodeA: string;
  roleCodeB: string;
  conflictLevel: string;
  detectedAt: string;
  resolvedAt: string | null;
  resolution: string | null;
}

export async function detectConflictsForUser(
  tenantId: string,
  userId: string,
): Promise<SodConflictRecord[]> {
  const schema = tenantSchema(tenantId);
  const { rows: roleRows } = await safeQuery(
    `SELECT DISTINCT role_code FROM "${schema}".enterprise_user_role_assignments
     WHERE user_id = $1 AND is_active = TRUE AND (valid_to IS NULL OR valid_to > NOW())`,
    [userId],
  );
  const roleCodes = roleRows.map((r: any) => r.role_code);
  const result = await evaluateSod(tenantId, roleCodes);

  const conflicts: SodConflictRecord[] = result.violations.map((v, idx) => ({
    conflictId: `${userId}:${v.roleA}:${v.roleB}:${idx}`,
    userId,
    ruleCode: `${v.roleA}_${v.roleB}`,
    roleCodeA: v.roleA,
    roleCodeB: v.roleB,
    conflictLevel: v.conflictLevel,
    detectedAt: new Date().toISOString(),
    resolvedAt: null,
    resolution: null,
  }));

  if (conflicts.length > 0) {
    await publish('dauth.sod.conflicts_detected', tenantId, {
      userId,
      conflictCount: conflicts.length,
      detectedAt: new Date().toISOString(),
    }).catch(catchHandler(EC.EVENT_BUS));
  }

  return conflicts;
}

export async function getUnresolvedConflicts(tenantId: string): Promise<SodConflictRecord[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT conflict_id, user_id, rule_code, role_code_a, role_code_b,
            conflict_level, detected_at, resolved_at, resolution
     FROM "${schema}".sod_conflict_log
     WHERE resolved_at IS NULL
     ORDER BY detected_at DESC`,
    [],
  );
  return rows.map((r: any) => ({
    conflictId: r.conflict_id,
    userId: r.user_id,
    ruleCode: r.rule_code,
    roleCodeA: r.role_code_a,
    roleCodeB: r.role_code_b,
    conflictLevel: r.conflict_level,
    detectedAt: r.detected_at?.toISOString?.() ?? '',
    resolvedAt: null,
    resolution: null,
  }));
}

export async function resolveConflict(
  tenantId: string,
  conflictId: string,
  resolution: string,
  resolvedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".sod_conflict_log
     SET resolved_at = NOW(), resolution = $1, resolved_by = $2
     WHERE conflict_id = $3`,
    [resolution, resolvedBy, conflictId],
  );
}

export async function runTenantWideSodAudit(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT DISTINCT user_id FROM "${schema}".enterprise_user_role_assignments
     WHERE is_active = TRUE AND (valid_to IS NULL OR valid_to > NOW())`,
    [],
  );
  let totalConflicts = 0;
  for (const row of rows as Array<{ user_id: string }>) {
    const conflicts = await detectConflictsForUser(tenantId, row.user_id);
    totalConflicts += conflicts.length;
  }
  return totalConflicts;
}
