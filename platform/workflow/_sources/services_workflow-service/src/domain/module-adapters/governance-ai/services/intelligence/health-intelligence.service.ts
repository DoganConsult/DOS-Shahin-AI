/**
 * workflow-service — governance-ai / health-intelligence adapter.
 *
 * Computes a score explanation for the tenant's governance health dashboard.
 * Reads the most recent governance health score row and produces a concise
 * factor-weighted explanation. LLM narrative generation is delegated to
 * governance-service via `governance.score_explanation.requested` so this
 * adapter stays deterministic and test-friendly.
 */
import { safeQuery } from '@dos/db';
import { publish } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface ScoreExplanation {
  score: number;
  /** snake_case accessor kept for legacy activity callers. */
  overall_score: number;
  band: 'critical' | 'poor' | 'fair' | 'good' | 'excellent';
  summary: string;
  factors: Array<{ name: string; weight: number; contribution: number }>;
  generatedAt: string;
}

function bandOf(score: number): ScoreExplanation['band'] {
  if (score < 20) return 'critical';
  if (score < 40) return 'poor';
  if (score < 60) return 'fair';
  if (score < 80) return 'good';
  return 'excellent';
}

export async function generateScoreExplanation(tenantId: string): Promise<ScoreExplanation> {
  let score = 0;
  let factors: Array<{ name: string; weight: number; contribution: number }> = [];

  try {
    const res = await safeQuery(
      `SELECT score, factors
         FROM public.governance_health_scores
        WHERE tenant_id = $1
        ORDER BY computed_at DESC
        LIMIT 1`,
      [tenantId],
    );
    const row = res.rows[0] as
      | { score: number; factors: Array<{ name: string; weight: number; contribution: number }> }
      | undefined;
    if (row) {
      score = typeof row.score === 'number' ? row.score : 0;
      factors = Array.isArray(row.factors) ? row.factors : [];
    }
  } catch (err) {
    logger.warn('[HealthIntelligence] score lookup failed', {
      tenantId, error: toErrorMessage(err),
    });
  }

  const band = bandOf(score);
  const top = factors
    .slice()
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3);
  const summary =
    top.length > 0
      ? `Band ${band} (score ${score}). Top drivers: ${top
          .map((f) => `${f.name} (${f.contribution > 0 ? '+' : ''}${f.contribution.toFixed(1)})`)
          .join(', ')}.`
      : `Band ${band} (score ${score}). No factor data available yet.`;

  await publish('governance.score_explanation.requested', tenantId, {
    score, band, generatedAt: new Date().toISOString(),
  });

  return {
    score,
    overall_score: score,
    band,
    summary,
    factors: top,
    generatedAt: new Date().toISOString(),
  };
}
