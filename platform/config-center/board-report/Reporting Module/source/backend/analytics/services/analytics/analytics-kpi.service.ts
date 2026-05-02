// Phase 11 (M5) — analytics KPI shim. The canonical KPI aggregator is
// owned by analytics-service; this stub keeps reporting's board-reports
// routes loadable until the analytics extraction re-exposes the helper.

import type { TenantKPIs } from '../misc/analytics.types';

export interface AnalyticsKpiResult {
  key: string;
  value: number | string;
  trend?: 'up' | 'down' | 'flat';
  windowDays?: number;
}

export async function computeAnalyticsKpi(
  _tenantId: string,
  _key: string,
  _opts: Record<string, unknown> = {},
): Promise<AnalyticsKpiResult> {
  return { key: _key, value: 0, trend: 'flat' };
}

export async function listAnalyticsKpis(
  _tenantId: string,
  _opts: Record<string, unknown> = {},
): Promise<AnalyticsKpiResult[]> {
  return [];
}

export async function computeKPIs(tenantId: string, opts: Record<string, unknown> = {}): Promise<TenantKPIs> {
  const entries = await listAnalyticsKpis(tenantId, opts);
  const kpis: TenantKPIs = { computedAt: new Date() };
  for (const e of entries) {
    kpis[e.key] = e.value;
  }
  if (kpis.complianceScore == null) kpis.complianceScore = 0;
  if (kpis.riskScore == null) kpis.riskScore = 0;
  if (kpis.evidenceCoverage == null) kpis.evidenceCoverage = 0;
  if (kpis.remediationClosureRate == null) kpis.remediationClosureRate = 0;
  if (kpis.vendorHealthScore == null) kpis.vendorHealthScore = 0;
  if (kpis.vendorRiskExposure == null) kpis.vendorRiskExposure = 0;
  kpis.computedAt = kpis.computedAt instanceof Date ? kpis.computedAt : new Date();
  return kpis;
}
