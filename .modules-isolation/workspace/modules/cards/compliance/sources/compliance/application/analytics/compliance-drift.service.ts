import { safeQuery, tenantSchema } from '../../ports/database.port';

export interface GapByFramework {
  frameworkCode: string;
  frameworkName: string;
  totalControls: number;
  implementedCount: number;
  gapCount: number;
  gapPercentage: number;
}

export interface ComplianceScoreSummary {
  overallScore: number;
  frameworkBreakdown: Array<{
    frameworkCode: string;
    score: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  lastUpdated: string;
}

export interface ComplianceDriftPoint {
  periodStart: string;
  periodEnd: string;
  frameworkCode: string | null;
  score: number;
  delta: number;
}

export async function getGapsByFramework(tenantId: string): Promise<GapByFramework[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       f.code AS framework_code,
       f.name AS framework_name,
       COUNT(c.id)::int AS total_controls,
       COUNT(c.id) FILTER (WHERE c.status IN ('implemented', 'compliant'))::int AS implemented_count,
       COUNT(c.id) FILTER (WHERE c.status NOT IN ('implemented', 'compliant', 'not_applicable'))::int AS gap_count
     FROM "${schema}".frameworks f
     LEFT JOIN "${schema}".controls c ON c.framework_id = f.id AND c.deleted_at IS NULL
     WHERE f.deleted_at IS NULL
     GROUP BY f.id, f.code, f.name
     ORDER BY gap_count DESC`,
  );

  return result.rows.map((row: Record<string, unknown>) => {
    const total = Number(row['total_controls']) || 0;
    const gap = Number(row['gap_count']) || 0;
    return {
      frameworkCode: row['framework_code'] as string,
      frameworkName: row['framework_name'] as string,
      totalControls: total,
      implementedCount: Number(row['implemented_count']) || 0,
      gapCount: gap,
      gapPercentage: total > 0 ? Math.round((gap / total) * 100) : 0,
    };
  });
}

export async function getComplianceScoreSummary(tenantId: string): Promise<ComplianceScoreSummary> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT
       f.code AS framework_code,
       COUNT(c.id)::int AS total,
       COUNT(c.id) FILTER (WHERE c.status IN ('implemented', 'compliant'))::int AS implemented,
       COUNT(c.id) FILTER (WHERE c.status = 'not_applicable')::int AS not_applicable
     FROM "${schema}".frameworks f
     LEFT JOIN "${schema}".controls c ON c.framework_id = f.id AND c.deleted_at IS NULL
     WHERE f.deleted_at IS NULL
     GROUP BY f.id, f.code`,
  );

  const breakdown: ComplianceScoreSummary['frameworkBreakdown'] = [];
  let totalControls = 0;
  let totalImplemented = 0;

  for (const row of result.rows as Record<string, unknown>[]) {
    const total = Number(row['total']) || 0;
    const notApplicable = Number(row['not_applicable']) || 0;
    const applicable = total - notApplicable;
    const implemented = Number(row['implemented']) || 0;
    const score = applicable > 0 ? Math.round((implemented / applicable) * 100) : 0;

    totalControls += applicable;
    totalImplemented += implemented;

    breakdown.push({
      frameworkCode: row['framework_code'] as string,
      score,
      trend: 'stable',
    });
  }

  const overallScore = totalControls > 0 ? Math.round((totalImplemented / totalControls) * 100) : 0;

  return {
    overallScore,
    frameworkBreakdown: breakdown,
    lastUpdated: new Date().toISOString(),
  };
}

export async function getComplianceDrift(
  tenantId: string,
  options: { frameworkCode?: string; periods?: number } = {},
): Promise<ComplianceDriftPoint[]> {
  const schema = tenantSchema(tenantId);
  const periods = options.periods ?? 6;

  const params: unknown[] = [periods];
  let frameworkFilter = '';
  if (options.frameworkCode) {
    params.push(options.frameworkCode);
    frameworkFilter = `AND framework_code = $${params.length}`;
  }

  const result = await safeQuery(
    `SELECT
       period_start,
       period_end,
       framework_code,
       overall_score AS score
     FROM "${schema}".compliance_score_history
     WHERE period_start >= NOW() - ($1 * INTERVAL '1 month')
       ${frameworkFilter}
     ORDER BY period_start ASC, framework_code`,
    params,
  );

  const points: ComplianceDriftPoint[] = [];
  const prevScores: Record<string, number> = {};

  for (const row of result.rows as Record<string, unknown>[]) {
    const key = String(row['framework_code'] ?? 'overall');
    const score = Number(row['score']) || 0;
    const delta = key in prevScores ? score - prevScores[key]! : 0;
    prevScores[key] = score;

    points.push({
      periodStart: String(row['period_start']),
      periodEnd: String(row['period_end']),
      frameworkCode: row['framework_code'] ? String(row['framework_code']) : null,
      score,
      delta,
    });
  }

  return points;
}
