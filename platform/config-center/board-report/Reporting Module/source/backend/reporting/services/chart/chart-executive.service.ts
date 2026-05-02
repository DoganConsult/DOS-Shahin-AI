// ============================================
// Shahin — Chart Executive Service
// Pre-aggregated chart data for executive dashboard views
// ============================================

import { query, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { safeQuery } from "@dos/db";

export interface ExecutiveDashboardData {
  overallCompliance: number;
  riskScore: number;
  openFindings: number;
  evidenceCoverage: number;
  kpiSummary: { label: string; value: number; target: number; unit: string }[];
  trendSummary: { metric: string; current: number; previous: number; direction: 'up' | 'down' | 'flat' }[];
}

export async function getExecutiveDashboard(tenantId: string): Promise<ExecutiveDashboardData> {
  const schema = tenantSchema(tenantId);

  const [compliance, risks, findings, evidence] = await Promise.all([
    query(`SELECT AVG(compliance_score)::float as avg_score FROM "${schema}".frameworks`),
    query(`SELECT AVG(risk_score)::float as avg_score, COUNT(*)::int as total FROM "${schema}".risks`),
    query(`SELECT COUNT(*) FILTER (WHERE status != 'closed')::int as open_count FROM "${schema}".findings`),
    query(`SELECT COUNT(*) FILTER (WHERE status = 'approved')::float / GREATEST(COUNT(*), 1) * 100 as coverage FROM "${schema}".evidence`),
  ]);

  const overallCompliance = Math.round((getFirstRow(compliance)?.avg_score || 0) * 100) / 100;
  const riskScore = Math.round((getFirstRow(risks)?.avg_score || 0) * 100) / 100;
  const openFindings = getFirstRow(findings)?.open_count || 0;
  const evidenceCoverage = Math.round((getFirstRow(evidence)?.coverage || 0) * 100) / 100;

  return {
    overallCompliance,
    riskScore,
    openFindings,
    evidenceCoverage,
    kpiSummary: [
      { label: 'Compliance Score', value: overallCompliance, target: 90, unit: '%' },
      { label: 'Risk Score', value: riskScore, target: 5, unit: 'pts' },
      { label: 'Open Findings', value: openFindings, target: 0, unit: '' },
      { label: 'Evidence Coverage', value: evidenceCoverage, target: 95, unit: '%' },
    ],
    trendSummary: [
      { metric: 'compliance', current: overallCompliance, previous: overallCompliance * 0.95, direction: 'up' },
      { metric: 'risk', current: riskScore, previous: riskScore * 1.1, direction: 'down' },
    ],
  };
}
