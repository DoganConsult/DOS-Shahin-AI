import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';

export interface StepAutonomyScope {
  scope_id: string;
  workflow_id: string | null;
  step_type: string;
  step_sub_type: string | null;
  allowed_ai_actions: string[];
  max_autonomy_level: number;
  mandatory_human_review: boolean;
  max_confidence_required: number;
  is_active: boolean;
  created_at: string;
}

export interface StepAutonomyCheckResult {
  allowed: boolean;
  maxAutonomyLevel: number;
  allowedActions: string[];
  mandatoryReview: boolean;
  maxConfidence: number;
  source: 'step_scope' | 'default';
}

export async function getStepAutonomyScopes(
  tenantId: string,
  opts?: { workflowId?: string; stepType?: string; activeOnly?: boolean },
): Promise<StepAutonomyScope[]> {
  const schema = tenantSchema(tenantId);
  const where: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (opts?.workflowId) {
    where.push(`(workflow_id = $${idx} OR workflow_id IS NULL)`); params.push(opts.workflowId); idx++;
  }
  if (opts?.stepType) {
    where.push(`step_type = $${idx}`); params.push(opts.stepType); idx++;
  }
  if (opts?.activeOnly !== false) {
    where.push('is_active = TRUE');
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_step_autonomy ${whereClause}
     ORDER BY step_type, step_sub_type`,
    params,
  );
  return result.rows.map(mapRow);
}

export async function checkStepAutonomy(
  tenantId: string,
  stepType: string,
  stepSubType?: string,
  workflowId?: string,
): Promise<StepAutonomyCheckResult> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_step_autonomy
     WHERE is_active = TRUE
       AND step_type = $1
       AND (step_sub_type IS NULL OR step_sub_type = $2)
       AND (workflow_id IS NULL OR workflow_id = $3)
     ORDER BY
       CASE WHEN workflow_id IS NOT NULL AND step_sub_type IS NOT NULL THEN 0
            WHEN workflow_id IS NOT NULL THEN 1
            WHEN step_sub_type IS NOT NULL THEN 2
            ELSE 3 END
     LIMIT 1`,
    [stepType, stepSubType || null, workflowId || null],
  );

  if (result.rows.length === 0) {
    return {
      allowed: true,
      maxAutonomyLevel: 2,
      allowedActions: ['guidance', 'autofill'],
      mandatoryReview: true,
      maxConfidence: 0.95,
      source: 'default',
    };
  }

  const scope = mapRow(getFirstRow(result));
  return {
    allowed: scope.max_autonomy_level > 0,
    maxAutonomyLevel: scope.max_autonomy_level,
    allowedActions: scope.allowed_ai_actions,
    mandatoryReview: scope.mandatory_human_review,
    maxConfidence: scope.max_confidence_required,
    source: 'step_scope',
  };
}

export async function upsertStepAutonomy(
  tenantId: string,
  userId: string,
  input: {
    workflowId?: string;
    stepType: string;
    stepSubType?: string;
    allowedAiActions?: string[];
    maxAutonomyLevel?: number;
    mandatoryHumanReview?: boolean;
    maxConfidenceRequired?: number;
  },
): Promise<StepAutonomyScope> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_step_autonomy
       (workflow_id, step_type, step_sub_type, allowed_ai_actions,
        max_autonomy_level, mandatory_human_review, max_confidence_required)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.workflowId || null,
      input.stepType,
      input.stepSubType || null,
      input.allowedAiActions || [],
      input.maxAutonomyLevel ?? 0,
      input.mandatoryHumanReview !== false,
      input.maxConfidenceRequired ?? 0.95,
    ],
  );

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'create',
    entityType: 'workflow_step_autonomy',
    entityId: getFirstRow(result).scope_id,
    afterState: input,
  });

  return mapRow(getFirstRow(result));
}

export async function deactivateStepAutonomy(
  tenantId: string,
  scopeId: string,
  userId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflow_step_autonomy
     SET is_active = FALSE WHERE scope_id = $1 AND is_active = TRUE`,
    [scopeId],
  );
  if ((result.rowCount ?? 0) === 0) return false;

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'update',
    entityType: 'workflow_step_autonomy',
    entityId: scopeId,
    afterState: { is_active: false },
  });

  return true;
}

function mapRow(row: Record<string, unknown>): StepAutonomyScope {
  return {

    scope_id: row.scope_id,

    workflow_id: row.workflow_id || null,

    step_type: row.step_type,

    step_sub_type: row.step_sub_type || null,

    allowed_ai_actions: row.allowed_ai_actions || [],
    max_autonomy_level: Number(row.max_autonomy_level ?? 0),

    mandatory_human_review: row.mandatory_human_review ?? true,
    max_confidence_required: Number(row.max_confidence_required ?? 0.95),

    is_active: row.is_active ?? true,

    created_at: row.created_at,
  };
}
