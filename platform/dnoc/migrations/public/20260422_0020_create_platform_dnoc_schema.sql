-- DNOC bootstrap migration — dedicated schema + native tables.
--
-- Five tables, all native to platform_dnoc (no legacy cutover):
--   metrics        — counter/gauge/histogram samples.
--   logs           — structured log entries.
--   traces         — distributed-trace spans.
--   routes         — HTTP routes registered by each service.
--   health_checks  — per-service health status snapshots.
--
-- Metrics/logs/traces are append-heavy. Routes + health are low-volume
-- configuration state. Indexes are tuned per-table.

CREATE SCHEMA IF NOT EXISTS platform_dnoc;

-- ── metrics ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_dnoc.metrics (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  kind        TEXT        NOT NULL CHECK (kind IN ('counter','gauge','histogram')),
  value       DOUBLE PRECISION NOT NULL,
  labels      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_metrics_name_time
  ON platform_dnoc.metrics (name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_labels
  ON platform_dnoc.metrics USING gin (labels);

-- ── logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_dnoc.logs (
  id             BIGSERIAL PRIMARY KEY,
  level          TEXT        NOT NULL CHECK (level IN ('trace','debug','info','warn','error','fatal')),
  message        TEXT        NOT NULL,
  module_code    TEXT        NOT NULL,
  tenant_id      TEXT,
  correlation_id TEXT,
  attributes     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  emitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_logs_module_time
  ON platform_dnoc.logs (module_code, emitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_tenant_time
  ON platform_dnoc.logs (tenant_id, emitted_at DESC) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_logs_correlation
  ON platform_dnoc.logs (correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_logs_level_time
  ON platform_dnoc.logs (level, emitted_at DESC);

-- ── traces ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_dnoc.traces (
  id              BIGSERIAL PRIMARY KEY,
  trace_id        TEXT        NOT NULL,
  span_id         TEXT        NOT NULL,
  parent_span_id  TEXT,
  name            TEXT        NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ NOT NULL,
  duration_ms     INTEGER GENERATED ALWAYS AS (
                    (EXTRACT(EPOCH FROM (ended_at - started_at)) * 1000)::INTEGER
                  ) STORED,
  attributes      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (trace_id, span_id)
);
CREATE INDEX IF NOT EXISTS idx_traces_trace_id
  ON platform_dnoc.traces (trace_id, started_at);
CREATE INDEX IF NOT EXISTS idx_traces_name_time
  ON platform_dnoc.traces (name, started_at DESC);

-- ── routes ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_dnoc.routes (
  id             BIGSERIAL PRIMARY KEY,
  module_code    TEXT        NOT NULL,
  service_code   TEXT        NOT NULL,
  method         TEXT        NOT NULL CHECK (method IN ('GET','POST','PUT','PATCH','DELETE')),
  path           TEXT        NOT NULL,
  auth_required  BOOLEAN     NOT NULL,
  rate_limit_rpm INTEGER,
  registered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deregistered_at TIMESTAMPTZ,
  UNIQUE (service_code, method, path)
);
CREATE INDEX IF NOT EXISTS idx_routes_module
  ON platform_dnoc.routes (module_code);
CREATE INDEX IF NOT EXISTS idx_routes_active
  ON platform_dnoc.routes (service_code) WHERE deregistered_at IS NULL;

-- ── health_checks ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_dnoc.health_checks (
  id           BIGSERIAL PRIMARY KEY,
  service_code TEXT        NOT NULL,
  status       TEXT        NOT NULL CHECK (status IN ('healthy','degraded','unhealthy','unknown')),
  details      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  checked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_service_time
  ON platform_dnoc.health_checks (service_code, checked_at DESC);

COMMENT ON SCHEMA platform_dnoc IS
  'DNOC platform module — Network & Observability Center. metrics + logs + traces + routes + health_checks. Native dedicated schema.';
