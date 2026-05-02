import { proxyActivities } from '@temporalio/workflow';
import type * as govActivities from '../../activities/governance-ai.activities';
import type { GovernanceAiInput, GovernanceAiResult } from '../../types/workflow-types';

const acts = proxyActivities<typeof govActivities>({
  startToCloseTimeout: '10m',
  retry: { initialInterval: '5s', backoffCoefficient: 2, maximumAttempts: 3, maximumInterval: '60s' },
});

const nonFatal = proxyActivities<typeof govActivities>({
  startToCloseTimeout: '5m',
  retry: { maximumAttempts: 1 },
});

export async function governanceAiPipelineWorkflow(input: GovernanceAiInput): Promise<GovernanceAiResult> {
  const startMs = Date.now();
  const { tenantId } = input;
  const runId = input.runId || `gov-${tenantId}-${Date.now()}`;

  const signals = await acts.runSignalScanActivity(tenantId);
  const issues = signals.signalsCreated > 0 ? await acts.runInterpretationActivity(tenantId) : { issuesCreated: 0 };
  const recs = issues.issuesCreated > 0 ? await nonFatal.runRecommendationsActivity(tenantId) : { recommendationsCreated: 0 };
  const escalations = await nonFatal.runEscalationActivity(tenantId);
  const health = await nonFatal.runHealthIntelligenceActivity(tenantId);
  const narrative = await nonFatal.runNarrativeActivity(tenantId);

  return {
    tenantId,
    runId,
    signalsCreated: signals.signalsCreated,
    issuesInterpreted: issues.issuesCreated,
    recommendationsGenerated: recs.recommendationsCreated,
    escalationsCreated: escalations.escalationsCreated,
    healthScore: health.healthScore,
    narrative: narrative.narrative,
    durationMs: Date.now() - startMs,
  };
}
