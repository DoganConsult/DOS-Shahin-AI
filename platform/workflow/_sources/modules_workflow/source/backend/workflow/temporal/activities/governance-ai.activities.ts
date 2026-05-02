import { logger } from '../../modules/governance-os/platform/services/misc/logger.service';
import { assertTenantId } from '@dos/db';
import { runGovernancePipeline } from '../../ai/governance/governance-pipeline';
import { createTypedTimeout } from '../resilience/activity-timeout';
import { executeWithBreaker } from '../resilience/circuit-breaker';
import { toErrorMessage } from '@dos/platform-core/resilience';

export interface GovernancePipelineResult {
  tenantId: string;
  runId: string;
  approved: boolean;
  requiresHumanReview: boolean;
  riskScore: number;
  flags: string[];
  recommendation: string;
  auditTrailId?: string;
  error?: string;
}

export async function runGovernanceAiCycle(tenantId: string): Promise<GovernancePipelineResult> {
  assertTenantId(tenantId);
  const runId = `gov-${tenantId}-${Date.now()}`;
  try {
    const aiTimeout = createTypedTimeout('ai', 'governance-pipeline', 150_000);
    const result = await executeWithBreaker(
      'governance-ai',
      () =>
        aiTimeout(() =>
          runGovernancePipeline({
            tenantId,
            userId: 'system',
            workflowId: runId,
            action: 'governance-ai-cycle',
          }),
        ),
    );
    return {
      tenantId,
      runId,
      approved: result.approved,
      requiresHumanReview: result.requiresHumanReview,
      riskScore: result.riskScore,
      flags: result.flags,
      recommendation: result.recommendation,
      auditTrailId: result.auditTrailId,
    };
  } catch (err: unknown) {
    return { tenantId, runId, approved: false, requiresHumanReview: true, riskScore: 0, flags: [], recommendation: '', error: toErrorMessage(err) };
  }
}

export async function runSignalScanActivity(tenantId: string): Promise<{ signalsCreated: number; errors: string[] }> {
  assertTenantId(tenantId);
  try {
    const { runSignalScan } = await import('../../modules/governance-ai/services/intelligence/signal-detection.service.js');
    const aiTimeout = createTypedTimeout('ai', 'signalScan', 150_000);
    const result = await aiTimeout(() => runSignalScan(tenantId));
    return { signalsCreated: (result as any).signals_created ?? 0, errors: (result as any).errors ?? [] };
  } catch (err: unknown) {
    return { signalsCreated: 0, errors: [toErrorMessage(err)] };
  }
}

export async function runInterpretationActivity(tenantId: string): Promise<{ issuesCreated: number }> {
  assertTenantId(tenantId);
  try {
    const { interpretNewSignals } = await import('../../modules/governance-ai/services/intelligence/interpretation.service.js');
    const aiTimeout = createTypedTimeout('ai', 'interpretation');
    const issues = await aiTimeout(() => interpretNewSignals(tenantId));
    return { issuesCreated: Array.isArray(issues) ? issues.length : 0 };
  } catch (err: unknown) {
    logger.warn(`[GovernanceAI] interpretation non-fatal: ${toErrorMessage(err)}`);
    return { issuesCreated: 0 };
  }
}

export async function runRecommendationsActivity(tenantId: string): Promise<{ recommendationsCreated: number }> {
  assertTenantId(tenantId);
  try {
    const { generateRecommendationsForNewIssues } = await import('../../modules/governance-ai/services/intelligence/action-orchestration.service.js');
    const aiTimeout = createTypedTimeout('ai', 'recommendations');
    const recs = await aiTimeout(() => generateRecommendationsForNewIssues(tenantId));
    return { recommendationsCreated: Array.isArray(recs) ? recs.length : 0 };
  } catch (err: unknown) {
    logger.warn(`[GovernanceAI] recommendations non-fatal: ${toErrorMessage(err)}`);
    return { recommendationsCreated: 0 };
  }
}

export async function runEscalationActivity(tenantId: string): Promise<{ escalationsCreated: number }> {
  assertTenantId(tenantId);
  try {
    const { runEscalationScan } = await import('../../modules/governance-ai/services/intelligence/escalation-engine.service.js');
    const aiTimeout = createTypedTimeout('ai', 'escalation');
    const result = await aiTimeout(() => runEscalationScan(tenantId));
    return { escalationsCreated: (result as any).escalations_created ?? 0 };
  } catch (err: unknown) {
    logger.warn(`[GovernanceAI] escalation non-fatal: ${toErrorMessage(err)}`);
    return { escalationsCreated: 0 };
  }
}

export async function runHealthIntelligenceActivity(tenantId: string): Promise<{ healthScore: number }> {
  assertTenantId(tenantId);
  try {
    const { generateScoreExplanation } = await import('../../modules/governance-ai/services/intelligence/health-intelligence.service.js');
    const aiTimeout = createTypedTimeout('ai', 'healthIntelligence');
    const result = await aiTimeout(() => generateScoreExplanation(tenantId));
    return { healthScore: (result as any)?.overall_score ?? 0 };
  } catch (err: unknown) {
    logger.warn(`[GovernanceAI] health non-fatal: ${toErrorMessage(err)}`);
    return { healthScore: 0 };
  }
}

export async function runNarrativeActivity(tenantId: string): Promise<{ narrative: string }> {
  assertTenantId(tenantId);
  try {
    const { generateNarrativeSummary } = await import('../../modules/governance-ai/services/intelligence/narrative-engine.service.js');
    const aiTimeout = createTypedTimeout('ai', 'narrative');
    const narrative = await aiTimeout(() => generateNarrativeSummary(tenantId));
    return { narrative: typeof narrative === 'string' ? narrative : '' };
  } catch (err: unknown) {
    logger.warn(`[GovernanceAI] narrative non-fatal: ${toErrorMessage(err)}`);
    return { narrative: '' };
  }
}
