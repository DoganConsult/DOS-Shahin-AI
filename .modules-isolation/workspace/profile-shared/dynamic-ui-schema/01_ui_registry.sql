-- Phase F + Profile-pluggable: 11 dos.ui_* tables, all keyed by profile_code.
-- Plus 2 platform tables: dos.profile_registry and dos.tenant_profile.
-- Best-practice: every UI row is scoped by (profile_code, tenant_id NULL=default, ref).
-- Tenant overrides remain via dos.ui_tenant_override.
BEGIN;
CREATE SCHEMA IF NOT EXISTS dos;

-- =========================================================================
-- Profile registry (one row per available profile)
-- =========================================================================
CREATE TABLE IF NOT EXISTS dos.profile_registry (
  code            TEXT PRIMARY KEY,                -- 'grc' | 'iso27001' | 'dora' | ...
  name            TEXT NOT NULL,
  description     TEXT,
  version         TEXT NOT NULL DEFAULT '1.0.0',
  default_locale  TEXT NOT NULL DEFAULT 'en',
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenant -> profile assignment (which profile this tenant runs)
CREATE TABLE IF NOT EXISTS dos.tenant_profile (
  tenant_id       UUID PRIMARY KEY,
  profile_code    TEXT NOT NULL REFERENCES dos.profile_registry(code),
  activated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_by    UUID,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Standard helper: resolve a tenant's profile (falls back to 'grc')
CREATE OR REPLACE FUNCTION dos.resolve_profile_code(p_tenant_id UUID) RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT profile_code FROM dos.tenant_profile WHERE tenant_id = p_tenant_id),
    'grc'
  );
$$ LANGUAGE sql STABLE;

-- =========================================================================
-- 1. ui_module — keyed by (profile_code, code)
-- =========================================================================
CREATE TABLE IF NOT EXISTS dos.ui_module (
  profile_code    TEXT NOT NULL REFERENCES dos.profile_registry(code) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  card_position   INT  NOT NULL,
  is_business_card BOOLEAN NOT NULL DEFAULT TRUE,
  icon            TEXT,
  color_token     TEXT,
  description     TEXT,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  version         TEXT NOT NULL DEFAULT '1.0.0',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_code, code)
);

-- 2. ui_route
CREATE TABLE IF NOT EXISTS dos.ui_route (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code    TEXT NOT NULL,
  module_code     TEXT NOT NULL,
  path            TEXT NOT NULL,
  view_kind       TEXT NOT NULL CHECK (view_kind IN ('list','detail','form','dashboard','report','settings','workflow','inbox')),
  layout          TEXT NOT NULL DEFAULT 'standard',
  required_permission TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  FOREIGN KEY (profile_code, module_code) REFERENCES dos.ui_module(profile_code, code) ON DELETE CASCADE,
  UNIQUE (profile_code, module_code, path)
);

-- 3. ui_view
CREATE TABLE IF NOT EXISTS dos.ui_view (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code    TEXT NOT NULL,
  module_code     TEXT NOT NULL,
  view_code       TEXT NOT NULL,
  kind            TEXT NOT NULL,
  title_token     TEXT NOT NULL,
  data_source     TEXT NOT NULL,
  spec            JSONB NOT NULL,
  required_permission TEXT,
  FOREIGN KEY (profile_code, module_code) REFERENCES dos.ui_module(profile_code, code) ON DELETE CASCADE,
  UNIQUE (profile_code, module_code, view_code)
);

-- 4. ui_column
CREATE TABLE IF NOT EXISTS dos.ui_column (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code    TEXT NOT NULL,
  view_id         UUID NOT NULL REFERENCES dos.ui_view(id) ON DELETE CASCADE,
  field           TEXT NOT NULL,
  header_token    TEXT NOT NULL,
  width           TEXT,
  sortable        BOOLEAN NOT NULL DEFAULT TRUE,
  filterable      BOOLEAN NOT NULL DEFAULT TRUE,
  position        INT  NOT NULL,
  cell_renderer   TEXT,
  required_permission TEXT
);

-- 5. ui_filter
CREATE TABLE IF NOT EXISTS dos.ui_filter (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code    TEXT NOT NULL,
  view_id         UUID NOT NULL REFERENCES dos.ui_view(id) ON DELETE CASCADE,
  field           TEXT NOT NULL,
  operator        TEXT NOT NULL,
  control         TEXT NOT NULL,
  options_source  TEXT,
  default_value   JSONB,
  position        INT NOT NULL
);

