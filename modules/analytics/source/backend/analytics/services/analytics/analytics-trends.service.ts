// ============================================
// Shahin — Analytics Trends Service
// KPI aggregation jobs and trend retrieval
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

import { pushToTenant } from '../../ports/events.port';
import { getFirstRow as _getFirstRow } from '@dos/db';
import type { KPISnapshot } from '../misc/analytics.types';
import { computeKPIs } from './analytics-kpi.service';
import type { GenericRow } from '@dos/types';

// === KPI Aggregation & Trends ===

/**
 * Runs the daily KPI aggregation job for a tenant.
 * Computes current KPIs and inserts a snapshot row for today's date.
 */
export async function runAggregationJob(tenantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const kpis = await computeKPIs(tenantId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await safeQuery(
    `INSERT INTO "${schema}".kpi_snapshots (snapshot_date, compliance_score, risk_score, evidence_coverage, remediation_closure_rate, raw_data) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      today,
      kpis.complianceScore,
      kpis.riskScore,
      kpis.evidenceCoverage,
      kpis.remediationClosureRate,
      JSON.stringify(kpis),
    ]
  );

  // Push KPI update to all connected tenant users via WebSocket
  try {
    pushToTenant(tenantId, {
      type: 'kpi_update',
      data: kpis,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // WebSocket push is best-effort; don't fail the aggregation job
  }
}

/**
 * Returns KPI trend snapshots for a tenant within a date range.
 * Results are ordered by snapshot_date ascending.
 */
export async function getKPITrends(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<KPISnapshot[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT snapshot_id, snapshot_date, compliance_score, risk_score, evidence_coverage, remediation_closure_rate, raw_data, created_at
     FROM "${schema}".kpi_snapshots
     WHERE snapshot_date BETWEEN $1 AND $2
     ORDER BY snapshot_date ASC`,
    [startDate, endDate]
  );

  return result.rows.map((row: GenericRow) => ({
    snapshotId: row.snapshot_id,
    snapshotDate: new Date(row.snapshot_date),
    complianceScore: parseFloat(row.compliance_score) || 0,
    riskScore: parseFloat(row.risk_score) || 0,
    evidenceCoverage: parseFloat(row.evidence_coverage) || 0,
    remediationClosureRate: parseFloat(row.remediation_closure_rate) || 0,
    rawData: typeof row.raw_data === "string" ? JSON.parse(row.raw_data) : row.raw_data || {},
    createdAt: new Date(row.created_at),
  }));
}
