// ============================================
// AGRC-OS — Performance Regression Detector
// Detects performance regressions in agent runs
// Requirements: ai-os-10.2
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';

export interface RegressionConfig {
  agentId?: string;
  metric: 'latency' | 'success_rate' | 'cost' | 'error_rate';
  baselineWindowDays: number; // Days to use for baseline
  detectionWindowDays: number; // Days to compare against baseline
  thresholdPct: number; // Percentage change to trigger alert (e.g., 20 = 20% worse)
  minSampleSize: number; // Minimum samples needed
}

export interface RegressionAlert {
  id: string;
  tenantId: string;
  agentId?: string;
  metric: string;
  baselineValue: number;
  currentValue: number;
  changePct: number;
  severity: 'info' | 'warning' | 'critical';
  detectedAt: Date;
  acknowledged: boolean;
}

/**
 * Detect regressions for an agent
 */
export async function detectRegressions(
  tenantId: string,
  config: RegressionConfig
): Promise<RegressionAlert[]> {
  const schema = tenantSchema(tenantId);
  const alerts: RegressionAlert[] = [];

  const baselineEnd = new Date();
  baselineEnd.setDate(baselineEnd.getDate() - config.detectionWindowDays);
  const baselineStart = new Date(baselineEnd);
  baselineStart.setDate(baselineStart.getDate() - config.baselineWindowDays);

  const detectionStart = new Date();
  detectionStart.setDate(detectionStart.getDate() - config.detectionWindowDays);

  // Build query conditions
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (config.agentId) {
    conditions.push(`agent_id = $${idx++}`);
    params.push(config.agentId);
  }

  // Get baseline metric
  const baselineQuery = buildMetricQuery(config.metric, schema, conditions, params, baselineStart, baselineEnd);
  const baselineResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ value: 0, count: 0 }]), safeQuery(baselineQuery.query, baselineQuery.params), { tenantId: tenantId, operation: 'fallback query' });
  const baseline = getFirstRow(baselineResult) || { value: 0, count: 0 };

  if (baseline.count < config.minSampleSize) {
    return []; // Not enough baseline data
  }

  // Get current metric
  const currentQuery = buildMetricQuery(config.metric, schema, conditions, params, detectionStart, new Date());
  const currentResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ value: 0, count: 0 }]), safeQuery(currentQuery.query, currentQuery.params), { tenantId: tenantId, operation: 'fallback query' });
  const current = getFirstRow(currentResult) || { value: 0, count: 0 };

  if (current.count < config.minSampleSize) {
    return []; // Not enough current data
  }

  // Calculate change
  let changePct = 0;
  if (baseline.value > 0) {
    changePct = ((current.value - baseline.value) / baseline.value) * 100;
  }

  // Check if regression (worse performance)
  const isRegression = config.metric === 'success_rate'
    ? changePct < -config.thresholdPct // Success rate going down
    : (config.metric === 'latency' || config.metric === 'cost' || config.metric === 'error_rate')
    ? changePct > config.thresholdPct // These going up is bad
    : false;

  if (isRegression) {
    const severity: 'critical' | 'warning' | 'info' = Math.abs(changePct) > 50 ? 'critical' : Math.abs(changePct) > 30 ? 'warning' : 'info';
    
    const alert: RegressionAlert = {
      id: `regression_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      agentId: config.agentId,
      metric: config.metric,
      baselineValue: baseline.value,
      currentValue: current.value,
      changePct: Math.abs(changePct),
      severity,
      detectedAt: new Date(),
      acknowledged: false,
    };

    await saveRegressionAlert(tenantId, alert);
    await swallow(EC.EVENT_BUS, eventBus.publish({
      eventType: 'ai.regression.detected' as any,
      tenantId,

      sourceService: 'performance-regression-detector',
      severity,
      payload: {
        alertId: alert.id,
        agentId: config.agentId,
        metric: config.metric,
        changePct: alert.changePct,
      },
    }), { tenantId, operation: 'eventBus:ai.regression.detected' });

    alerts.push(alert);
  }

  return alerts;
}

/**
 * Build metric query based on metric type
 */
function buildMetricQuery(
  metric: string,
  schema: string,
  baseConditions: string[],
  baseParams: unknown[],
  startDate: Date,
  endDate: Date
): { query: string; params: unknown[] } {
  const conditions = [...baseConditions];
  const params = [...baseParams];
  let idx = baseParams.length + 1;

  conditions.push(`created_at >= $${idx++}`);
  params.push(startDate);
  conditions.push(`created_at < $${idx++}`);
  params.push(endDate);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let selectClause: string;
  switch (metric) {
    case 'latency':
      selectClause = `AVG(latency_ms)::real AS value, COUNT(*)::int AS count`;
      break;
    case 'success_rate':
      selectClause = `(COUNT(CASE WHEN success THEN 1 END)::real / COUNT(*)::real) AS value, COUNT(*)::int AS count`;
      break;
    case 'cost':
      selectClause = `AVG(cost_usd)::real AS value, COUNT(*)::int AS count`;
      break;
    case 'error_rate':
      selectClause = `(COUNT(CASE WHEN NOT success THEN 1 END)::real / COUNT(*)::real) AS value, COUNT(*)::int AS count`;
      break;
    default:
      selectClause = `0::real AS value, COUNT(*)::int AS count`;
  }

  return {
    query: `SELECT ${selectClause} FROM "${schema}".agent_runs ${whereClause}`,
    params,
  };
}

/**
 * Save regression alert
 */
async function saveRegressionAlert(tenantId: string, alert: RegressionAlert): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".performance_regression_alerts
     (id, tenant_id, agent_id, metric, baseline_value, current_value,
      change_pct, severity, detected_at, acknowledged)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      alert.id,
      alert.tenantId,
      alert.agentId || null,
      alert.metric,
      alert.baselineValue,
      alert.currentValue,
      alert.changePct,
      alert.severity,
      alert.detectedAt,
      alert.acknowledged,
    ]
  ).catch(catchHandler(EC.EVENT_BUS, {}));
}

/**
 * Get regression alerts
 */
export async function getRegressionAlerts(
  tenantId: string,
  agentId?: string,
  acknowledged?: boolean
): Promise<RegressionAlert[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (agentId) {
    conditions.push(`agent_id = $${idx++}`);
    params.push(agentId);
  }

  if (acknowledged !== undefined) {
    conditions.push(`acknowledged = $${idx++}`);
    params.push(acknowledged);
  }

  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".performance_regression_alerts
       WHERE tenant_id = $${idx++} ${conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''}
       ORDER BY detected_at DESC`,
      [tenantId, ...params]
    );

    return result.rows.map((row: GenericRow) => ({
      id: row.id,
      tenantId: row.tenant_id,
      agentId: row.agent_id || undefined,
      metric: row.metric,
      baselineValue: row.baseline_value,
      currentValue: row.current_value,
      changePct: row.change_pct,
      severity: row.severity,
      detectedAt: new Date(row.detected_at),
      acknowledged: row.acknowledged,
    }));
  } catch {
    return [];
  }
}

/**
 * Acknowledge regression alert
 */
export async function acknowledgeRegression(
  tenantId: string,
  alertId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".performance_regression_alerts
     SET acknowledged = TRUE
     WHERE id = $1 AND tenant_id = $2`,
    [alertId, tenantId]
  ).catch(catchHandler(EC.EVENT_BUS, {}));
}