-- 6. ui_action
CREATE TABLE IF NOT EXISTS dos.ui_action (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code    TEXT NOT NULL,
  view_id         UUID NOT NULL REFERENCES dos.ui_view(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  label_token     TEXT NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('toolbar','row','bulk','header','sidebar')),
  required_permission TEXT,
  workflow_event  TEXT,
  confirm         BOOLEAN NOT NULL DEFAULT FALSE
);

-- 7. ui_form
CREATE TABLE IF NOT EXISTS dos.ui_form (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code    TEXT NOT NULL,
  module_code     TEXT NOT NULL,
  form_code       TEXT NOT NULL,
  schema_json     JSONB NOT NULL,
  ui_schema_json  JSONB NOT NULL,
  required_permission TEXT,
  FOREIGN KEY (profile_code, module_code) REFERENCES dos.ui_module(profile_code, code) ON DELETE CASCADE,
  UNIQUE (profile_code, module_code, form_code)
);

-- 8. ui_navigation
CREATE TABLE IF NOT EXISTS dos.ui_navigation (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code    TEXT NOT NULL,
  module_code     TEXT NOT NULL,
  parent_id       UUID REFERENCES dos.ui_navigation(id) ON DELETE CASCADE,
  label_token     TEXT NOT NULL,
  icon            TEXT,
  route_path      TEXT,
  position        INT NOT NULL,
  required_permission TEXT,
  FOREIGN KEY (profile_code, module_code) REFERENCES dos.ui_module(profile_code, code) ON DELETE CASCADE
);

-- 9. ui_widget
CREATE TABLE IF NOT EXISTS dos.ui_widget (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code    TEXT NOT NULL,
  module_code     TEXT NOT NULL,
  widget_code     TEXT NOT NULL,
  kind            TEXT NOT NULL,
  title_token     TEXT NOT NULL,
  data_source     TEXT NOT NULL,
  config          JSONB NOT NULL,
  default_size    TEXT NOT NULL DEFAULT 'medium',
  FOREIGN KEY (profile_code, module_code) REFERENCES dos.ui_module(profile_code, code) ON DELETE CASCADE
);

-- 10. ui_preset
CREATE TABLE IF NOT EXISTS dos.ui_preset (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code    TEXT NOT NULL,
  view_id         UUID NOT NULL REFERENCES dos.ui_view(id) ON DELETE CASCADE,
  scope           TEXT NOT NULL CHECK (scope IN ('platform','tenant','role','user')),
  scope_value     TEXT,
  preset_code     TEXT NOT NULL,
  config          JSONB NOT NULL
);

-- 11. ui_tenant_override (already tenant-scoped — profile_code derived via tenant_profile)
CREATE TABLE IF NOT EXISTS dos.ui_tenant_override (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  ref_table       TEXT NOT NULL,
  ref_id          UUID NOT NULL,
  override_json   JSONB NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, ref_table, ref_id)
);

-- =========================================================================
-- Indexes — every lookup begins with profile_code
-- =========================================================================
CREATE INDEX IF NOT EXISTS ui_route_pm_idx        ON dos.ui_route        (profile_code, module_code);
CREATE INDEX IF NOT EXISTS ui_view_pm_idx         ON dos.ui_view         (profile_code, module_code);
CREATE INDEX IF NOT EXISTS ui_form_pm_idx         ON dos.ui_form         (profile_code, module_code);
CREATE INDEX IF NOT EXISTS ui_widget_pm_idx       ON dos.ui_widget       (profile_code, module_code);
CREATE INDEX IF NOT EXISTS ui_navigation_pm_idx   ON dos.ui_navigation   (profile_code, module_code);
CREATE INDEX IF NOT EXISTS ui_column_view_idx     ON dos.ui_column       (view_id);
CREATE INDEX IF NOT EXISTS ui_filter_view_idx     ON dos.ui_filter       (view_id);
CREATE INDEX IF NOT EXISTS ui_action_view_idx     ON dos.ui_action       (view_id);
CREATE INDEX IF NOT EXISTS tenant_profile_pf_idx  ON dos.tenant_profile  (profile_code);
COMMIT;
