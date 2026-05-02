/**
 * Stage 3: AI & Agent Guardrails Evaluation Service
 * Orchestrates the 4 evaluation batteries against all 12 agents.
 * Stores per-agent scores in qgate_ai_eval_scores.
 */

import { safeQuery, tenantSchema, assertTenantId } from '../../ports/database.port';
import { createAgentTestHarness } from '../../../../tests/quality-gate/30-ai-guardrails/helpers/agent-test-harness';
import { createSimilarityComputer } from '../../../../tests/quality-gate/30-ai-guardrails/helpers/embedding-similarity';
import { createCanaryManager } from '../../../../tests/quality-gate/30-ai-guardrails/helpers/canary-seeder';
import { createLangfuseEvaluator } from '../../../../tests/quality-gate/30-ai-guardrails/helpers/langfuse-evaluator';
import { runInjectionBattery } from '../../../../tests/quality-gate/30-ai-guardrails/batteries/injection-battery';
import { runRelevanceBattery } from '../../../../tests/quality-gate/30-ai-guardrails/batteries/relevance-battery';
import { runIsolationBattery } from '../../../../tests/quality-gate/30-ai-guardrails/batteries/isolation-battery';
import { runHallucinationBattery } from '../../../../tests/quality-gate/30-ai-guardrails/batteries/hallucination-battery';
import { computeVerdict, type BatteryResult as _BatteryResult } from '../../../../tests/quality-gate/30-ai-guardrails/scoring';
import type { StageResult, AiGuardrailsReport as _AiGuardrailsReport } from '../../contracts/quality-gate.contracts';

const ALL_AGENTS = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12'];

export async function evaluateAiGuardrails(tenantId: string, runId: string, opts?: {
  agents?: string[];
  liveLlm?: boolean;
}): Promise<StageResult> {
  const start = Date.now();
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const agents = opts?.agents ?? ALL_AGENTS;

  const harness = createAgentTestHarness();
  const similarity = createSimilarityComputer();
  const canary = createCanaryManager();
  const langfuse = createLangfuseEvaluator();

  const traceId = langfuse.createTrace('quality-gate:ai-guardrails', { tenantId, runId });

  // Run all 4 batteries
  const injection = await runInjectionBattery(tenantId, agents, harness);
  const relevance = await runRelevanceBattery(tenantId, harness, similarity);
  const isolation = await runIsolationBattery(harness, canary);
  const hallucination = await runHallucinationBattery(tenantId, harness);

  // Log scores to Langfuse
  langfuse.logBatteryScore(traceId, injection);
  langfuse.logBatteryScore(traceId, relevance);
  langfuse.logBatteryScore(traceId, isolation);
  langfuse.logBatteryScore(traceId, hallucination);
  await langfuse.flush();

  // Persist per-battery scores
  const batteries = { injection, relevance, isolation, hallucination };
  for (const [code, battery] of Object.entries(batteries)) {
    await safeQuery(
      `INSERT INTO "${schema}".qgate_ai_eval_scores
       (run_id, tenant_id, battery_code, agent_id, tests_run, tests_passed,
        score, threshold, passed, failures, langfuse_trace_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [runId, tenantId, code, 'ALL', battery.testsRun, battery.testsPassed,
       battery.score, battery.threshold, battery.verdict === 'PASS',
       JSON.stringify(battery.failures), traceId],
    );
  }

  const verdict = computeVerdict(batteries);
  const blockers: StageResult['blockers'] = [];

  if (injection.verdict === 'FAIL') {
    blockers.push({ code: 'AI_INJECTION', message: `Injection battery: ${injection.testsFailed} failures`, severity: 'critical' });
  }
  if (isolation.verdict === 'FAIL') {
    blockers.push({ code: 'AI_ISOLATION', message: `Tenant isolation breach: ${isolation.testsFailed} failures`, severity: 'critical' });
  }
  if (relevance.verdict === 'FAIL') {
    blockers.push({ code: 'AI_RELEVANCE', message: `Relevance score ${(relevance.score * 100).toFixed(1)}% below threshold`, severity: 'warning' });
  }
  if (hallucination.verdict === 'FAIL') {
    blockers.push({ code: 'AI_HALLUCINATION', message: `Hallucination score ${(hallucination.score * 100).toFixed(1)}% below threshold`, severity: 'warning' });
  }

  const avgScore = (injection.score + relevance.score + isolation.score + hallucination.score) / 4;

  return {
    stageCode: 'ai-guardrails',
    stageNumber: 3,
    passed: verdict !== 'FAIL',
    score: avgScore,
    threshold: 1.0,
    durationMs: Date.now() - start,
    blockers,
    details: { verdict, batteries, langfuseTraceId: traceId },
  };
}

export async function getAiEvalHistory(tenantId: string, opts?: { agentId?: string }): Promise<Record<string, unknown>[]> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const conditions = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  if (opts?.agentId) {
    conditions.push(`agent_id = $${params.length + 1}`);
    params.push(opts.agentId);
  }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".qgate_ai_eval_scores WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 200`,
    params,
  );
  return result.rows;
}
