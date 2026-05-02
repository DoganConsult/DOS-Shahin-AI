-- DOS bootstrap migration — dedicated schema + 5 native tables.
--
-- Tables:
--   tenants_registry      — canonical list of tenants + lifecycle state.
--   modules_registry      — every registered platform / product module.
--   products_registry     — every registered product (productCode + status).
--   platform_events_log   — durable, queryable log of every platform event.
--   scheduled_jobs        — scheduled job definitions + last-run tracking.
--
-- Access: queries go through DOSPort at @dos/dos-core.
-- Legacy tables in dos.* (e.g. dos.tenant_product_activation,
-- dos.module_registry) remain for dos-platform-core compatibility;
-- platform_dos.* is the NEW canonical home.

CREATE SCHEMA IF NOT EXISTS platform_dos;

-- ── tenants_registry ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_dos.tenants_registry (
  tenant_id        TEXT        PRIMARY KEY,
  product_code     TEXT,
  status           TEXT        NOT NULL DEFAULT 'provisioning'
                   CHECK (status IN ('active', 'suspended', 'provisioning', 'decommissioned')),
  display_name     TEXT,
  registered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attributes       JSONB       NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_tenants_status
  ON platform_dos.tenants_registry (status, registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenants_product
  ON platform_dos.tenants_registry (product_code) WHERE product_code IS NOT NULL;

-- ── modules_registry ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_dos.modules_registry (
  module_code      TEXT        PRIMARY KEY,
  version          TEXT        NOT NULL,
  layer            TEXT        NOT NULL CHECK (layer IN ('platform', 'product')),
  owner_team       TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'registered'
                   CHECK (status IN ('registered', 'deregistered')),
  registered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deregistered_at  TIMESTAMPTZ,
  attributes       JSONB       NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_modules_layer
  ON platform_dos.modules_registry (layer, status);

-- ── products_registry ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_dos.products_registry (
  product_code     TEXT        PRIMARY KEY,
  version          TEXT        NOT NULL,
  enabled          BOOLEAN     NOT NULL DEFAULT TRUE,
  display_name     TEXT,
  registered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attributes       JSONB       NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_products_enabled
  ON platform_dos.products_registry (enabled, registered_at DESC);

-- ── platform_events_log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_dos.platform_events_log (
  id               BIGSERIAL PRIMARY KEY,
  event_id         TEXT,
  event_type       TEXT        NOT NULL,
  tenant_id        TEXT        NOT NULL,
  payload          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  correlation_id   TEXT,
  occurred_at      TIMESTAMPTZ NOT NULL,
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_type_time
  ON platform_dos.platform_events_log (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_tenant_time
  ON platform_dos.platform_events_log (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_correlation
  ON platform_dos.platform_events_log (correlation_id) WHERE correlation_id IS NOT NULL;

-- ── scheduled_jobs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_dos.scheduled_jobs (
  job_id           TEXT        PRIMARY KEY,
  tenant_id        TEXT        NOT NULL,
  name             TEXT        NOT NULL,
  cron_expression  TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ,
  last_triggered_by TEXT,
  trigger_count    INTEGER     NOT NULL DEFAULT 0,
  attributes       JSONB       NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status
  ON platform_dos.scheduled_jobs (tenant_id, status);

COMMENT ON SCHEMA platform_dos IS
  'DOS platform module — orchestrator. tenants_registry + modules_registry + products_registry + platform_events_log + scheduled_jobs. Native dedicated schema (no legacy cutover).';
