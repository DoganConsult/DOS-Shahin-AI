/**
 * Governance AI pipeline — orchestrates the 6 intelligence adapters into a
 * single typed cycle. Called from the Temporal `runGovernanceAiCycle`
 * activity. Each step is resilient: a failure in one stage is captured in
 * the `error` field but does not block later stages from running, so the
 * pipeline produces a best-effort typed `GovernancePipelineOutput` even
 * when parts of the DAuth/governance DB schema are still provisioning.
 */
import { runSignalScan } from '../../module-adapters/governance-ai/services/intelligence/signal-detection.service.js';
import { interpretNewSignals, type InterpretedIssue } from '../../module-adapters/governance-ai/services/intelligence/interpretation.service.js';
import { generateRecommendationsForNewIssues, type Recommendation } from '../../module-adapters/governance-ai/services/intelligence/action-orchestration.service.js';
import { runEscalationScan } from '../../module-adapters/governance-ai/services/intelligence/escalation-engine.service.js';
import { generateScoreExplanation } from '../../module-adapters/governance-ai/services/intelligence/health-intelligence.service.js';
import { generateNarrativeSummary } from '../../module-adapters/governance-ai/services/intelligence/narrative-engine.service.js';
import { toErrorMessage } from '@dos/types/errors';

export interface DetectedSignalSummary {
  id: string;
  signal_type?: string;
}

export interface EscalationSummary {
  issueId?: string;
}

export interface GovernancePipelineOutput {
  signals: DetectedSignalSummary[];
  issues: InterpretedIssue[];
  recommendations: Recommendation[];
  escalations: EscalationSummary[];
  healthScore: number;
  narrative: string;
  error?: string;
}

export async function runGovernancePipeline(
  tenantId: string,
): Promise<GovernancePipelineOutput> {
  const errors: string[] = [];

  const scan = await runSignalScan(tenantId).catch((err) => {
    errors.push(`signal_scan: ${toErrorMessage(err)}`);
    return { signalsCreated: 0, signals_created: 0, run_id: '', errors: [] };
  });

  const issues = await interpretNewSignals(tenantId).catch((err) => {
    errors.push(`interpretation: ${toErrorMessage(err)}`);
    return [] as InterpretedIssue[];
  });

  const recommendations = await generateRecommendationsForNewIssues(tenantId).catch((err) => {
    errors.push(`recommendations: ${toErrorMessage(err)}`);
    return [] as Recommendation[];
  });

  const escalationScan = await runEscalationScan(tenantId).catch((err) => {
    errors.push(`escalation: ${toErrorMessage(err)}`);
    return { escalated: 0, escalations_created: 0, errors: [] };
  });

  const health = await generateScoreExplanation(tenantId).catch((err) => {
    errors.push(`health: ${toErrorMessage(err)}`);
    return null;
  });

  const narrative = await generateNarrativeSummary(tenantId).catch((err) => {
    errors.push(`narrative: ${toErrorMessage(err)}`);
    return '';
  });

  // The scan result doesn't expose the full signal list (that lives in DB);
  // surface a summary shape that the caller's length-based reducer handles.
  const signals: DetectedSignalSummary[] = Array.from(
    { length: scan.signalsCreated ?? 0 },
    (_, i) => ({ id: `${scan.run_id}-${i}` }),
  );
  const escalations: EscalationSummary[] = Array.from(
    { length: escalationScan.escalated ?? 0 },
    () => ({}),
  );

  return {
    signals,
    issues,
    recommendations,
    escalations,
    healthScore: health?.score ?? 0,
    narrative,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}
