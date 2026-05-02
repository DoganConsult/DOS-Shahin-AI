// ============================================
// Shahin -- Risk Heatmap Workspace Service
// Workspace-oriented heatmap and inherent-to-residual
// migration vectors for the risk workspace UI
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

/**
 * Build a 5x5 heatmap grouped by likelihood x impact,
 * including per-cell risk lists and overall severity summary.
 */
export async function getRiskHeatmap(tenantId: string, mode: string = 'inherent', _filters?: Record<string, string>): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(`
    SELECT likelihood, impact, COUNT(*)::int AS count,
           ARRAY_AGG(risk_id) AS "riskIds",
           ARRAY_AGG(json_build_object(
             'riskId', risk_id, 'title', title, 'status', status, 'owner', owner
           )) AS risks
    FROM "${schema}".risks
    WHERE deleted_at IS NULL
    GROUP BY likelihood, impact
    ORDER BY likelihood, impact
  `);

  const summaryResult = await safeQuery(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE risk_score >= 20)::int AS critical,
      COUNT(*) FILTER (WHERE risk_score >= 15)::int AS high,
      COUNT(*) FILTER (WHERE risk_score >= 8)::int AS medium,
      COUNT(*) FILTER (WHERE risk_score < 8)::int AS low
    FROM "${schema}".risks WHERE deleted_at IS NULL
  `);

  return {
    mode,
    cells: result.rows.map((r: GenericRow) => ({
      likelihood: r.likelihood,
      impact: r.impact,
      count: r.count,
      riskIds: r.riskIds || [],
      risks: r.risks || [],
    })),
    summary: getFirstRow(summaryResult) || { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
    labels: {
      likelihood: ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'],
      impact: ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'],
    },
  };
}

/**
 * Compute inherent-to-residual migration vectors for every active risk.
 * Used by the heatmap migration visualization (arrows from inherent to
 * residual position).
 */
export async function getHeatmapMigration(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  try {
    // Get current risks with inherent and residual scores
    const result = await safeQuery(`
      SELECT r.risk_id AS "riskId", r.title, r.category,
             r.likelihood AS "inherentLikelihood", r.impact AS "inherentImpact",
             (r.likelihood * r.impact) AS "inherentScore",
             r.risk_score AS "residualScore",
             r.control_ids
      FROM "${schema}".risks r
      WHERE r.deleted_at IS NULL
      ORDER BY r.risk_score DESC
    `);

    // Compute residual likelihood/impact approximation
    return result.rows.map((r: GenericRow) => {
      const inherentScore = r.inherentScore || (r.inherentLikelihood * r.inherentImpact);
      const residualScore = r.residualScore || inherentScore;
      const ratio = inherentScore > 0 ? residualScore / inherentScore : 1;
      const sqrtRatio = Math.sqrt(ratio);
      return {
        riskId: r.riskId,
        title: r.title,
        category: r.category,
        inherent: { likelihood: r.inherentLikelihood, impact: r.inherentImpact },
        residual: {
          likelihood: Math.max(1, Math.round(r.inherentLikelihood * sqrtRatio)),
          impact: Math.max(1, Math.round(r.inherentImpact * sqrtRatio)),
        },
        reduction: inherentScore - residualScore,
      };
    });
  } catch { return []; }
}
