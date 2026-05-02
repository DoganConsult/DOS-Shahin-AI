// ============================================
// Shahin — Analytics Benchmarking Service
// Cross-tenant benchmarking, linear regression,
// and KPI projection
// ============================================

import { safeQuery } from '../../ports/database.port';
import { getFirstRow as _getFirstRow } from '@dos/db';
import type { TenantKPIs } from '../misc/analytics.types';
import { computeKPIs } from './analytics-kpi.service';
import type { GenericRow } from '@dos/types';

// === Benchmarking ===

export interface BenchmarkResult {
  tenantKPIs: TenantKPIs;
  percentiles: {
    complianceScore: number;
    riskScore: number;
    evidenceCoverage: number;
    remediationClosureRate: number;
  };
  industryAvg: {
    complianceScore: number;
    riskScore: number;
    evidenceCoverage: number;
    remediationClosureRate: number;
  };
  sampleSize: number;
}

/**
 * Returns anonymized cross-tenant benchmark data.
 * Computes the requesting tenant's KPIs, then aggregates KPIs across all
 * active tenants to produce percentile rankings and industry averages.
 */
export async function getBenchmarkData(
  tenantId: string
): Promise<BenchmarkResult> {
  const tenantKPIs = await computeKPIs(tenantId);

  // Gather all active tenant schemas
  let allTenantRows: GenericRow[] = [];
  try {
    const tenantsResult = await safeQuery(
      `SELECT tenant_id FROM tenants WHERE status != 'deleted'`
    );
    allTenantRows = tenantsResult.rows;
  } catch {
    // If tenants table query fails, return just own KPIs with neutral percentiles
    return {
      tenantKPIs,
      percentiles: { complianceScore: 50, riskScore: 50, evidenceCoverage: 50, remediationClosureRate: 50 },
      industryAvg: { complianceScore: tenantKPIs.complianceScore, riskScore: tenantKPIs.riskScore, evidenceCoverage: tenantKPIs.evidenceCoverage, remediationClosureRate: tenantKPIs.remediationClosureRate },
      sampleSize: 1,
    };
  }

  // Compute KPIs for each tenant (best-effort, skip failures)
  const allKPIs: TenantKPIs[] = [];
  for (const row of allTenantRows) {
    try {
      const kpis = row.tenant_id === tenantId ? tenantKPIs : await computeKPIs(row.tenant_id);
      allKPIs.push(kpis);
    } catch {
      // Skip tenants whose schema may not exist yet
    }
  }

  if (allKPIs.length <= 1) {
    return {
      tenantKPIs,
      percentiles: { complianceScore: 50, riskScore: 50, evidenceCoverage: 50, remediationClosureRate: 50 },
      industryAvg: { complianceScore: tenantKPIs.complianceScore, riskScore: tenantKPIs.riskScore, evidenceCoverage: tenantKPIs.evidenceCoverage, remediationClosureRate: tenantKPIs.remediationClosureRate },
      sampleSize: allKPIs.length,
    };
  }

  // Helper: compute percentile rank of a value within a sorted array
  function percentileRank(values: number[], target: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const below = sorted.filter((v) => v < target).length;
    const equal = sorted.filter((v) => v === target).length;
    return Math.round(((below + equal * 0.5) / sorted.length) * 100);
  }

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  const complianceScores = allKPIs.map((k) => k.complianceScore);
  const riskScores = allKPIs.map((k) => k.riskScore);
  const evidenceScores = allKPIs.map((k) => k.evidenceCoverage);
  const remediationScores = allKPIs.map((k) => k.remediationClosureRate);

  return {
    tenantKPIs,
    percentiles: {
      complianceScore: percentileRank(complianceScores, tenantKPIs.complianceScore),
      riskScore: percentileRank(riskScores, tenantKPIs.riskScore),
      evidenceCoverage: percentileRank(evidenceScores, tenantKPIs.evidenceCoverage),
      remediationClosureRate: percentileRank(remediationScores, tenantKPIs.remediationClosureRate),
    },
    industryAvg: {
      complianceScore: Math.round(avg(complianceScores) * 100) / 100,
      riskScore: Math.round(avg(riskScores) * 100) / 100,
      evidenceCoverage: Math.round(avg(evidenceScores) * 100) / 100,
      remediationClosureRate: Math.round(avg(remediationScores) * 100) / 100,
    },
    sampleSize: allKPIs.length,
  };
}


// === Linear Regression & KPI Projection ===

/**
 * Pure linear regression: given data points [{x, y}], returns slope and intercept.
 * Requires minimum 2 data points.
 */
export function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } | null {
  if (points.length < 2) return null;
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * Projects a KPI value at a future date using linear regression on historical snapshots.
 * Returns null if fewer than 2 data points.
 */
export function projectKPI(
  snapshots: { date: Date; value: number }[],
  targetDate: Date
): number | null {
  if (snapshots.length < 2) return null;
  const baseTime = snapshots[0].date.getTime();
  const points = snapshots.map(s => ({
    x: (s.date.getTime() - baseTime) / (1000 * 60 * 60 * 24), // days from base
    y: s.value,
  }));
  const reg = linearRegression(points);
  if (!reg) return null;
  const targetX = (targetDate.getTime() - baseTime) / (1000 * 60 * 60 * 24);
  return reg.slope * targetX + reg.intercept;
}
