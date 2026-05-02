-- dos:draft
-- =====================================================================
-- UI-OS — §5 Widgets — data binding, refresh, error fallback  (20260502_0101)
--
-- Tables created (3) — DKNF compliant via ENUMs from 20260502_0099:
--   1. dos.ui_widget_data_bindings    — API/data-source binding per instance
--   2. dos.ui_widget_refresh_policies — refresh interval + invalidation rules
--   3. dos.ui_widget_error_states     — fallback rendering on data error
--
-- Normalization decisions:
--   - DKNF: binding_kind / http_method / retry_strategy promoted to ENUMs
--          (dos.ui_widget_binding_kind_t, dos.ui_http_method_t,
--          dos.ui_retry_strategy_t).
--   - 1NF: refresh_on_event_codes kept as TEXT[] — event codes are free-form
--          tags at this layer (no event registry table); array is order-only.
--          If an event registry is added later, promote to a child table.
--   - 3NF: data_binding_id back-reference is added to ui_widget_instances
--          via UNIQUE constraint on widget_instance_id (1:1 relationship).
--
-- Parent: dos.ui_widget_instances (20260502_0100)
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ---------------------------------------------------------------------
-- 1. dos.ui_widget_data_bindings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.ui_widget_data_bindings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  widget_instance_id UUID NOT NULL,
  binding_kind       dos.ui_widget_binding_kind_t NOT NULL,
  endpoint_url       TEXT,
  http_method        dos.ui_http_method_t NOT NULL DEFAULT 'GET',
  request_template   JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_mapping   JSONB NOT NULL DEFAULT '{}'::jsonb,
  cache_ttl_seconds  INTEGER NOT NULL DEFAULT 0,
  auth_secret_ref    VARCHAR(150),
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_widget_data_binding_ttl_chk
    CHECK (cache_ttl_seconds >= 0),
  CONSTRAINT ui_widget_data_binding_inst_fk
    FOREIGN KEY (widget_instance_id) REFERENCES dos.ui_widget_instances(id) ON DELETE CASCADE,
  CONSTRAINT ui_widget_data_binding_inst_uk
    UNIQUE (widget_instance_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_widget_data_bindings_tenant
  ON dos.ui_widget_data_bindings (tenant_id);

COMMENT ON TABLE  dos.ui_widget_data_bindings IS
  'Per-instance data-source binding (1:1 with ui_widget_instances). auth_secret_ref points to a Config OS secret key — never store secrets.';

-- ---------------------------------------------------------------------
-- 2. dos.ui_widget_refresh_policies
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.ui_widget_refresh_policies (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               VARCHAR(64) NOT NULL,
  widget_instance_id      UUID NOT NULL,
  interval_seconds        INTEGER NOT NULL DEFAULT 0,
  refresh_on_event_codes  TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  pause_when_hidden       BOOLEAN NOT NULL DEFAULT TRUE,
  refresh_on_focus        BOOLEAN NOT NULL DEFAULT TRUE,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_by              VARCHAR(64),
  updated_by              VARCHAR(64),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_widget_refresh_interval_chk
    CHECK (interval_seconds >= 0 AND interval_seconds <= 86400),
  CONSTRAINT ui_widget_refresh_inst_fk
    FOREIGN KEY (widget_instance_id) REFERENCES dos.ui_widget_instances(id) ON DELETE CASCADE,
  CONSTRAINT ui_widget_refresh_inst_uk
    UNIQUE (widget_instance_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_widget_refresh_policies_tenant
  ON dos.ui_widget_refresh_policies (tenant_id);

COMMENT ON COLUMN dos.ui_widget_refresh_policies.refresh_on_event_codes IS
  'Free-form event tags. If an event registry is introduced, promote to child table per 1NF (normalization-framework.md §1NF).';

-- ---------------------------------------------------------------------
-- 3. dos.ui_widget_error_states
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.ui_widget_error_states (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              VARCHAR(64) NOT NULL,
  widget_instance_id     UUID NOT NULL,
  error_code             VARCHAR(100) NOT NULL,
  fallback_component_key VARCHAR(150),
  message_key            VARCHAR(150),
  retry_strategy         dos.ui_retry_strategy_t NOT NULL DEFAULT 'manual',
  retry_max_attempts     INTEGER NOT NULL DEFAULT 0,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_by             VARCHAR(64),
  updated_by             VARCHAR(64),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_widget_error_attempts_chk
    CHECK (retry_max_attempts >= 0 AND retry_max_attempts <= 10),
  CONSTRAINT ui_widget_error_inst_fk
    FOREIGN KEY (widget_instance_id) REFERENCES dos.ui_widget_instances(id) ON DELETE CASCADE,
  CONSTRAINT ui_widget_error_inst_code_uk
    UNIQUE (widget_instance_id, error_code)
);

CREATE INDEX IF NOT EXISTS ix_ui_widget_error_states_tenant
  ON dos.ui_widget_error_states (tenant_id);

COMMENT ON TABLE  dos.ui_widget_error_states IS
  'Fallback render config when binding errors. fallback_component_key must exist in WIDGET_COMPONENT_MAP allowlist.';

COMMIT;
