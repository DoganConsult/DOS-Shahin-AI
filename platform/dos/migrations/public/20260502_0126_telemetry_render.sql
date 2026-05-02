-- dos:draft
-- =====================================================================
-- UI-OS — §18 Telemetry — page view, click, command, render perf  (20260502_0126)
--
-- Tables (4) — DKNF via dos.ui_command_surface_t / dos.ui_target_kind_t /
--                            dos.ui_device_kind_t.
--
-- Telemetry rules (master checklist §18 warning):
--   - NO PII columns (no user_id_raw, no email, no IP raw — hash only).
--   - NO request bodies.
--   - All event tables time-series indexed on (tenant_id, occurred_at DESC).
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

CREATE TABLE IF NOT EXISTS dos.ui_page_view_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  user_id_hash        VARCHAR(64) NOT NULL,
  route_key           VARCHAR(200) NOT NULL,
  referrer_route_key  VARCHAR(200),
  duration_ms         INTEGER,
  device_kind         dos.ui_device_kind_t,
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_page_view_events_time
  ON dos.ui_page_view_events (tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_ui_page_view_events_route
  ON dos.ui_page_view_events (tenant_id, route_key, occurred_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_click_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id_hash  VARCHAR(64) NOT NULL,
  target_kind   dos.ui_target_kind_t NOT NULL,
  target_id     VARCHAR(150),
  action_code   VARCHAR(150),
  route_key     VARCHAR(200),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_click_events_time
  ON dos.ui_click_events (tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_ui_click_events_target
  ON dos.ui_click_events (tenant_id, target_kind, target_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_command_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id_hash  VARCHAR(64) NOT NULL,
  command_key   VARCHAR(150) NOT NULL,
  surface       dos.ui_command_surface_t NOT NULL,
  result        VARCHAR(40),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_command_events_time
  ON dos.ui_command_events (tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_ui_command_events_command
  ON dos.ui_command_events (tenant_id, command_key, occurred_at DESC);

CREATE TABLE IF NOT EXISTS dos.ui_render_performance_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64) NOT NULL,
  user_id_hash  VARCHAR(64) NOT NULL,
  route_key     VARCHAR(200) NOT NULL,
  lcp_ms        INTEGER,
  inp_ms        INTEGER,
  cls           NUMERIC(5,3),
  tbt_ms        INTEGER,
  fcp_ms        INTEGER,
  ttfb_ms       INTEGER,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ui_render_performance_events_time
  ON dos.ui_render_performance_events (tenant_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS ix_ui_render_performance_events_route
  ON dos.ui_render_performance_events (tenant_id, route_key, occurred_at DESC);

COMMIT;
