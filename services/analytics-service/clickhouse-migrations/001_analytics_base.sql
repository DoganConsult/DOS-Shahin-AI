-- ClickHouse analytics-service base schema.
-- Mirrors the DDL emitted by modules/analytics/source/config/clickhouse-client.ts
-- so that a fresh ClickHouse instance can be provisioned without depending on
-- lazy bootstrap inside the service. Idempotent — safe to re-run.

CREATE DATABASE IF NOT EXISTS {database:Identifier};

CREATE TABLE IF NOT EXISTS {database:Identifier}.audit_events (
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
TTL toDateTime(timestamp) + INTERVAL 365 DAY;

CREATE TABLE IF NOT EXISTS {database:Identifier}.agent_metrics (
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
TTL toDateTime(timestamp) + INTERVAL 365 DAY;

CREATE TABLE IF NOT EXISTS {database:Identifier}.api_request_logs (
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
TTL toDateTime(timestamp) + INTERVAL 180 DAY;
