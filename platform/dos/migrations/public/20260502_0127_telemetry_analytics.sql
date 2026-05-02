-- dos:draft
-- =====================================================================
-- UI-OS — §18 Telemetry — error, widget usage, search, funnel, retention  (20260502_0127)
--
-- Tables (5) — DKNF via dos.ui_error_kind_t.
-- Privacy: stack_hash (no raw stacks); query_hash (no raw query); cohort_code only.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_error_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id_hash  VARCHAR(64) NOT NULL,
  route_key     VARCHAR(200),
  error_code    VARCHAR(150) NOT NULL,
  error_kind    dos.ui_error_kind_t NOT NULL,
  stack_hash    VARCHAR(64),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_error_events_time
  ON dos.ui_error_events (tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_ui_error_events_kind
  ON dos.ui_error_events (tenant_id, error_kind, occurred_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_widget_usage_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  user_id_hash        VARCHAR(64) NOT NULL,
  widget_instance_id  UUID NOT NULL,
  interaction         VARCHAR(40) NOT NULL,
  duration_ms         INTEGER,
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_widget_usage_events_time
  ON dos.ui_widget_usage_events (tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_ui_widget_usage_events_instance
  ON dos.ui_widget_usage_events (tenant_id, widget_instance_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_search_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64) NOT NULL,
  user_id_hash      VARCHAR(64) NOT NULL,
  scope_code        VARCHAR(150) NOT NULL,
  query_hash        VARCHAR(64) NOT NULL,
  result_count      INTEGER NOT NULL DEFAULT 0,
  clicked_position  INTEGER,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_search_events_time
  ON dos.ui_search_events (tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_ui_search_events_scope
  ON dos.ui_search_events (tenant_id, scope_code, occurred_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_funnel_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id_hash  VARCHAR(64) NOT NULL,
  funnel_code   VARCHAR(100) NOT NULL,
  step_code     VARCHAR(100) NOT NULL,
  step_order    INTEGER NOT NULL,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_funnel_events_funnel
  ON dos.ui_funnel_events (tenant_id, funnel_code, step_order, occurred_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_retention_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  cohort_code         VARCHAR(100) NOT NULL,
  day_index           INTEGER NOT NULL,
  active_user_count   INTEGER NOT NULL,
  snapshot_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_retention_snapshots_uk
    UNIQUE (tenant_id, cohort_code, day_index, snapshot_at)
);

CREATE INDEX IF NOT EXISTS ix_ui_retention_snapshots_cohort
  ON dos.ui_retention_snapshots (tenant_id, cohort_code, day_index);

COMMIT;
