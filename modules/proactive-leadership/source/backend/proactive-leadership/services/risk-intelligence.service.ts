import { safeQuery, tenantSchema } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { logger } from '../ports/logger.port';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export interface RiskIntelligence {
  tenantId: string;
  generatedAt: string;
  overallRiskScore: number;
  riskTrend: 'improving' | 'stable' | 'worsening';
  topRisks: Array<{ id: string; title: string; score: number; category: string }>;
  unmitigatedCount: number;
  appetiteBreaches: number;
  trendData: Array<{ date: string; avgScore: number }>;
}

export async function getRiskIntelligence(tenantId: string): Promise<RiskIntelligence> {
  const schema = tenantSchema(tenantId);
  const intel: RiskIntelligence = {
    tenantId, generatedAt: new Date().toISOString(), overallRiskScore: 0,
    riskTrend: 'stable', topRisks: [], unmitigatedCount: 0, appetiteBreaches: 0, trendData: [],
  };

  let querySucceeded = false;

  try {
    const { rows: scoreRows } = await safeQuery(
      `SELECT COALESCE(AVG(risk_score), 0)::numeric(5,1) AS avg_score,
              COUNT(*) FILTER (WHERE treatment_status IS NULL OR treatment_status = 'open')::int AS unmitigated
       FROM "${schema}".risks WHERE status != 'closed'`,
    );
    if (scoreRows.length > 0) {
      intel.overallRiskScore = Number(scoreRows[0].avg_score);
      intel.unmitigatedCount = scoreRows[0].unmitigated;
    }
    querySucceeded = true;
  } catch {}

  try {
    const { rows: topRows } = await safeQuery(
      `SELECT risk_id AS id, title, risk_score AS score, category
       FROM "${schema}".risks WHERE status != 'closed' ORDER BY risk_score DESC NULLS LAST LIMIT 10`,
    );
    (intel as any).topRisks = topRows.map(( r: Record<string, unknown>) => ({ id: r.id, title: r.title ?? '', score: Number(r.score ?? 0), category: r.category ?? 'operational' }));
    querySucceeded = true;
  } catch {}

  try {
    const { rows: trendRows } = await safeQuery(
      `SELECT DATE(created_at) AS date, AVG(risk_score)::numeric(5,1) AS avg_score
       FROM "${schema}".risks WHERE created_at >= NOW() - INTERVAL '90 days'
       GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30`,
    );
    intel.trendData = trendRows.map(( r: Record<string, unknown>) => ({ date: String(r.date), avgScore: Number(r.avg_score ?? 0) }));
    if (intel.trendData.length >= 2) {
      const recent = intel.trendData[0].avgScore;
      const older = intel.trendData[intel.trendData.length - 1].avgScore;
      intel.riskTrend = recent < older - 1 ? 'improving' : recent > older + 1 ? 'worsening' : 'stable';
    }
    querySucceeded = true;
  } catch {}

  if (querySucceeded) {
    emitEvent(({
          tenantId, userId: SYSTEM_JOB_ACTOR, module: 'proactive-leadership', event: 'intelligence.generated',
          entityType: 'risk_intelligence', entityId: `intel-${intel.generatedAt}`,
          data: {
            overallRiskScore: intel.overallRiskScore, riskTrend: intel.riskTrend,
            topRisksCount: intel.topRisks.length, unmitigatedCount: intel.unmitigatedCount,
            appetiteBreaches: intel.appetiteBreaches,
          },
        } as any)).catch((e) => logger.warn('[proactive-leadership] risk intelligence event failed', { error: (e as Error).message }));
  }

  logger.info('[proactive-leadership] risk intelligence generated', {
    tenantId, overallRiskScore: intel.overallRiskScore, riskTrend: intel.riskTrend,
  });

  return intel;
}
