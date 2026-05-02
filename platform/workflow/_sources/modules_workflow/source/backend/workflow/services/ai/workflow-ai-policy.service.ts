import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';

export interface WorkflowAIPolicy {
  policy_id: string;
  workflow_id: string;
  ai_enabled: boolean;
  autonomy_level: number;
  allowed_ai_actions: string[];
  forbidden_actions: string[];
  max_confidence_auto: number;
  require_human_review: boolean;
  override_tenant_config: boolean;
  created_at: string;
  updated_at: string;
}

export async function getWorkflowAIPolicy(
  tenantId: string,
  workflowId: string,
): Promise<WorkflowAIPolicy | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_ai_policy WHERE workflow_id = $1`,
    [workflowId],
  );
  return result.rows.length > 0 ? mapRow(getFirstRow(result)) : null;
}

export async function upsertWorkflowAIPolicy(
  tenantId: string,
  userId: string,
  workflowId: string,
  input: {
    aiEnabled?: boolean;
    autonomyLevel?: number;
    allowedAiActions?: string[];
    forbiddenActions?: string[];
    maxConfidenceAuto?: number;
    requireHumanReview?: boolean;
    overrideTenantConfig?: boolean;
  },
): Promise<WorkflowAIPolicy> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_ai_policy
       (workflow_id, ai_enabled, autonomy_level, allowed_ai_actions,
        forbidden_actions, max_confidence_auto, require_human_review, override_tenant_config)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (workflow_id) DO UPDATE SET
       ai_enabled = COALESCE(EXCLUDED.ai_enabled, workflow_ai_policy.ai_enabled),
       autonomy_level = COALESCE(EXCLUDED.autonomy_level, workflow_ai_policy.autonomy_level),
       allowed_ai_actions = COALESCE(EXCLUDED.allowed_ai_actions, workflow_ai_policy.allowed_ai_actions),
       forbidden_actions = COALESCE(EXCLUDED.forbidden_actions, workflow_ai_policy.forbidden_actions),
       max_confidence_auto = COALESCE(EXCLUDED.max_confidence_auto, workflow_ai_policy.max_confidence_auto),
       require_human_review = COALESCE(EXCLUDED.require_human_review, workflow_ai_policy.require_human_review),
       override_tenant_config = COALESCE(EXCLUDED.override_tenant_config, workflow_ai_policy.override_tenant_config),
       updated_at = NOW()
     RETURNING *`,
    [
      workflowId,
      input.aiEnabled ?? true,
      input.autonomyLevel ?? 0,
      input.allowedAiActions || ['guidance', 'autofill'],
      input.forbiddenActions || [],
      input.maxConfidenceAuto ?? 0.95,
      input.requireHumanReview !== false,
      input.overrideTenantConfig ?? false,
    ],
  );

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'update',
    entityType: 'workflow_ai_policy',
    entityId: workflowId,
    afterState: input,
  });

  return mapRow(getFirstRow(result));
}

export async function resolveEffectiveAIPolicy(
  tenantId: string,
  workflowId: string,
): Promise<{
  aiEnabled: boolean;
  autonomyLevel: number;
  allowedAiActions: string[];
  forbiddenActions: string[];
  maxConfidenceAuto: number;
  requireHumanReview: boolean;
  source: 'workflow' | 'tenant';
}> {
  const wfPolicy = await getWorkflowAIPolicy(tenantId, workflowId);

  if (wfPolicy && wfPolicy.override_tenant_config) {
    return {
      aiEnabled: wfPolicy.ai_enabled,
      autonomyLevel: wfPolicy.autonomy_level,
      allowedAiActions: wfPolicy.allowed_ai_actions,
      forbiddenActions: wfPolicy.forbidden_actions,
      maxConfidenceAuto: wfPolicy.max_confidence_auto,
      requireHumanReview: wfPolicy.require_human_review,
      source: 'workflow',
    };
  }

  const { getAutonomousConfig } = await import('.././autonomous-workflow/config-state.js');
  const tenantConfig = await getAutonomousConfig(tenantId);

  const merged = {
    aiEnabled: wfPolicy ? wfPolicy.ai_enabled : tenantConfig.enabled,
    autonomyLevel: wfPolicy ? Math.min(wfPolicy.autonomy_level, (tenantConfig as any).autonomyLevel) : tenantConfig.autonomyLevel,
    allowedAiActions: wfPolicy ? wfPolicy.allowed_ai_actions : ['guidance', 'autofill'],
    forbiddenActions: wfPolicy ? wfPolicy.forbidden_actions : [],
    maxConfidenceAuto: wfPolicy ? Math.min(wfPolicy.max_confidence_auto, 0.95) : 0.95,
    requireHumanReview: wfPolicy ? (wfPolicy.require_human_review || tenantConfig.requireHumanReview) : tenantConfig.requireHumanReview,
    source: (wfPolicy ? 'workflow' : 'tenant') as 'workflow' | 'tenant',
  };

  return merged;
}

export async function deleteWorkflowAIPolicy(
  tenantId: string,
  userId: string,
  workflowId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".workflow_ai_policy WHERE workflow_id = $1`,
    [workflowId],
  );
  if ((result.rowCount ?? 0) === 0) return false;

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'delete',
    entityType: 'workflow_ai_policy',
    entityId: workflowId,
  });

  return true;
}

function mapRow(row: Record<string, unknown>): WorkflowAIPolicy {
  return {

    policy_id: row.policy_id,

    workflow_id: row.workflow_id,

    ai_enabled: row.ai_enabled ?? true,
    autonomy_level: Number(row.autonomy_level ?? 0),

    allowed_ai_actions: row.allowed_ai_actions || [],

    forbidden_actions: row.forbidden_actions || [],
    max_confidence_auto: Number(row.max_confidence_auto ?? 0.95),

    require_human_review: row.require_human_review ?? true,

    override_tenant_config: row.override_tenant_config ?? false,

    created_at: row.created_at,

    updated_at: row.updated_at,
  };
}
