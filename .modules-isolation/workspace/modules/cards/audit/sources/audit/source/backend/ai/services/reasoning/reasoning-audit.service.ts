import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
/**
 * Reasoning Audit Service — Pillar 3: Explainability
 *
 * Persists every agent reasoning step for full audit trail.
 * Meets EU AI Act Article 52 transparency requirements.
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';

export interface ReasoningStep {
  stepIndex: number;
  nodeId: string;         // LangGraph node: contextLoader, reasoning, toolExecution, etc.
  reasoning: string;      // What the agent was thinking
  toolsUsed: string[];    // Tools called in this step
  inputSummary?: string;  // Abbreviated input context
  outputSummary?: string; // Abbreviated output
  confidence?: number;    // 0-1 confidence score
  durationMs: number;     // Time spent on this step
  tokensUsed?: number;    // Tokens consumed
}

export interface ReasoningTrace {
  runId: string;
  agentId: string;
  tenantId: string;
  steps: ReasoningStep[];
  totalDurationMs: number;
  totalTokens: number;
  overallConfidence: number;
  startedAt: string;
  completedAt: string;
}

/**
 * Persist a complete reasoning trace for an agent run.
 */
export async function persistReasoningTrace(tenantId: string, trace: ReasoningTrace): Promise<void> {
  const s = tenantSchema(tenantId);

  // Persist the trace summary
  await safeQuery(
    `INSERT INTO "${s}".agent_reasoning_traces
     (run_id, agent_id, total_steps, total_duration_ms, total_tokens, overall_confidence, started_at, completed_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (run_id) DO UPDATE SET
       total_steps = EXCLUDED.total_steps,
       total_duration_ms = EXCLUDED.total_duration_ms,
       total_tokens = EXCLUDED.total_tokens,
       overall_confidence = EXCLUDED.overall_confidence`,
    [trace.runId, trace.agentId, trace.steps.length, trace.totalDurationMs, trace.totalTokens, trace.overallConfidence, trace.startedAt, trace.completedAt]
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  // Persist individual steps
  for (const step of trace.steps) {
    await safeQuery(
      `INSERT INTO "${s}".agent_reasoning_steps
       (run_id, step_index, node_id, reasoning, tools_used, input_summary, output_summary, confidence, duration_ms, tokens_used, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (run_id, step_index) DO NOTHING`,
      [trace.runId, step.stepIndex, step.nodeId, step.reasoning, JSON.stringify(step.toolsUsed),
       step.inputSummary?.slice(0, 500), step.outputSummary?.slice(0, 500), step.confidence, step.durationMs, step.tokensUsed || 0]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }
}

/**
 * Retrieve the full reasoning trace for an agent run.
 */
export async function getReasoningTrace(tenantId: string, runId: string): Promise<ReasoningTrace | null> {
  const s = tenantSchema(tenantId);

  const traceResult = await safeQuery(
    `SELECT * FROM "${s}".agent_reasoning_traces WHERE run_id = $1`, [runId]
  );
  if (!traceResult.rows[0]) return null;
  const t = traceResult.rows[0] as Record<string, unknown>;

  const stepsResult = await safeQuery(
    `SELECT * FROM "${s}".agent_reasoning_steps WHERE run_id = $1 ORDER BY step_index`, [runId]
  );

  return {
    runId: t.run_id as string,
    agentId: t.agent_id as string,
    tenantId,
    steps: stepsResult.rows.map((r: Record<string, unknown>) => ({
      stepIndex: r.step_index as number,
      nodeId: r.node_id as string,
      reasoning: r.reasoning as string,
      toolsUsed: (r.tools_used as string[]) || [],
      inputSummary: r.input_summary as string | undefined,
      outputSummary: r.output_summary as string | undefined,
      confidence: r.confidence as number | undefined,
      durationMs: r.duration_ms as number,
      tokensUsed: r.tokens_used as number | undefined,
    })),
    totalDurationMs: t.total_duration_ms as number,
    totalTokens: t.total_tokens as number,
    overallConfidence: t.overall_confidence as number,
    startedAt: t.started_at as string,
    completedAt: t.completed_at as string,
  };
}

/**
 * Get reasoning traces for an agent with pagination.
 */
export async function getAgentReasoningHistory(tenantId: string, agentId: string, limit: number = 20): Promise<Record<string, unknown>[]> {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT run_id, agent_id, total_steps, total_duration_ms, total_tokens, overall_confidence, started_at, completed_at
     FROM "${s}".agent_reasoning_traces
     WHERE agent_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [agentId, limit]
  );
  return result.rows as Record<string, unknown>[];
}

/**
 * Compute multi-factor confidence score for an action.
 */
export function computeConfidence(factors: {
  evidenceStrength: number;      // 0-1: how much data supports the action
  historicalAccuracy: number;    // 0-1: past approval rate for this action type
  domainConfidence: number;      // 0-1: agent's track record in this domain
  dataCompleteness: number;      // 0-1: how complete the input data was
}): { score: number; breakdown: Record<string, number>; uncertaintyFlag: boolean } {
  const weights = { evidenceStrength: 0.3, historicalAccuracy: 0.25, domainConfidence: 0.25, dataCompleteness: 0.2 };
  const score =
    factors.evidenceStrength * weights.evidenceStrength +
    factors.historicalAccuracy * weights.historicalAccuracy +
    factors.domainConfidence * weights.domainConfidence +
    factors.dataCompleteness * weights.dataCompleteness;

  return {
    score: Math.round(score * 100) / 100,
    breakdown: {
      evidenceStrength: factors.evidenceStrength,
      historicalAccuracy: factors.historicalAccuracy,
      domainConfidence: factors.domainConfidence,
      dataCompleteness: factors.dataCompleteness,
    },
    uncertaintyFlag: score < 0.4 || factors.dataCompleteness < 0.3,
  };
}

/**
 * Get approval/rejection statistics for confidence calibration.
 */
export async function getHistoricalAccuracy(tenantId: string, agentId: string, actionType?: string): Promise<number> {
  const s = tenantSchema(tenantId);
  try {
    const params: string[] = [agentId];
    let query = `SELECT
         COUNT(*) FILTER (WHERE status = 'executed' OR status = 'approved') AS approved,
         COUNT(*) AS total
       FROM "${s}".agent_runs
       WHERE agent_id = $1 AND started_at > NOW() - INTERVAL '30 days'`;
    if (actionType) {
      query += ` AND action_type = $2`;
      params.push(actionType);
    }
    const result = await safeQuery(query, params);
    const row = result.rows[0] as Record<string, unknown>;
    const total = Number(row?.total || 0);
    if (total === 0) return 0.7; // default for new agents
    return Number(row?.approved || 0) / total;
  } catch { return 0.7; }
}
