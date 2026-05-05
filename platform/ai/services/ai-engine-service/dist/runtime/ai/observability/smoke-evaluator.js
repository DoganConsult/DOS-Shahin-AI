// AI-OS Wave 2 — Post-trace smoke evaluator + production-promotion gate.
//
// Runs the canonical evaluateAgainstSmokeDataset() helper after every
// LLM call (best-effort, async, never blocking). Persists each score
// into public.ai_smoke_scores so the platform can compute rolling
// readiness per agent and gate the Langfuse prompt-label promotion to
// 'production' on a sustained ≥ 0.7 mean over ≥ 5 evaluations.
import { logger } from '../ports/logger.port';
const PROMOTION_GATE = {
    minScore: 0.7,
    minSamples: 5,
};
/**
 * Score one LLM result against the agent's smoke dataset and persist.
 * Returns {score, total, samples, mean, eligibleForProduction}. Best-effort:
 * any failure (DB unavailable, dataset empty, Langfuse offline) returns
 * a zeroed reading instead of throwing.
 */
export async function recordAndScore(rec) {
    if (!rec.agentId)
        return { score: 0, total: 0, samples: 0, mean: 0, eligibleForProduction: false };
    let evalResult;
    try {
        const { evaluateAgainstSmokeDataset } = await import('../../../domain/agrc-engine/observability/langfuse-bridge.js');
        evalResult = await evaluateAgainstSmokeDataset({
            agentCode: rec.agentId,
            output: rec.output ?? {},
        });
    }
    catch (err) {
        logger.warn(`[smoke-evaluator] eval failed: ${err.message}`);
        return { score: 0, total: 0, samples: 0, mean: 0, eligibleForProduction: false };
    }
    // No dataset items → can't gate; report zero but don't error.
    if (evalResult.total === 0) {
        return { score: 0, total: 0, samples: 0, mean: 0, eligibleForProduction: false };
    }
    // Persist the score and read back rolling mean.
    try {
        const { safeQuery } = await import('@dos/db');
        await safeQuery(`INSERT INTO public.ai_smoke_scores
         (agent_code, score, matched, total, trace_ref, prompt_version)
       VALUES ($1, $2, $3, $4, $5, $6)`, [rec.agentId, evalResult.score, evalResult.matched, evalResult.total, rec.traceRef ?? null, rec.promptVersion ?? null]);
        // Rolling readiness over the most recent 20 evaluations.
        const r = await safeQuery(`SELECT count(*)::int AS n, avg(score)::numeric(5,4) AS mean
         FROM (
           SELECT score FROM public.ai_smoke_scores
            WHERE agent_code = $1
            ORDER BY evaluated_at DESC
            LIMIT 20
         ) recent`, [rec.agentId]);
        const samples = Number(r?.rows?.[0]?.n ?? 0);
        const mean = Number(r?.rows?.[0]?.mean ?? 0);
        const eligibleForProduction = samples >= PROMOTION_GATE.minSamples && mean >= PROMOTION_GATE.minScore;
        if (eligibleForProduction) {
            logger.info(`[smoke-evaluator] ${rec.agentId} eligible for production (mean=${mean.toFixed(3)} samples=${samples})`);
        }
        return { score: evalResult.score, total: evalResult.total, samples, mean, eligibleForProduction };
    }
    catch (err) {
        logger.warn(`[smoke-evaluator] persist failed: ${err.message}`);
        return { score: evalResult.score, total: evalResult.total, samples: 0, mean: 0, eligibleForProduction: false };
    }
}
/**
 * Operator-facing readiness snapshot. Returns the rolling stats per
 * agent so dashboards / promotion CLIs can see who's ready before
 * flipping a Langfuse prompt label to 'production'.
 */
export async function getPromotionReadiness() {
    try {
        const { safeQuery } = await import('@dos/db');
        const r = await safeQuery(`SELECT agent_code,
              count(*)::int AS samples,
              avg(score)::numeric(5,4) AS mean,
              max(evaluated_at) AS last_evaluated_at
         FROM (
           SELECT agent_code, score, evaluated_at,
                  row_number() OVER (PARTITION BY agent_code ORDER BY evaluated_at DESC) AS rn
             FROM public.ai_smoke_scores
         ) ranked
        WHERE rn <= 20
        GROUP BY agent_code
        ORDER BY agent_code`, []);
        return (r?.rows || []).map((row) => {
            const samples = Number(row.samples);
            const mean = Number(row.mean);
            return {
                agentCode: row.agent_code,
                samples,
                mean,
                eligibleForProduction: samples >= PROMOTION_GATE.minSamples && mean >= PROMOTION_GATE.minScore,
                lastEvaluatedAt: row.last_evaluated_at ? new Date(row.last_evaluated_at).toISOString() : null,
            };
        });
    }
    catch (err) {
        logger.warn(`[smoke-evaluator] readiness query failed: ${err.message}`);
        return [];
    }
}
//# sourceMappingURL=smoke-evaluator.js.map