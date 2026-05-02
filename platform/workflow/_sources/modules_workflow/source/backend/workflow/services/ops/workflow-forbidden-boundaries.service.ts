import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';

export type BoundarySeverity = 'block' | 'warn' | 'audit_only';

export interface ForbiddenBoundary {
  boundary_id: string;
  module_code: string | null;
  entity_type: string | null;
  step_type: string | null;
  forbidden_action: string;
  reason: string;
  severity: BoundarySeverity;
  is_active: boolean;
  created_at: string;
}

export interface BoundaryCheckResult {
  allowed: boolean;
  violations: Array<{
    boundaryId: string;
    forbiddenAction: string;
    reason: string;
    severity: BoundarySeverity;
  }>;
}

export async function getBoundaries(
  tenantId: string,
  opts?: { moduleCode?: string; stepType?: string; activeOnly?: boolean },
): Promise<ForbiddenBoundary[]> {
  const schema = tenantSchema(tenantId);
  const where: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (opts?.moduleCode) {
    where.push(`(module_code = $${idx} OR module_code IS NULL)`); params.push(opts.moduleCode); idx++;
  }
  if (opts?.stepType) {
    where.push(`(step_type = $${idx} OR step_type IS NULL)`); params.push(opts.stepType); idx++;
  }
  if (opts?.activeOnly !== false) {
    where.push('is_active = TRUE');
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_forbidden_boundaries ${whereClause}
     ORDER BY severity, forbidden_action`,
    params,
  );
  return result.rows.map(mapRow);
}

export async function checkBoundaries(
  tenantId: string,
  action: string,
  context: { moduleCode?: string; entityType?: string; stepType?: string },
): Promise<BoundaryCheckResult> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_forbidden_boundaries
     WHERE is_active = TRUE
       AND forbidden_action = $1
       AND (module_code IS NULL OR module_code = $2)
       AND (entity_type IS NULL OR entity_type = $3)
       AND (step_type IS NULL OR step_type = $4)`,
    [action, context.moduleCode || null, context.entityType || null, context.stepType || null],
  );

  const violations = result.rows.map(row => ({
    boundaryId: row.boundary_id,
    forbiddenAction: row.forbidden_action,
    reason: row.reason,
    severity: row.severity as BoundarySeverity,
  }));

  const blocked = violations.some(v => v.severity === 'block');

  return { allowed: !blocked, violations };
}

export async function createBoundary(
  tenantId: string,
  userId: string,
  input: {
    moduleCode?: string;
    entityType?: string;
    stepType?: string;
    forbiddenAction: string;
    reason: string;
    severity?: BoundarySeverity;
  },
): Promise<ForbiddenBoundary> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_forbidden_boundaries
       (module_code, entity_type, step_type, forbidden_action, reason, severity)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.moduleCode || null,
      input.entityType || null,
      input.stepType || null,
      input.forbiddenAction,
      input.reason,
      input.severity || 'block',
    ],
  );

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'create',
    entityType: 'workflow_forbidden_boundary',
    entityId: getFirstRow(result).boundary_id,
    afterState: input,
  });

  return mapRow(getFirstRow(result));
}

export async function deactivateBoundary(
  tenantId: string,
  boundaryId: string,
  userId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflow_forbidden_boundaries
     SET is_active = FALSE WHERE boundary_id = $1 AND is_active = TRUE`,
    [boundaryId],
  );
  if ((result.rowCount ?? 0) === 0) return false;

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'update',
    entityType: 'workflow_forbidden_boundary',
    entityId: boundaryId,
    afterState: { is_active: false },
  });

  return true;
}

function mapRow(row: Record<string, unknown>): ForbiddenBoundary {
  return {

    boundary_id: row.boundary_id,

    module_code: row.module_code || null,

    entity_type: row.entity_type || null,

    step_type: row.step_type || null,

    forbidden_action: row.forbidden_action,

    reason: row.reason,

    severity: row.severity || 'block',

    is_active: row.is_active ?? true,

    created_at: row.created_at,
  };
}
