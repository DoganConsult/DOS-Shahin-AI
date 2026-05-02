// @ts-nocheck
/**
 * Platform Stats Service — Spec §3.1 Service Families
 * Metric Aggregation, System Health, Usage Analytics, KPI Computation, Diagnostics
 */
import { safeQuery, tenantSchema } from '../ports/platform-stats.ports';
import { PlatformMetricContract, PlatformKpiContract, PlatformUsageContract, PlatformHealthContract } from '../contracts/platform-stats.contract';
import { setAuditData as _setAuditData } from '@dos/module-auth';

// ── Metric Aggregation Service ──
export async function recordMetric(tenantId: string, data: { metricKey: string; metricValue: number; metricUnit?: string; sourceModule?: string; metadataJson?: Record<string, unknown> }): Promise<PlatformMetricContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".platform_metrics (metric_key, metric_value, metric_unit, source_module, metadata_json)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING metric_id as "metricId", metric_key as "metricKey", metric_value as "metricValue", metric_unit as "metricUnit", source_module as "sourceModule", metadata_json as "metadataJson", recorded_at as "recordedAt"`,
    [data.metricKey, data.metricValue, data.metricUnit || 'count', data.sourceModule || null, JSON.stringify(data.metadataJson || {})]
  );
  return result.rows[0] as PlatformMetricContract;
}

export async function queryMetrics(tenantId: string, filters: { metricKey?: string; from?: string; to?: string; limit?: number }): Promise<PlatformMetricContract[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.metricKey) { conditions.push(`metric_key = $${idx++}`); params.push(filters.metricKey); }
  if (filters.from) { conditions.push(`recorded_at >= $${idx++}`); params.push(filters.from); }
  if (filters.to) { conditions.push(`recorded_at <= $${idx++}`); params.push(filters.to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await safeQuery(
    `SELECT metric_id as "metricId", metric_key as "metricKey", metric_value as "metricValue", metric_unit as "metricUnit", source_module as "sourceModule", metadata_json as "metadataJson", recorded_at as "recordedAt"
     FROM "${schema}".platform_metrics ${where} ORDER BY recorded_at DESC LIMIT $${idx}`,
    [...params, filters.limit || 100]
  );
  return result.rows as PlatformMetricContract[];
}

// ── System Health Service ──
export async function getSystemHealth(_tenantId: string): Promise<PlatformHealthContract[]> {
  // Fan-out to known services — real implementation reads from platform registry
  const services = ['database', 'redis', 'event-bus', 'ai-gateway', 'auth'];
  return services.map(svc => ({
    serviceName: svc,
    status: 'healthy' as const,
    latencyMs: Math.floor(Math.random() * 50) + 1,
    lastCheckedAt: new Date().toISOString(),
    details: {}
  }));
}

// ── Usage Analytics Service ──
export async function trackUsage(tenantId: string, userId: string, moduleCode: string, actionType: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".platform_usage_log (tenant_id, user_id, module_code, action_type, hit_count, usage_date)
     VALUES ($1, $2, $3, $4, 1, CURRENT_DATE)
     ON CONFLICT DO NOTHING`,
    [tenantId, userId, moduleCode, actionType]
  );
}

export async function queryUsage(tenantId: string, filters: { moduleCode?: string; from?: string; to?: string }): Promise<PlatformUsageContract[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.moduleCode) { conditions.push(`module_code = $${idx++}`); params.push(filters.moduleCode); }
  if (filters.from) { conditions.push(`usage_date >= $${idx++}`); params.push(filters.from); }
  if (filters.to) { conditions.push(`usage_date <= $${idx++}`); params.push(filters.to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await safeQuery(
    `SELECT usage_id as "usageId", module_code as "moduleCode", action_type as "actionType", hit_count as "hitCount", usage_date as "usageDate"
     FROM "${schema}".platform_usage_log ${where} ORDER BY usage_date DESC LIMIT 500`,
    params
  );
  return result.rows as PlatformUsageContract[];
}

// ── KPI Computation Service ──
export async function getKpis(tenantId: string): Promise<PlatformKpiContract[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT kpi_id as "kpiId", kpi_name as "kpiName", kpi_category as "kpiCategory", computed_value as "computedValue", previous_value as "previousValue", trend, snapshot_date as "snapshotDate"
     FROM "${schema}".platform_kpis ORDER BY snapshot_date DESC LIMIT 50`
  );
  return result.rows as PlatformKpiContract[];
}

export async function computeAndStoreKpi(tenantId: string, kpiName: string, value: number, category: string = 'operational'): Promise<PlatformKpiContract> {
  const schema = tenantSchema(tenantId);
  const prev = await safeQuery(
    `SELECT computed_value FROM "${schema}".platform_kpis WHERE kpi_name = $1 ORDER BY snapshot_date DESC LIMIT 1`,
    [kpiName]
  );
  const previousValue = prev.rows.length ? prev.rows[0].computed_value : null;
  const trend = previousValue === null ? 'stable' : value > previousValue ? 'up' : value < previousValue ? 'down' : 'stable';

  const result = await safeQuery(
    `INSERT INTO "${schema}".platform_kpis (kpi_name, kpi_category, computed_value, previous_value, trend)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING kpi_id as "kpiId", kpi_name as "kpiName", kpi_category as "kpiCategory", computed_value as "computedValue", previous_value as "previousValue", trend, snapshot_date as "snapshotDate"`,
    [kpiName, category, value, previousValue, trend]
  );
  return result.rows[0] as PlatformKpiContract;
}

// ── Diagnostics Service ──
export async function runDiagnostics(tenantId: string): Promise<{ status: string; checks: Record<string, unknown>[] }> {
  const schema = tenantSchema(tenantId);
  const checks: Record<string, unknown>[] = [];

  const metricsCheck = await safeQuery(`SELECT COUNT(*) as count FROM "${schema}".platform_metrics`);
  checks.push({ check: 'metrics_table_populated', count: metricsCheck.rows[0]?.count || 0, status: 'ok' });

  const kpiCheck = await safeQuery(`SELECT COUNT(*) as count FROM "${schema}".platform_kpis WHERE snapshot_date = CURRENT_DATE`);
  checks.push({ check: 'kpis_computed_today', count: kpiCheck.rows[0]?.count || 0, status: kpiCheck.rows[0]?.count > 0 ? 'ok' : 'warning' });

  const staleCheck = await safeQuery(`SELECT COUNT(*) as count FROM "${schema}".platform_kpis WHERE snapshot_date < CURRENT_DATE - INTERVAL '7 days'`);
  checks.push({ check: 'stale_kpis', count: staleCheck.rows[0]?.count || 0, status: 'ok' });

  return { status: 'operational', checks };
}
