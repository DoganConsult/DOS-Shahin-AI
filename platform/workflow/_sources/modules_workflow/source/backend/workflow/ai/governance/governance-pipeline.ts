import { logger } from '@dos/module-sdk';
import { safeQuery } from '../../ports/database.port';

export interface GovernancePipelineInput {
  tenantId: string;
  userId: string;
  workflowId: string;
  action: string;
  context?: Record<string, unknown>;
}

export interface GovernancePipelineResult {
  approved: boolean;
  requiresHumanReview: boolean;
  riskScore: number;
  flags: string[];
  recommendation: string;
  auditTrailId?: string;
}

async function evaluatePolicyCompliance(
  tenantId: string,
  action: string,
): Promise<{ compliant: boolean; flags: string[] }> {
  const flags: string[] = [];

  const result = await safeQuery(
    `SELECT policy_code, rule_json
     FROM public.ai_governance_policies
     WHERE tenant_id = $1
       AND applies_to_action = $2
       AND is_active = true`,
    [tenantId, action],
  );

  if (result.rows.length === 0) {
    return { compliant: true, flags };
  }

  for (const row of result.rows as Record<string, unknown>[]) {
    const rule = row['rule_json'] as Record<string, unknown> | null;
    if (rule?.['flag']) {
      flags.push(String(rule['flag']));
    }
  }

  return { compliant: flags.length === 0, flags };
}

async function recordAuditTrail(
  tenantId: string,
  input: GovernancePipelineInput,
  result: Omit<GovernancePipelineResult, 'auditTrailId'>,
): Promise<string | undefined> {
  try {
    const auditResult = await safeQuery(
      `INSERT INTO public.ai_governance_audit_trail
         (tenant_id, user_id, workflow_id, action, risk_score, approved, flags, recommendation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        tenantId,
        input.userId,
        input.workflowId,
        input.action,
        result.riskScore,
        result.approved,
        JSON.stringify(result.flags),
        result.recommendation,
      ],
    );
    return auditResult.rows[0]?.['id'] as string | undefined;
  } catch (err) {
    logger.warn({ err, tenantId, workflowId: input.workflowId }, '[GovernancePipeline] audit trail write failed');
    return undefined;
  }
}

function computeRiskScore(
  action: string,
  flags: string[],
  context: Record<string, unknown>,
): number {
  let score = 0;

  const highRiskActions = ['delete', 'bulk_delete', 'override', 'bypass', 'escalate', 'force_close'];
  if (highRiskActions.some((a) => action.toLowerCase().includes(a))) {
    score += 40;
  }

  score += Math.min(flags.length * 15, 45);

  if (context['bulk'] === true) score += 15;
  if (context['external'] === true) score += 10;

  return Math.min(score, 100);
}

export async function runGovernancePipeline(
  input: GovernancePipelineInput,
): Promise<GovernancePipelineResult> {
  const { tenantId, action, context = {} } = input;

  logger.debug({ tenantId, workflowId: input.workflowId, action }, '[GovernancePipeline] evaluating');

  const { compliant, flags } = await evaluatePolicyCompliance(tenantId, action);

  const riskScore = computeRiskScore(action, flags, context);

  const approved = compliant && riskScore < 70;
  const requiresHumanReview = riskScore >= 50 || flags.length > 0;

  let recommendation: string;
  if (riskScore >= 70) {
    recommendation = 'Block: High risk score detected. Manual review required before proceeding.';
  } else if (requiresHumanReview) {
    recommendation = 'Review: Moderate risk detected. Proceed with caution and log justification.';
  } else {
    recommendation = 'Approve: Action is within governance policy bounds.';
  }

  const partialResult: Omit<GovernancePipelineResult, 'auditTrailId'> = {
    approved,
    requiresHumanReview,
    riskScore,
    flags,
    recommendation,
  };

  const auditTrailId = await recordAuditTrail(tenantId, input, partialResult);

  logger.info(
    { tenantId, workflowId: input.workflowId, action, approved, riskScore },
    '[GovernancePipeline] evaluation complete',
  );

  return { ...partialResult, auditTrailId };
}
