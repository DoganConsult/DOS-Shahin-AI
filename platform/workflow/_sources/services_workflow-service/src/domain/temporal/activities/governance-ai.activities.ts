import { logger } from '@dos/platform-core/observability';
import { assertTenantId } from '@dos/db';
import { runGovernancePipeline } from '../../ai/governance/governance-pipeline';
import { createTypedTimeout } from '../resilience/activity-timeout';
import { executeWithBreaker } from '../resilience/circuit-breaker';
import { toErrorMessage } from '@dos/platform-core/resilience';

export interface GovernancePipelineResult {
  tenantId: string;
  runId: string;
  signalsCreated: number;
  issuesInterpreted: number;
  recommendationsGenerated: number;
  escalationsCreated: number;
  healthScore: number;
  narrative: string;
  error?: string;
}

export async function runGovernanceAiCycle(tenantId: string): Promise<GovernancePipelineResult> {
  assertTenantId(tenantId);
  const runId = `gov-${tenantId}-${Date.now()}`;
  try {
    const aiTimeout = createTypedTimeout('ai', 'governance-pipeline', 150_000);
    const result = await executeWithBreaker('governance-ai', () => aiTimeout(() => runGovernancePipeline(tenantId)));
    return {
      tenantId,
      runId,
      signalsCreated: result.signals?.length ?? 0,
      issuesInterpreted: result.issues?.length ?? 0,
      recommendationsGenerated: result.recommendations?.length ?? 0,
      escalationsCreated: result.escalations?.length ?? 0,
      healthScore: result.healthScore ?? 0,
      narrative: result.narrative ?? '',
      error: result.error || undefined,
    };
  } catch (err: unknown) {
    return { tenantId, runId, signalsCreated: 0, issuesInterpreted: 0, recommendationsGenerated: 0, escalationsCreated: 0, healthScore: 0, narrative: '', error: toErrorMessage(err) };
  }
}

export async function runSignalScanActivity(tenantId: string): Promise<{ signalsCreated: number; errors: string[] }> {
  assertTenantId(tenantId);
  try {
    const { runSignalScan } = await import('../../module-adapters/governance-ai/services/intelligence/signal-detection.service.js');
    const aiTimeout = createTypedTimeout('ai', 'signalScan', 150_000);
    const result = await aiTimeout(() => runSignalScan(tenantId));
    return { signalsCreated: (result as any).signals_created, errors: result.errors };
  } catch (err: unknown) {
    return { signalsCreated: 0, errors: [toErrorMessage(err)] };
  }
}

export async function runInterpretationActivity(tenantId: string): Promise<{ issuesCreated: number }> {
  assertTenantId(tenantId);
  try {
    const { interpretNewSignals } = await import('../../module-adapters/governance-ai/services/intelligence/interpretation.service.js');
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
    const { generateRecommendationsForNewIssues } = await import('../../module-adapters/governance-ai/services/intelligence/action-orchestration.service.js');
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
    const { runEscalationScan } = await import('../../module-adapters/governance-ai/services/intelligence/escalation-engine.service.js');
    const aiTimeout = createTypedTimeout('ai', 'escalation');
    const result = await aiTimeout(() => runEscalationScan(tenantId));
    return { escalationsCreated: result.escalations_created };
  } catch (err: unknown) {
    logger.warn(`[GovernanceAI] escalation non-fatal: ${toErrorMessage(err)}`);
    return { escalationsCreated: 0 };
  }
}

export async function runHealthIntelligenceActivity(tenantId: string): Promise<{ healthScore: number }> {
  assertTenantId(tenantId);
  try {
    const { generateScoreExplanation } = await import('../../module-adapters/governance-ai/services/intelligence/health-intelligence.service.js');
    const aiTimeout = createTypedTimeout('ai', 'healthIntelligence');
    const result = await aiTimeout(() => generateScoreExplanation(tenantId));
    return { healthScore: result?.overall_score ?? 0 };
  } catch (err: unknown) {
    logger.warn(`[GovernanceAI] health non-fatal: ${toErrorMessage(err)}`);
    return { healthScore: 0 };
  }
}

export async function runNarrativeActivity(tenantId: string): Promise<{ narrative: string }> {
  assertTenantId(tenantId);
  try {
    const { generateNarrativeSummary } = await import('../../module-adapters/governance-ai/services/intelligence/narrative-engine.service.js');
    const aiTimeout = createTypedTimeout('ai', 'narrative');
    const narrative = await aiTimeout(() => generateNarrativeSummary(tenantId));
    return { narrative: typeof narrative === 'string' ? narrative : '' };
  } catch (err: unknown) {
    logger.warn(`[GovernanceAI] narrative non-fatal: ${toErrorMessage(err)}`);
    return { narrative: '' };
  }
}
