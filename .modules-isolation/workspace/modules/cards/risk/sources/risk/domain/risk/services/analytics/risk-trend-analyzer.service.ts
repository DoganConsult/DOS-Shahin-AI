// ============================================
// Shahin — Risk Trend Analyzer Service
// Trend data points with anomaly detection
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';

export interface TrendPoint {
  date: string;
  value: number;
  isAnomaly: boolean;
  severity?: string;
}

export interface TrendAnalysis {
  points: TrendPoint[];
  trend: 'improving' | 'stable' | 'worsening';
  avgScore: number;
}

export async function analyzeTrend(
  tenantId: string,
  period: 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<TrendAnalysis> {
  const schema = tenantSchema(tenantId);
  const intervalMap = { week: '7 days', month: '30 days', quarter: '90 days', year: '365 days' };
  const interval = intervalMap[period];

  // secrets-scan-allow: interval from typed TimePeriod union; schema tenantSchema()-validated
  const result = await safeQuery(
    `SELECT DATE(created_at) as date, AVG(risk_score)::float as avg_score, COUNT(*)::int as count
     FROM "${schema}".risks
     WHERE created_at >= NOW() - INTERVAL '${interval}'
     GROUP BY DATE(created_at)
     ORDER BY date`
  );

  if (result.rows.length === 0) {
    return { points: [], trend: 'stable', avgScore: 0 };
  }

  const values = result.rows.map((r: GenericRow) => r.avg_score || 0);
  const mean = values.reduce((s: number, v: number) => s + v, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / values.length);

  const points: TrendPoint[] = result.rows.map((r: GenericRow) => {
    const value = r.avg_score || 0;
    const zScore = stdDev > 0 ? Math.abs(value - mean) / stdDev : 0;
    return {
      date: r.date?.toISOString?.() || r.date,
      value: Math.round(value * 100) / 100,
      isAnomaly: zScore > 2,
      severity: zScore > 3 ? 'critical' : zScore > 2 ? 'warning' : undefined,
    };
  });

  // Determine trend direction from first/last third averages
  const third = Math.max(1, Math.floor(values.length / 3));
  const firstThird = values.slice(0, third).reduce((s: number, v: number) => s + v, 0) / third;
  const lastThird = values.slice(-third).reduce((s: number, v: number) => s + v, 0) / third;
  const diff = lastThird - firstThird;
  const trend = diff < -1 ? 'improving' : diff > 1 ? 'worsening' : 'stable';

  return { points, trend, avgScore: Math.round(mean * 100) / 100 };
}
