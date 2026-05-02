/**
 * Executive module — AI recommendations.
 *
 * Produces rule-based executive-level insights derived from tenant KPI
 * snapshots, risk posture, and open incident counts. Shaped as a
 * Recommendation[] consumed by <app-ai-insight-panel>.
 *
 * W5 task — fills the previous stub that returned [].
 */

import { safeQuery, tenantSchema } from '@dos/db';

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Recommendation {
  title: string;
  description: string;
  priority: RecommendationPriority;
  category: string;
  recommendedAction?: string;
}

async function fetchExecutiveContext(tenantId: string) {
  const schema = tenantSchema(tenantId);
  try {
    const [kpi, risks, incidents, compliance] = await Promise.all([
      safeQuery(
        `SELECT compliance_score, risk_score FROM "${schema}".kpi_snapshots
           ORDER BY snapshot_date DESC LIMIT 1`,
      ),
      safeQuery(
        `SELECT COUNT(*) FILTER (WHERE risk_score >= 12 AND status='open')::int AS high_open,
                COUNT(*)::int AS total
         FROM "${schema}".risks WHERE deleted_at IS NULL`,
      ),
      safeQuery(
        `SELECT COUNT(*) FILTER (WHERE severity IN ('critical','high') AND status='open')::int AS critical_open
         FROM "${schema}".incidents WHERE deleted_at IS NULL`,
      ),
      safeQuery(
        `SELECT AVG(compliance_score)::numeric(5,2) AS avg_score
         FROM "${schema}".frameworks WHERE total_controls > 0`,
      ),
    ]);

    return {
      complianceScore: Number(kpi.rows?.[0]?.compliance_score ?? 0),
      riskScore: Number(kpi.rows?.[0]?.risk_score ?? 0),
      highOpenRisks: Number(risks.rows?.[0]?.high_open ?? 0),
      totalRisks: Number(risks.rows?.[0]?.total ?? 0),
      criticalIncidents: Number(incidents.rows?.[0]?.critical_open ?? 0),
      frameworkAvgScore: Number(compliance.rows?.[0]?.avg_score ?? 0),
    };
  } catch {
    return {
      complianceScore: 0,
      riskScore: 0,
      highOpenRisks: 0,
      totalRisks: 0,
      criticalIncidents: 0,
      frameworkAvgScore: 0,
    };
  }
}

export async function getAiRecommendations(
  tenantId: string,
  _context: Record<string, unknown> = {},
): Promise<Recommendation[]> {
  const ctx = await fetchExecutiveContext(tenantId);
  const out: Recommendation[] = [];

  if (ctx.criticalIncidents > 0) {
    out.push({
      title: 'Active critical incidents require executive attention',
      description: `${ctx.criticalIncidents} critical/high-severity incident(s) open. Schedule a status review with the incident commander.`,
      priority: 'critical',
      category: 'incident',
      recommendedAction: 'Convene incident status review within 24h',
    });
  }

  if (ctx.highOpenRisks > 5) {
    out.push({
      title: 'Elevated high-risk count',
      description: `${ctx.highOpenRisks} of ${ctx.totalRisks} risks are high-severity and open. Risk committee should review treatment plans.`,
      priority: 'high',
      category: 'risk',
      recommendedAction: 'Add to next risk committee agenda',
    });
  }

  if (ctx.complianceScore > 0 && ctx.complianceScore < 70) {
    out.push({
      title: 'Compliance score below executive target',
      description: `Current compliance is ${ctx.complianceScore}%, under the 70% board target.`,
      priority: 'high',
      category: 'compliance',
      recommendedAction: 'Request gap analysis from compliance lead',
    });
  }

  if (ctx.frameworkAvgScore > 0 && ctx.frameworkAvgScore < 75) {
    out.push({
      title: 'Framework coverage gap',
      description: `Average framework coverage is ${ctx.frameworkAvgScore}%. Prioritize controls with lowest coverage.`,
      priority: 'medium',
      category: 'compliance',
    });
  }

  if (out.length === 0) {
    out.push({
      title: 'Executive dashboard clear',
      description: 'No elevated-priority items detected. Continue monitoring trends and scheduled reviews.',
      priority: 'low',
      category: 'strategic',
    });
  }

  return out;
}
