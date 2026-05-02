"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.startFlushTimer = startFlushTimer;
exports.flushAll = flushAll;
exports.insertAuditEvent = insertAuditEvent;
exports.insertAgentMetrics = insertAgentMetrics;
exports.insertApiRequestLog = insertApiRequestLog;
exports.getAuditTimeline = getAuditTimeline;
exports.getAgentPerformanceAggregates = getAgentPerformanceAggregates;
exports.getApiLatencyPercentiles = getApiLatencyPercentiles;
const logger_port_1 = require("../../ports/logger.port");
const resilience_1 = require("@dos/platform-core/resilience");
const platform_port_1 = require("../../ports/platform.port");
const observability_1 = require("@dos/platform-core/observability");
// ── Batch buffer ──
const FLUSH_INTERVAL_MS = 5000;
const MAX_BUFFER_SIZE = 500;
const buffers = {
    audit_events: [],
    agent_metrics: [],
    api_request_logs: [],
};
let flushTimer = null;
function startFlushTimer() {
    if (flushTimer)
        return;
    flushTimer = setInterval(() => {
        flushAll().catch(err => logger_port_1.logger.warn('[ClickHouse] Flush error:', err instanceof Error ? err.message : String(err)));
    }, FLUSH_INTERVAL_MS);
    // Don't block process exit
    if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
        flushTimer.unref();
    }
}
async function flushTable(table) {
    const rows = buffers[table];
    if (!rows || rows.length === 0)
        return;
    const batch = rows.splice(0, rows.length);
    const database = process.env.CLICKHOUSE_DATABASE || 'shahin_analytics';
    const start = Date.now();
    try {
        await (0, platform_port_1.chInsert)(`${database}.${table}`, batch);
        (0, observability_1.recordClickHouseFlush)(table, Date.now() - start, true);
        (0, observability_1.recordClickHouseInsert)(table, batch.length);
    }
    catch (err) {
        logger_port_1.logger.warn(`[ClickHouse] Flush ${table} failed (${batch.length} rows):`, err instanceof Error ? err.message : String(err));
        (0, observability_1.recordClickHouseFlush)(table, Date.now() - start, false);
        // Re-queue failed rows (up to buffer limit)
        if (rows.length + batch.length <= MAX_BUFFER_SIZE * 2) {
            rows.push(...batch);
        }
    }
    finally {
        (0, observability_1.setClickHouseBufferDepth)(table, rows.length);
    }
}
async function flushAll() {
    await Promise.all(Object.keys(buffers).map(t => flushTable(t)));
}
function enqueue(table, row) {
    if (!(0, platform_port_1.isClickHouseEnabled)())
        return;
    const buf = buffers[table];
    if (!buf)
        return;
    buf.push(row);
    (0, observability_1.setClickHouseBufferDepth)(table, buf.length);
    if (buf.length >= MAX_BUFFER_SIZE) {
        flushTable(table).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
    startFlushTimer();
}
// ── Write functions ──
function insertAuditEvent(row) {
    enqueue('audit_events', row);
}
function insertAgentMetrics(row) {
    enqueue('agent_metrics', row);
}
function insertApiRequestLog(row) {
    enqueue('api_request_logs', row);
}
async function getAuditTimeline(tenantId, days = 30, granularity = 'day') {
    if (!(0, platform_port_1.isClickHouseEnabled)())
        return [];
    const database = process.env.CLICKHOUSE_DATABASE || 'shahin_analytics';
    const truncFn = granularity === 'hour' ? 'toStartOfHour' : 'toStartOfDay';
    return (0, platform_port_1.chQuery)(`SELECT
       ${truncFn}(timestamp) AS period,
       count() AS event_count,
       module
     FROM ${database}.audit_events
     WHERE tenant_id = {tenantId:String}
       AND timestamp >= now() - INTERVAL {days:UInt32} DAY
     GROUP BY period, module
     ORDER BY period`, { tenantId, days });
}
async function getAgentPerformanceAggregates(tenantId, days = 30) {
    if (!(0, platform_port_1.isClickHouseEnabled)())
        return [];
    const database = process.env.CLICKHOUSE_DATABASE || 'shahin_analytics';
    return (0, platform_port_1.chQuery)(`SELECT
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
     ORDER BY total_runs DESC`, { tenantId, days });
}
async function getApiLatencyPercentiles(tenantId, days = 7) {
    if (!(0, platform_port_1.isClickHouseEnabled)())
        return [];
    const database = process.env.CLICKHOUSE_DATABASE || 'shahin_analytics';
    return (0, platform_port_1.chQuery)(`SELECT
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
     LIMIT 50`, { tenantId, days });
}
//# sourceMappingURL=clickhouse-analytics.service.js.map