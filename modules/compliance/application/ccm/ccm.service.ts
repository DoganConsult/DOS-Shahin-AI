// ============================================================================
// Shahin-Ai — CCM Service (F48: Continuous Control Monitoring)
//
// Manages CCM monitors and their execution lifecycle:
//   - Monitor CRUD with configurable check types
//   - Automated check execution (evidence freshness, SQL tests, thresholds)
//   - Result recording and history tracking
//   - Batch execution of due monitors
//   - Dashboard aggregation
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { v4 as uuid } from 'uuid';
import type { GenericRow } from '@dos/types';

// ── Types ──────────────────────────────────────────────────────────────────

export type CheckType = 'evidence_freshness' | 'automated_test' | 'threshold_check' | 'schedule_check';
export type CheckResult = 'pass' | 'fail' | 'warning' | 'error';
export type MonitorStatus = 'active' | 'paused' | 'disabled';

export interface CCMMonitor {
  monitorId: string;
  controlId: string;
  name: string;
  description?: string;
  checkType: CheckType;
  config: CCMCheckConfig;
  status: MonitorStatus;
  frequencyMinutes: number;
  lastCheckAt?: string;
  nextCheckAt?: string;
  lastResult?: CheckResult;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CCMCheckConfig {
  // evidence_freshness
  evidenceType?: string;
  freshnessWindowDays?: number;
  // automated_test
  testQuery?: string;
  expectedValue?: any;
  // threshold_check
  metricName?: string;
  metricQuery?: string;
  operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  thresholdValue?: number;
  // schedule_check
  activityType?: string;
  scheduleWindowHours?: number;
}

export interface CCMCheckResultRecord {
  resultId: string;
  monitorId: string;
  controlId: string;
  checkType: CheckType;
  result: CheckResult;
  details: string;
  executedAt: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export interface CCMMonitorInput {
  controlId: string;
  name: string;
  description?: string;
  checkType: CheckType;
  config: CCMCheckConfig;
  frequencyMinutes?: number;
  createdBy?: string;
}

export interface CCMMonitorFilters {
  controlId?: string;
  checkType?: CheckType;
  status?: MonitorStatus;
  lastResult?: CheckResult;
}

export interface CCMDashboard {
  tenantId: string;
  generatedAt: string;
  totalMonitors: number;
  activeMonitors: number;
  resultCounts: Record<CheckResult | 'not_checked', number>;
  failingControls: { controlId: string; monitorId: string; name: string; consecutiveFailures: number }[];
  overdueChecks: { monitorId: string; name: string; nextCheckAt: string; minutesOverdue: number }[];
}

// ── Internal Helpers ──────────────────────────────────────────────────────

/** Map a database row to a CCMMonitor */
function rowToMonitor(row: Record<string, unknown>): CCMMonitor {
  return {

    monitorId: row.monitor_id,

    controlId: row.control_id,

    name: row.name,

    description: row.description,

    checkType: row.check_type,
    config: typeof row.config === 'string' ? JSON.parse(row.config) : (row.config || {}),

    status: row.status || 'active',

    frequencyMinutes: row.frequency_minutes || 60,

    lastCheckAt: row.last_check_at,

    nextCheckAt: row.next_check_at,

    lastResult: row.last_result,

    consecutiveFailures: row.consecutive_failures || 0,

    createdAt: row.created_at,

    updatedAt: row.updated_at,

    createdBy: row.created_by,
  };
}

/** Map a database row to a CCMCheckResultRecord */
function rowToResult(row: Record<string, unknown>): CCMCheckResultRecord {
  return {

    resultId: row.result_id,

    monitorId: row.monitor_id,

    controlId: row.control_id,

    checkType: row.check_type,

    result: row.result,

    details: row.details,

    executedAt: row.executed_at,

    durationMs: row.duration_ms || 0,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
  };
}

/** Compare a value against a threshold using the given operator */
function compareThreshold(actual: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case 'gt': return actual > threshold;
    case 'gte': return actual >= threshold;
    case 'lt': return actual < threshold;
    case 'lte': return actual <= threshold;
    case 'eq': return actual === threshold;
    case 'neq': return actual !== threshold;
    default: return false;
  }
}

// ── Check Executors ───────────────────────────────────────────────────────

/** Execute an evidence freshness check */
async function executeEvidenceFreshness(
  schema: string,
  monitor: CCMMonitor
): Promise<{ result: CheckResult; details: string }> {
  const windowDays = monitor.config.freshnessWindowDays || 90;
  const evidenceType = monitor.config.evidenceType;

  let query = `
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE uploaded_at >= NOW() - INTERVAL '${windowDays} days') AS fresh
    FROM "${schema}".evidence
    WHERE control_id = $1`;
  const params: unknown[] = [monitor.controlId];

  if (evidenceType) {
    query += ` AND evidence_type = $2`;
    params.push(evidenceType);
  }

  const res = await safeQuery(query, params);
  const total = parseInt(res.rows[0]?.total) || 0;
  const fresh = parseInt(res.rows[0]?.fresh) || 0;

  if (total === 0) {
    return { result: 'fail', details: `No evidence found for control ${monitor.controlId}` };
  }

  if (fresh === total) {
    return { result: 'pass', details: `All ${total} evidence items within ${windowDays}-day freshness window` };
  }

  const stale = total - fresh;
  if (fresh === 0) {
    return { result: 'fail', details: `All ${total} evidence items are stale (older than ${windowDays} days)` };
  }

  return {
    result: 'warning',
    details: `${stale} of ${total} evidence items are stale (older than ${windowDays} days)`,
  };
}

/** Execute an automated SQL test check */
async function executeAutomatedTest(
  schema: string,
  monitor: CCMMonitor
): Promise<{ result: CheckResult; details: string }> {
  const testQuery = monitor.config.testQuery;
  if (!testQuery) {
    return { result: 'error', details: 'No test query configured for automated_test check' };
  }

  // Security: only allow SELECT queries to prevent data modification
  const trimmed = testQuery.trim().toLowerCase();
  if (!trimmed.startsWith('select')) {
    return { result: 'error', details: 'Automated test queries must be SELECT statements' };
  }

  try {
    // Replace schema placeholder in query
    const resolvedQuery = testQuery.replace(/\{schema\}/g, schema);
    const res = await safeQuery(resolvedQuery, []);
    const rows = res.rows || [];

    if (rows.length === 0) {
      return { result: 'pass', details: 'Query returned no rows (no issues detected)' };
    }

    const expectedValue = monitor.config.expectedValue;
    if (expectedValue !== undefined && rows[0]) {
      const firstValue = Object.values(rows[0])[0];
      if (String(firstValue) === String(expectedValue)) {
        return { result: 'pass', details: `Query result matches expected value: ${expectedValue}` };
      }
      return {
        result: 'fail',
        details: `Query result "${firstValue}" does not match expected "${expectedValue}"`,
      };
    }

    // If no expected value, any rows returned means a potential issue
    return {
      result: 'warning',
      details: `Query returned ${rows.length} row(s) -- review required`,
    };
  } catch (err: unknown) {
    return { result: 'error', details: `Test query execution failed: ${(err instanceof Error ? err.message : String(err)) || err}` };
  }
}

/** Execute a threshold comparison check */
async function executeThresholdCheck(
  schema: string,
  monitor: CCMMonitor
): Promise<{ result: CheckResult; details: string }> {
  const { metricQuery, operator, thresholdValue, metricName } = monitor.config;

  if (!metricQuery || !operator || thresholdValue === undefined) {
    return { result: 'error', details: 'Incomplete threshold_check configuration (need metricQuery, operator, thresholdValue)' };
  }

  try {
    const resolvedQuery = metricQuery.replace(/\{schema\}/g, schema);
    const res = await safeQuery(resolvedQuery, []);

    if (res.rows.length === 0) {
      return { result: 'warning', details: `No metric data returned for ${metricName || 'metric'}` };
    }

    const actualValue = parseFloat(Object.values(res.rows[0])[0] as string);
    if (isNaN(actualValue)) {
      return { result: 'error', details: `Metric query returned non-numeric value` };
    }

    const passed = compareThreshold(actualValue, operator, thresholdValue);
    const label = metricName || 'metric';

    if (passed) {
      return { result: 'pass', details: `${label} = ${actualValue} (${operator} ${thresholdValue})` };
    }

    return {
      result: 'fail',
      details: `${label} = ${actualValue} does not satisfy ${operator} ${thresholdValue}`,
    };
  } catch (err: unknown) {
    return { result: 'error', details: `Threshold check failed: ${(err instanceof Error ? err.message : String(err)) || err}` };
  }
}

/** Execute a schedule/activity check */
async function executeScheduleCheck(
  schema: string,
  monitor: CCMMonitor
): Promise<{ result: CheckResult; details: string }> {
  const windowHours = monitor.config.scheduleWindowHours || 24;
  const activityType = monitor.config.activityType;

  let query = `
    SELECT COUNT(*) AS cnt
    FROM "${schema}".activity_log
    WHERE created_at >= NOW() - INTERVAL '${windowHours} hours'`;
  const params: unknown[] = [];

  if (activityType) {
    query += ` AND activity_type = $1`;
    params.push(activityType);
  }

  if (monitor.controlId) {
    query += params.length > 0 ? ` AND entity_id = $2` : ` AND entity_id = $1`;
    params.push(monitor.controlId);
  }

  try {
    const res = await safeQuery(query, params);
    const count = parseInt(res.rows[0]?.cnt) || 0;

    if (count > 0) {
      return { result: 'pass', details: `${count} activities found within ${windowHours}-hour window` };
    }

    return {
      result: 'fail',
      details: `No ${activityType || ''} activity found within ${windowHours}-hour schedule window`,
    };
  } catch {
    return { result: 'warning', details: `Schedule check could not verify activity (activity_log table may not exist)` };
  }
}

// ── Exported Functions ────────────────────────────────────────────────────

/**
 * Create a new CCM monitor for a control.
 */
export async function createMonitor(
  tenantId: string,
  input: CCMMonitorInput
): Promise<CCMMonitor> {
  const schema = tenantSchema(tenantId);
  const monitorId = uuid();
  const frequencyMinutes = input.frequencyMinutes || 60;
  const nextCheckAt = new Date(Date.now() + frequencyMinutes * 60 * 1000).toISOString();

  await safeQuery(
    `INSERT INTO "${schema}".ccm_monitors
     (monitor_id, control_id, name, description, check_type, config,
      status, frequency_minutes, next_check_at, consecutive_failures, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, 0, $9)`,
    [
      monitorId, input.controlId, input.name, input.description || null,
      input.checkType, JSON.stringify(input.config),
      frequencyMinutes, nextCheckAt, input.createdBy || null,
    ]
  );

  eventBus.publish('ccm.cycle_completed' as any, {
    tenantId,
    type: 'monitor_created',
    monitorId,
    controlId: input.controlId,
    checkType: input.checkType,
  });

  return {
    monitorId,
    controlId: input.controlId,
    name: input.name,
    description: input.description,
    checkType: input.checkType,
    config: input.config,
    status: 'active',
    frequencyMinutes,
    nextCheckAt,
    consecutiveFailures: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: input.createdBy,
  };
}

/**
 * Update monitor configuration.
 */
export async function updateMonitor(
  tenantId: string,
  monitorId: string,
  updates: Partial<CCMMonitorInput> & { status?: MonitorStatus }
): Promise<CCMMonitor | null> {
  const schema = tenantSchema(tenantId);
  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const columnMap: Record<string, string> = {
    name: 'name',
    description: 'description',
    checkType: 'check_type',
    status: 'status',
    frequencyMinutes: 'frequency_minutes',
  };

  for (const [key, col] of Object.entries(columnMap)) {
    if ((updates as Record<string, unknown>)[key] !== undefined) {
      fields.push(`${col} = $${idx++}`);
      params.push((updates as Record<string, unknown>)[key]);
    }
  }

  if (updates.config) {
    fields.push(`config = $${idx++}`);
    params.push(JSON.stringify(updates.config));
  }

  if (fields.length === 0) {
    const res = await safeQuery(
      `SELECT * FROM "${schema}".ccm_monitors WHERE monitor_id = $1`,
      [monitorId]
    );
    return res.rows.length > 0 ? rowToMonitor(res.rows[0]) : null;
  }

  fields.push('updated_at = NOW()');
  params.push(monitorId);

  await safeQuery(
    `UPDATE "${schema}".ccm_monitors SET ${fields.join(', ')} WHERE monitor_id = $${idx}`,
    params
  );

  const res = await safeQuery(
    `SELECT * FROM "${schema}".ccm_monitors WHERE monitor_id = $1`,
    [monitorId]
  );

  return res.rows.length > 0 ? rowToMonitor(res.rows[0]) : null;
}

/**
 * List monitors with optional filters.
 */
export async function listMonitors(
  tenantId: string,
  filters: CCMMonitorFilters = {}
): Promise<CCMMonitor[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.controlId) { conditions.push(`control_id = $${idx++}`); params.push(filters.controlId); }
  if (filters.checkType) { conditions.push(`check_type = $${idx++}`); params.push(filters.checkType); }
  if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  if (filters.lastResult) { conditions.push(`last_result = $${idx++}`); params.push(filters.lastResult); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const res = await safeQuery(
    `SELECT * FROM "${schema}".ccm_monitors ${where} ORDER BY created_at DESC`,
    params
  );

  return (res.rows || []).map(rowToMonitor);
}

/**
 * Execute a single monitor: run the check, record result, update monitor state.
 */
export async function executeMonitor(
  tenantId: string,
  monitorId: string
): Promise<CCMCheckResultRecord> {
  const schema = tenantSchema(tenantId);
  const monitorRes = await safeQuery(
    `SELECT * FROM "${schema}".ccm_monitors WHERE monitor_id = $1`,
    [monitorId],
  );
  const monitor = monitorRes.rows[0] ? rowToMonitor(monitorRes.rows[0] as Record<string, unknown>) : null;
  if (!monitor) throw Object.assign(new Error(`Monitor ${monitorId} not found`), { statusCode: 404 });

  const startMs = Date.now();
  let checkResult: { result: CheckResult; details: string };

  switch (monitor.checkType) {
    case 'evidence_freshness':
      checkResult = await executeEvidenceFreshness(schema, monitor);
      break;
    case 'automated_test':
      checkResult = await executeAutomatedTest(schema, monitor);
      break;
    case 'threshold_check':
      checkResult = await executeThresholdCheck(schema, monitor);
      break;
    case 'schedule_check':
      checkResult = await executeScheduleCheck(schema, monitor);
      break;
    default:
      checkResult = { result: 'error', details: `Unknown check type: ${monitor.checkType}` };
  }

  const durationMs = Date.now() - startMs;
  const resultId = uuid();
  const executedAt = new Date().toISOString();
  const nextCheckAt = new Date(Date.now() + monitor.frequencyMinutes * 60 * 1000).toISOString();
  const consecutiveFailures = checkResult.result === 'fail'
    ? (monitor.consecutiveFailures + 1)
    : 0;

  await safeQuery(
    `INSERT INTO "${schema}".ccm_check_results
     (result_id, monitor_id, control_id, check_type, result, details, executed_at, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [resultId, monitorId, monitor.controlId, monitor.checkType,
     checkResult.result, checkResult.details, executedAt, durationMs],
  );

  await safeQuery(
    `UPDATE "${schema}".ccm_monitors
     SET last_check_at = $2, last_result = $3, next_check_at = $4,
         consecutive_failures = $5, updated_at = NOW()
     WHERE monitor_id = $1`,
    [monitorId, executedAt, checkResult.result, nextCheckAt, consecutiveFailures],
  );

  return {
    resultId,
    monitorId,
    controlId: monitor.controlId,
    checkType: monitor.checkType,
    result: checkResult.result,
    details: checkResult.details,
    executedAt,
    durationMs,
  };
}

/**
 * Execute all monitors that are due (next_check_at <= now).
 */
export async function executeAllDueMonitors(
  tenantId: string
): Promise<CCMCheckResultRecord[]> {
  const schema = tenantSchema(tenantId);

  const dueRes = await safeQuery(
    `SELECT monitor_id FROM "${schema}".ccm_monitors
     WHERE status = 'active' AND next_check_at <= NOW()
     ORDER BY next_check_at ASC`,
    []
  );

  const results: CCMCheckResultRecord[] = [];

  for (const row of dueRes.rows || []) {
    try {
      const result = await executeMonitor(tenantId, row.monitor_id);
      results.push(result);
    } catch {
      // Individual monitor failure should not stop batch execution
    }
  }

  if (results.length > 0) {

    eventBus.publish('ccm.cycle_completed' as any, {
      tenantId,
      type: 'batch_execution',
      monitorsExecuted: results.length,
      passed: results.filter(r => r.result === 'pass').length,
      failed: results.filter(r => r.result === 'fail').length,
    });
  }

  return results;
}

/**
 * Get check result history for a specific monitor.
 */
export async function getMonitorHistory(
  tenantId: string,
  monitorId: string,
  limit: number = 50
): Promise<CCMCheckResultRecord[]> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `SELECT * FROM "${schema}".ccm_check_results
     WHERE monitor_id = $1
     ORDER BY executed_at DESC
     LIMIT $2`,
    [monitorId, limit]
  );

  return (res.rows || []).map(rowToResult);
}

/**
 * Get CCM dashboard with aggregated monitor health data.
 */
export async function getCCMDashboard(tenantId: string): Promise<CCMDashboard> {
  const schema = tenantSchema(tenantId);

  // Aggregate monitor counts
  const statsRes = await safeQuery(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'active') AS active,
       COUNT(*) FILTER (WHERE last_result = 'pass') AS pass_count,
       COUNT(*) FILTER (WHERE last_result = 'fail') AS fail_count,
       COUNT(*) FILTER (WHERE last_result = 'warning') AS warning_count,
       COUNT(*) FILTER (WHERE last_result = 'error') AS error_count,
       COUNT(*) FILTER (WHERE last_result IS NULL) AS not_checked
     FROM "${schema}".ccm_monitors`,
    []
  );

  const stats = statsRes.rows[0] || {};

  // Failing controls (consecutive failures > 0)
  const failingRes = await safeQuery(
    `SELECT control_id, monitor_id, name, consecutive_failures
     FROM "${schema}".ccm_monitors
     WHERE consecutive_failures > 0 AND status = 'active'
     ORDER BY consecutive_failures DESC
     LIMIT 50`,
    []
  );

  // Overdue checks
  const overdueRes = await safeQuery(
    `SELECT monitor_id, name, next_check_at,
            EXTRACT(EPOCH FROM (NOW() - next_check_at)) / 60 AS minutes_overdue
     FROM "${schema}".ccm_monitors
     WHERE status = 'active' AND next_check_at < NOW()
     ORDER BY next_check_at ASC
     LIMIT 50`,
    []
  );

  return {
    tenantId,
    generatedAt: new Date().toISOString(),
    totalMonitors: parseInt(stats.total) || 0,
    activeMonitors: parseInt(stats.active) || 0,
    resultCounts: {
      pass: parseInt(stats.pass_count) || 0,
      fail: parseInt(stats.fail_count) || 0,
      warning: parseInt(stats.warning_count) || 0,
      error: parseInt(stats.error_count) || 0,
      not_checked: parseInt(stats.not_checked) || 0,
    },
    failingControls: (failingRes.rows || []).map((r: GenericRow) => ({
      controlId: r.control_id,
      monitorId: r.monitor_id,
      name: r.name,
      consecutiveFailures: r.consecutive_failures,
    })),
    overdueChecks: (overdueRes.rows || []).map((r: GenericRow) => ({
      monitorId: r.monitor_id,
      name: r.name,
      nextCheckAt: r.next_check_at,
      minutesOverdue: Math.round(parseFloat(r.minutes_overdue) || 0),
    })),
  };
}
