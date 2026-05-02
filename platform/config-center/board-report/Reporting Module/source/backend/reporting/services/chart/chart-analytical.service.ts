// ============================================
// Shahin — Chart Analytical Service
// Pre-aggregated chart data for analytical dashboard views
// ============================================

import { query, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';
import { safeQuery } from "@dos/db";

export interface AnalyticalDashboardData {
  riskDistribution: { category: string; count: number }[];
  complianceTrend: { date: string; score: number }[];
  controlEffectiveness: { domain: string; effective: number; total: number }[];
  topFindings: { title: string; severity: string; count: number }[];
}

export async function getAnalyticalDashboard(tenantId: string): Promise<AnalyticalDashboardData> {
  const schema = tenantSchema(tenantId);

  const [riskDist, compTrend, ctrlEff, findings] = await Promise.all([
    query(`SELECT category, COUNT(*)::int as count FROM "${schema}".risks GROUP BY category ORDER BY count DESC LIMIT 10`),
    query(`SELECT DATE(updated_at) as date, AVG(compliance_score)::float as score FROM "${schema}".frameworks GROUP BY DATE(updated_at) ORDER BY date DESC LIMIT 30`),
    query(`SELECT domain, COUNT(*) FILTER (WHERE status = 'effective')::int as effective, COUNT(*)::int as total FROM "${schema}".controls GROUP BY domain ORDER BY domain LIMIT 20`),
    query(`SELECT title, severity, COUNT(*)::int as count FROM "${schema}".findings GROUP BY title, severity ORDER BY count DESC LIMIT 10`),
  ]);

  return {
    riskDistribution: riskDist.rows.map((r: GenericRow) => ({ category: r.category, count: r.count })),
    complianceTrend: compTrend.rows.map((r: GenericRow) => ({ date: r.date?.toISOString?.() || '', score: r.score || 0 })),
    controlEffectiveness: ctrlEff.rows.map((r: GenericRow) => ({ domain: r.domain, effective: r.effective, total: r.total })),
    topFindings: findings.rows.map((r: GenericRow) => ({ title: r.title, severity: r.severity, count: r.count })),
  };
}
