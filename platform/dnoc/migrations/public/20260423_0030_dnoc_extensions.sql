-- 20260423_0030_dnoc_extensions.sql
-- Completes platform_dnoc with deployments, dependencies, rate limits, circuit breakers,
-- error budgets, and route hit rollups.

CREATE TABLE IF NOT EXISTS platform_dnoc.service_deployments (
  id              BIGSERIAL PRIMARY KEY,
  service_code    TEXT NOT NULL,
  version         TEXT NOT NULL,
  commit_sha      TEXT,
  environment     TEXT NOT NULL DEFAULT 'production'
                    CHECK (environment IN ('development','staging','production','canary')),
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','rolled_back','retired')),
  deployed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_by     TEXT,
  rollback_of     BIGINT REFERENCES platform_dnoc.service_deployments(id),
  UNIQUE (service_code, version, environment)
);
CREATE INDEX IF NOT EXISTS idx_deploy_service_time
  ON platform_dnoc.service_deployments (service_code, deployed_at DESC);

CREATE TABLE IF NOT EXISTS platform_dnoc.service_dependencies (
  id              BIGSERIAL PRIMARY KEY,
  service_code    TEXT NOT NULL,
  depends_on      TEXT NOT NULL,
  dependency_type TEXT NOT NULL DEFAULT 'sync'
                    CHECK (dependency_type IN ('sync','async','database','cache','queue')),
  criticality     TEXT NOT NULL DEFAULT 'required'
                    CHECK (criticality IN ('required','optional','fallback')),
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_code, depends_on, dependency_type)
);

CREATE TABLE IF NOT EXISTS platform_dnoc.rate_limit_policies (
  policy_code     TEXT PRIMARY KEY,
  description     TEXT,
  scope           TEXT NOT NULL DEFAULT 'tenant'
                    CHECK (scope IN ('global','tenant','user','ip','api_key')),
  window_seconds  INTEGER NOT NULL DEFAULT 60,
  max_requests    INTEGER NOT NULL,
  burst_limit     INTEGER,
  action          TEXT NOT NULL DEFAULT 'reject'
                    CHECK (action IN ('reject','throttle','log_only')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_dnoc.circuit_breaker_state (
  id              BIGSERIAL PRIMARY KEY,
  service_code    TEXT NOT NULL,
  dependency      TEXT NOT NULL,
  state           TEXT NOT NULL DEFAULT 'closed'
                    CHECK (state IN ('closed','open','half_open')),
  failure_count   INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  half_open_at    TIMESTAMPTZ,
  threshold       INTEGER NOT NULL DEFAULT 5,
  reset_seconds   INTEGER NOT NULL DEFAULT 30,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (service_code, dependency)
);
CREATE INDEX IF NOT EXISTS idx_breaker_open
  ON platform_dnoc.circuit_breaker_state (state) WHERE state <> 'closed';

CREATE TABLE IF NOT EXISTS platform_dnoc.error_budget_snapshots (
  id                    BIGSERIAL PRIMARY KEY,
  service_code          TEXT NOT NULL,
  slo_code              TEXT NOT NULL,
  window_start          TIMESTAMPTZ NOT NULL,
  window_end            TIMESTAMPTZ NOT NULL,
  target_pct            DOUBLE PRECISION NOT NULL,
  achieved_pct          DOUBLE PRECISION NOT NULL,
  budget_remaining_pct  DOUBLE PRECISION NOT NULL,
  captured_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attributes            JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_error_budget_service
  ON platform_dnoc.error_budget_snapshots (service_code, captured_at DESC);

CREATE TABLE IF NOT EXISTS platform_dnoc.route_hits (
  id              BIGSERIAL PRIMARY KEY,
  route_id        BIGINT NOT NULL REFERENCES platform_dnoc.routes(id) ON DELETE CASCADE,
  bucket_start    TIMESTAMPTZ NOT NULL,
  bucket_seconds  INTEGER NOT NULL DEFAULT 60,
  hit_count       BIGINT NOT NULL DEFAULT 0,
  error_count     BIGINT NOT NULL DEFAULT 0,
  p50_ms          INTEGER,
  p95_ms          INTEGER,
  p99_ms          INTEGER,
  UNIQUE (route_id, bucket_start)
);
CREATE INDEX IF NOT EXISTS idx_route_hits_route_time
  ON platform_dnoc.route_hits (route_id, bucket_start DESC);
