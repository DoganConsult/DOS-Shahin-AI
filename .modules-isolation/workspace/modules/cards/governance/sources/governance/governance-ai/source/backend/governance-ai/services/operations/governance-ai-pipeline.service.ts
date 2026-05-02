/**
 * Governance AI Pipeline Orchestrator — AGRC-OS
 * Chains the 3-stage AI pipeline: Signal Detection → Interpretation → Escalation
 * Plus optional: Recommendation Generation and Narrative Summary
 */
import { runSignalScan, ScanResult } from '../intelligence/signal-detection.service';
import { interpretNewSignals, InterpretationResult } from '../intelligence/interpretation.service';
import { runEscalationScan, EscalationScanResult } from '../intelligence/escalation-engine.service';
import { generateRecommendationsForNewIssues, OrchestrationResult } from '../intelligence/action-orchestration.service';
import { generateScoreExplanation, ScoreExplanationResult } from '../intelligence/health-intelligence.service';
import { generateNarrativeSummary } from '../intelligence/narrative-engine.service';
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';
import { emitPipelineCompleted } from '../../events/governance_ai.publishers';

export interface PipelineResult {
  runId: string;
  tenantId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  stages: {
    signalScan: ScanResult | null;
    interpretation: InterpretationResult[];
    escalation: EscalationScanResult | null;
    recommendations: OrchestrationResult[];
    scoreExplanation: ScoreExplanationResult | null;
  };
  narrativeSummary: string;
  status: 'completed' | 'partial' | 'failed';
  errors: string[];
}

export type PipelineStage = 'signal_scan' | 'interpretation' | 'escalation' | 'recommendations' | 'score_explanation' | 'narrative';

export interface PipelineOptions {
  stages?: PipelineStage[];
  maxSignals?: number;
  dryRun?: boolean;
}

const ALL_STAGES: PipelineStage[] = [
  'signal_scan', 'interpretation', 'escalation', 'recommendations', 'score_explanation', 'narrative',
];

export async function runFullPipeline(
  tenantId: string,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const stages = options.stages || ALL_STAGES;
  const startedAt = new Date().toISOString();
  const start = Date.now();
  const errors: string[] = [];

  const schema = tenantSchema(tenantId);
  const runRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ id: 'manual' }]), safeQuery(`
    INSERT INTO "${schema}".governance_ai_runs (tenant_id, run_type, status)
    VALUES ($1, 'full_pipeline', 'started') RETURNING id
  `, [tenantId]), { tenantId: tenantId, operation: 'insert governance_ai_runs' });
  const runId = runRes.rows[0]?.id ?? 'manual';

  let signalScan: ScanResult | null = null;
  let interpretation: InterpretationResult[] = [];
  let escalation: EscalationScanResult | null = null;
  let recommendations: OrchestrationResult[] = [];
  let scoreExplanation: ScoreExplanationResult | null = null;
  let narrativeSummary = '';

  // Stage 1: Signal Detection
  if (stages.includes('signal_scan')) {
    try {
      signalScan = await runSignalScan(tenantId);
    } catch (err: unknown) {
      errors.push(`signal_scan: ${(err instanceof Error ? err.message : String(err))}`);
    }
  }

  // Stage 2: Interpretation
  if (stages.includes('interpretation')) {
    try {
      const batchResult = await interpretNewSignals(tenantId);
      interpretation = batchResult.signals;
    } catch (err: unknown) {
      errors.push(`interpretation: ${(err instanceof Error ? err.message : String(err))}`);
    }
  }

  // Stage 3: Escalation
  if (stages.includes('escalation')) {
    try {
      escalation = await runEscalationScan(tenantId);
    } catch (err: unknown) {
      errors.push(`escalation: ${(err instanceof Error ? err.message : String(err))}`);
    }
  }

  // Stage 4: Recommendation Generation
  if (stages.includes('recommendations')) {
    try {
      recommendations = await generateRecommendationsForNewIssues(tenantId);
    } catch (err: unknown) {
      errors.push(`recommendations: ${(err instanceof Error ? err.message : String(err))}`);
    }
  }

  // Stage 5: Score Explanation
  if (stages.includes('score_explanation')) {
    try {
      scoreExplanation = await generateScoreExplanation(tenantId);
    } catch (err: unknown) {
      errors.push(`score_explanation: ${(err instanceof Error ? err.message : String(err))}`);
    }
  }

  // Stage 6: Narrative Summary
  if (stages.includes('narrative')) {
    try {
      (narrativeSummary as any) = await generateNarrativeSummary(tenantId);
    } catch (err: unknown) {
      errors.push(`narrative: ${(err instanceof Error ? err.message : String(err))}`);
    }
  }

  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - start;
  const status = errors.length === 0 ? 'completed' : errors.length < stages.length ? 'partial' : 'failed';

  // Record pipeline completion
  await safeQuery(`
    UPDATE "${schema}".governance_ai_runs
    SET status = $2, completed_at = NOW(),
        result_json = $3::jsonb
    WHERE id = $1
  `, [
    runId, status,
    JSON.stringify({

      signalsCreated: signalScan?.signals_created ?? 0,
      issuesInterpreted: interpretation.length,
      escalationsCreated: escalation?.escalations_created ?? 0,
      recommendationsGenerated: recommendations.length,
      durationMs,
      errors,
    }),
  ]).catch(catchHandler(EC.EVENT_BUS, {}));

  // Publish pipeline completed event for analytics and observability
  emitPipelineCompleted(tenantId, runId, {
    status,
    durationMs,

    signalsCreated: signalScan?.signals_created ?? 0,
    issuesInterpreted: interpretation.length,
    escalationsCreated: escalation?.escalations_created ?? 0,
    recommendationsGenerated: recommendations.length,
    errors,
  });

  return {
    runId,
    tenantId,
    startedAt,
    completedAt,
    durationMs,
    stages: { signalScan, interpretation, escalation, recommendations, scoreExplanation },
    narrativeSummary,
    status,
    errors,
  };
}

export async function getPipelineHistory(tenantId: string, limit = 20) {
  const schema = tenantSchema(tenantId);
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT id, run_type, status, created_at, completed_at, result_json
    FROM "${schema}".governance_ai_runs
    WHERE tenant_id = $1 AND run_type = 'full_pipeline'
    ORDER BY created_at DESC LIMIT $2
  `, [tenantId, limit]), { tenantId: tenantId, operation: 'query governance_ai_runs' });
  return res.rows.map((r: GenericRow) => ({
    ...r,
    result_json: typeof r.result_json === 'string' ? JSON.parse(r.result_json) : r.result_json,
  }));
}
