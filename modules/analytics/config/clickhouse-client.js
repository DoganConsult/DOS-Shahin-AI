"use strict";
/**
 * ClickHouse Client Configuration
 *
 * Singleton ClickHouse HTTP client for analytics queries.
 * Gated behind CLICKHOUSE_ENABLED=true.
 *
 * Environment variables:
 *   CLICKHOUSE_ENABLED=true
 *   CLICKHOUSE_HOST=127.0.0.1
 *   CLICKHOUSE_PORT=8123
 *   CLICKHOUSE_DATABASE=shahin_analytics
 *   CLICKHOUSE_USER=default
 *   CLICKHOUSE_PASSWORD=
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isClickHouseEnabled = isClickHouseEnabled;
exports.getClickHouseClient = getClickHouseClient;
exports.chQuery = chQuery;
exports.chInsert = chInsert;
exports.checkClickHouseHealth = checkClickHouseHealth;
exports.ensureClickHouseTables = ensureClickHouseTables;
const module_sdk_1 = require("@dos/module-sdk");
let _client = null;
let _enabled = null;
function isClickHouseEnabled() {
    if (_enabled === null) {
        _enabled = process.env.CLICKHOUSE_ENABLED === 'true';
    }
    return _enabled;
}
function getClickHouseClient() {
    if (!isClickHouseEnabled()) {
        return null;
    }
    if (!_client) {
        try {
            const chHost = process.env.CLICKHOUSE_HOST;
            const chPort = process.env.CLICKHOUSE_PORT;
            const chDb = process.env.CLICKHOUSE_DATABASE;
            if (!chHost || !chPort || !chDb) {
                module_sdk_1.logger.warn('[ClickHouse] CLICKHOUSE_HOST, CLICKHOUSE_PORT, or CLICKHOUSE_DATABASE not set.');
            }
            const { createClient } = require('@clickhouse/client');
            _client = createClient({
                url: `http://${chHost || ''}:${chPort || '8123'}`,
                database: chDb || '',
                username: process.env.CLICKHOUSE_USER || 'default',
                password: process.env.CLICKHOUSE_PASSWORD || '',
                request_timeout: 30000,
                compression: {
                    request: true,
                    response: true,
                },
                clickhouse_settings: {
                    async_insert: 1,
                    wait_for_async_insert: 0,
                },
            });
            module_sdk_1.logger.info('[ClickHouse] Client initialized');
        }
        catch (err) {
            module_sdk_1.logger.error('[ClickHouse] Failed to create client:', err instanceof Error ? err.message : String(err));
            _enabled = false;
            return null;
        }
    }
    return _client;
}
/**
 * Execute a ClickHouse query and return typed rows.
 */
async function chQuery(query, params) {
    const client = getClickHouseClient();
    if (!client)
        return [];
    const resultSet = await client.query({
        query,
        query_params: params,
        format: 'JSONEachRow',
    });
    return resultSet.json();
}
/**
 * Insert rows into a ClickHouse table.
 */
async function chInsert(table, values) {
    const client = getClickHouseClient();
    if (!client || values.length === 0)
        return;
    await client.insert({
        table,
        values,
        format: 'JSONEachRow',
    });
}
/**
 * Health check — verifies ClickHouse is reachable and the database exists.
 */
async function checkClickHouseHealth() {
    if (!isClickHouseEnabled()) {
        return { healthy: false, error: 'ClickHouse is disabled (CLICKHOUSE_ENABLED != true)' };
    }
    try {
        const rows = await chQuery('SELECT version() AS version');
        const version = rows[0]?.version || 'unknown';
        return {
            healthy: true,
            version,
            database: process.env.CLICKHOUSE_DATABASE || 'shahin_analytics',
        };
    }
    catch (err) {
        return {
            healthy: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
/**
 * Ensure analytics tables exist in ClickHouse.
 * Called once during server startup when ClickHouse is enabled.
 */
async function ensureClickHouseTables() {
    const client = getClickHouseClient();
    if (!client)
        return;
    const database = process.env.CLICKHOUSE_DATABASE || '';
    const ddl = [
        // Audit events — time-series log of all platform audit trail entries
        `CREATE TABLE IF NOT EXISTS ${database}.audit_events (
      event_id String,
      tenant_id String,
      timestamp DateTime64(3),
      user_id String,
      module String,
      action String,
      entity_type String,
      entity_id String,
      metadata String,
      INDEX idx_tenant tenant_id TYPE bloom_filter GRANULARITY 4,
      INDEX idx_module module TYPE bloom_filter GRANULARITY 4
    ) ENGINE = MergeTree()
    PARTITION BY toYYYYMM(timestamp)
    ORDER BY (tenant_id, timestamp)
    TTL toDateTime(timestamp) + INTERVAL 365 DAY`,
        // Agent metrics — per-run performance data
        `CREATE TABLE IF NOT EXISTS ${database}.agent_metrics (
      run_id String,
      tenant_id String,
      agent_id String,
      timestamp DateTime64(3),
      duration_ms UInt32,
      tool_call_count UInt16,
      discovery_count UInt16,
      actions_proposed UInt16,
      actions_executed UInt16,
      token_count UInt32,
      status String,
      error String,
      INDEX idx_agent agent_id TYPE bloom_filter GRANULARITY 4
    ) ENGINE = MergeTree()
    PARTITION BY toYYYYMM(timestamp)
    ORDER BY (tenant_id, agent_id, timestamp)
    TTL toDateTime(timestamp) + INTERVAL 365 DAY`,
        // API request logs — latency and throughput tracking
        `CREATE TABLE IF NOT EXISTS ${database}.api_request_logs (
      request_id String,
      tenant_id String,
      timestamp DateTime64(3),
      method String,
      path String,
      status_code UInt16,
      duration_ms UInt32,
      user_id String,
      ip_address String,
      INDEX idx_path path TYPE bloom_filter GRANULARITY 4
    ) ENGINE = MergeTree()
    PARTITION BY toYYYYMM(timestamp)
    ORDER BY (tenant_id, timestamp)
    TTL toDateTime(timestamp) + INTERVAL 180 DAY`,
    ];
    for (const sql of ddl) {
        try {
            await client.command({ query: sql });
        }
        catch (err) {
            module_sdk_1.logger.warn('[ClickHouse] DDL failed:', err instanceof Error ? err.message : String(err));
        }
    }
    module_sdk_1.logger.info('[ClickHouse] Analytics tables ensured');
}
