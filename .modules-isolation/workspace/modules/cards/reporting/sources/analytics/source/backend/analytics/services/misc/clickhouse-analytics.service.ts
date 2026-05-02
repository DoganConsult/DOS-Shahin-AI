/**
 * ClickHouse Analytics Service
 *
 * Write and query functions for the three ClickHouse analytics tables:
 *   - audit_events
 *   - agent_metrics
 *   - api_request_logs
 *
 * Includes a batch buffer for high-throughput inserts that flushes
 * periodically to avoid per-row HTTP round-trips.
 */

import { logger } from '../../ports/logger.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import {
  isClickHouseEnabled,
  chQuery,
  chInsert,
} from '../../ports/platform.port';
import { safeQuery } from "@dos/db";
import {
  recordClickHouseInsert,
  recordClickHouseFlush,
  setClickHouseBufferDepth,
} from '@dos/platform-core/observability';

// ── Write DTOs ──

export interface AuditEventRow {
  event_id: string;
  tenant_id: string;
  timestamp: string; // ISO 8601
  user_id: string;
  module: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: string; // JSON string
}

export interface AgentMetricRow {
  run_id: string;
  tenant_id: string;
  agent_id: string;
  timestamp: string;
  duration_ms: number;
  tool_call_count: number;
  discovery_count: number;
  actions_proposed: number;
  actions_executed: number;
  token_count: number;
  status: string;
  error: string;
}

export interface ApiRequestLogRow {
  request_id: string;
  tenant_id: string;
  timestamp: string;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  user_id: string;
  ip_address: string;
}

// ── Batch buffer ──

const FLUSH_INTERVAL_MS = 5_000;
const MAX_BUFFER_SIZE = 500;

const buffers: Record<string, Record<string, unknown>[]> = {
  audit_events: [],
  agent_metrics: [],
  api_request_logs: [],
};

let flushTimer: ReturnType<typeof setInterval> | null = null;

export function startFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushAll().catch(err =>
      logger.warn('[ClickHouse] Flush error:', err instanceof Error ? err.message : String(err)),
    );
  }, FLUSH_INTERVAL_MS);

  // Don't block process exit
  if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
    (flushTimer as NodeJS.Timeout).unref();
  }
}

async function flushTable(table: string): Promise<void> {
  const rows = buffers[table];
  if (!rows || rows.length === 0) return;

  const batch = rows.splice(0, rows.length);
  const database = process.env.CLICKHOUSE_DATABASE || 'shahin_analytics';
  const start = Date.now();
  try {
    await chInsert(`${database}.${table}`, batch);
    recordClickHouseFlush(table, Date.now() - start, true);
    recordClickHouseInsert(table, batch.length);
  } catch (err: unknown) {
    logger.warn(`[ClickHouse] Flush ${table} failed (${batch.length} rows):`, err instanceof Error ? err.message : String(err));
    recordClickHouseFlush(table, Date.now() - start, false);
    // Re-queue failed rows (up to buffer limit)
    if (rows.length + batch.length <= MAX_BUFFER_SIZE * 2) {
      rows.push(...batch);
    }
  } finally {
    setClickHouseBufferDepth(table, rows.length);
  }
}

export async function flushAll(): Promise<void> {
  await Promise.all(Object.keys(buffers).map(t => flushTable(t)));
}

function enqueue(table: string, row: Record<string, unknown>): void {
  if (!isClickHouseEnabled()) return;
  const buf = buffers[table];
  if (!buf) return;
  buf.push(row);
  setClickHouseBufferDepth(table, buf.length);
  if (buf.length >= MAX_BUFFER_SIZE) {
    flushTable(table).catch(catchHandler(EC.EVENT_BUS));
  }
  startFlushTimer();
}

// ── Write functions ──

export function insertAuditEvent(row: AuditEventRow): void {
  enqueue('audit_events', row as unknown as Record<string, unknown>);
}

export function insertAgentMetrics(row: AgentMetricRow): void {
  enqueue('agent_metrics', row as unknown as Record<string, unknown>);
}

export function insertApiRequestLog(row: ApiRequestLogRow): void {
  enqueue('api_request_logs', row as unknown as Record<string, unknown>);
}

// ── Query functions ──

export interface AuditTimelineEntry {
  period: string;
  event_count: number;
  module: string;
}

export async function getAuditTimeline(
  tenantId: string,
  days = 30,
  granularity: 'hour' | 'day' = 'day',
): Promise<AuditTimelineEntry[]> {
  if (!isClickHouseEnabled()) return [];
  const database = process.env.CLICKHOUSE_DATABASE || 'shahin_analytics';
  const truncFn = granularity === 'hour' ? 'toStartOfHour' : 'toStartOfDay';

  return chQuery<AuditTimelineEntry>(
    `SELECT
       ${truncFn}(timestamp) AS period,
       count() AS event_count,
       module
     FROM ${database}.audit_events
     WHERE tenant_id = {tenantId:String}
       AND timestamp >= now() - INTERVAL {days:UInt32} DAY
     GROUP BY period, module
     ORDER BY period`,
    { tenantId, days },
  );
}

export interface AgentPerformanceAggregate {
  agent_id: string;
  total_runs: number;
  avg_duration_ms: number;
  total_discoveries: number;
  total_actions_executed: number;
  success_rate: number;
}

export async function getAgentPerformanceAggregates(
  tenantId: string,
  days = 30,
): Promise<AgentPerformanceAggregate[]> {
  if (!isClickHouseEnabled()) return [];
  const database = process.env.CLICKHOUSE_DATABASE || 'shahin_analytics';

  return chQuery<AgentPerformanceAggregate>(
    `SELECT
       agent_id,
       count() AS total_runs,
       avg(duration_ms) AS avg_duration_ms,
       sum(discovery_count) AS total_discoveries,
       sum(actions_executed) AS total_actions_executed,
       countIf(status = 'success') / count() AS success_rate
     FROM ${database}.agent_metrics
     WHERE tenant_id = {tenantId:String}
       AND timestamp >= now() - INTERVAL {days:UInt32} DAY
     GROUP BY agent_id
     ORDER BY total_runs DESC`,
    { tenantId, days },
  );
}

export interface ApiLatencyPercentile {
  path: string;
  p50: number;
  p90: number;
  p99: number;
  request_count: number;
}

export async function getApiLatencyPercentiles(
  tenantId: string,
  days = 7,
): Promise<ApiLatencyPercentile[]> {
  if (!isClickHouseEnabled()) return [];
  const database = process.env.CLICKHOUSE_DATABASE || 'shahin_analytics';

  return chQuery<ApiLatencyPercentile>(
    `SELECT
       path,
       quantile(0.5)(duration_ms) AS p50,
       quantile(0.9)(duration_ms) AS p90,
       quantile(0.99)(duration_ms) AS p99,
       count() AS request_count
     FROM ${database}.api_request_logs
     WHERE tenant_id = {tenantId:String}
       AND timestamp >= now() - INTERVAL {days:UInt32} DAY
     GROUP BY path
     HAVING request_count >= 10
     ORDER BY request_count DESC
     LIMIT 50`,
    { tenantId, days },
  );
}
