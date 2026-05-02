-- =====================================================================
-- UI-OS runtime & personalization (20260501_0302)
--
-- Phase A — UI-OS / Phase F — DB-Driven UI Management.
--
-- Canonical 10-table delta on top of the Dynamic UI catalog
-- (20260501_0300). These tables persist runtime, per-user, and
-- per-tenant UI state. The catalog stays the source of truth for
-- *what exists* (modules / widgets / actions / navigation); these
-- tables capture *how a user / tenant is using it right now*.
--
-- Tables created (10):
--   1.  dos.ui_user_preferences      — global OS-level user prefs
--   2.  dos.ui_dashboards            — dashboard definitions per tenant/module/product
--   3.  dos.ui_dashboard_widgets     — widget instances on dashboards (grid pos)
--   4.  dos.ui_workspace_states      — WebOS desktop snapshot (open apps/panels)
--   5.  dos.ui_data_grid_states      — saved table column/sort/filter state
--   6.  dos.ui_tenant_branding       — logo, favicon, colors, css overrides
--   7.  dos.ui_locales               — supported locales (rtl flag)
--   8.  dos.ui_translations          — runtime dynamic translations
--   9.  dos.ui_tours                 — guided onboarding walkthroughs
--   10. dos.ui_user_tours_completed  — per-user tour completion ledger
--
-- Pre-existing tables that already cover other UI-OS concepts and are
-- intentionally NOT recreated:
--   - os_applications        → dos.dynamic_ui_modules
--   - os_widgets             → dos.dynamic_ui_widgets
--   - os_actions             → dos.dynamic_ui_actions
--   - ui_navigation_nodes    → dos.dynamic_ui_navigation
--   - dynamic-ui per-module prefs → dos.dynamic_ui_user_preferences
--                                   (different concern; see 0300)
--   - ui_tenants             → platform_dos.tenants_registry
--
-- tenant_id / user_id are VARCHAR(64) for consistency with the
-- existing dynamic_ui_* family. Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── 1. global OS-level user preferences ──────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_user_preferences (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  user_id             VARCHAR(64)  NOT NULL,

  locale              VARCHAR(20)  NOT NULL DEFAULT 'en',
  timezone            VARCHAR(64)  NOT NULL DEFAULT 'Asia/Riyadh',
  direction           VARCHAR(8)   NOT NULL DEFAULT 'ltr',
  appearance          VARCHAR(20)  NOT NULL DEFAULT 'system',
  density             VARCHAR(20)  NOT NULL DEFAULT 'comfortable',
  accent_color        VARCHAR(20),
  default_module_code VARCHAR(100),
  preferences         JSONB        NOT NULL DEFAULT '{}'::jsonb,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_user_prefs_tenant
  ON dos.ui_user_preferences (tenant_id);

-- ── 2. dashboards ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_dashboards (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  product_code        VARCHAR(100),
  module_code         VARCHAR(100),

  dashboard_key       VARCHAR(150) NOT NULL,
  title_key           VARCHAR(150),
  description_key     VARCHAR(200),

  visibility          VARCHAR(40)  NOT NULL DEFAULT 'tenant',
  required_permission VARCHAR(150),
  role_codes          TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],

  layout_config       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  is_default          BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,

  created_by          VARCHAR(64),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, dashboard_key)
);
CREATE INDEX IF NOT EXISTS ix_ui_dashboards_tenant_module
  ON dos.ui_dashboards (tenant_id, module_code);
CREATE INDEX IF NOT EXISTS ix_ui_dashboards_tenant_product
  ON dos.ui_dashboards (tenant_id, product_code);

-- ── 3. dashboard widgets ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_dashboard_widgets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  dashboard_id        UUID         NOT NULL REFERENCES dos.ui_dashboards(id) ON DELETE CASCADE,

  widget_key          VARCHAR(150) NOT NULL,
  instance_key        VARCHAR(150) NOT NULL,

  x                   INTEGER      NOT NULL DEFAULT 0,
  y                   INTEGER      NOT NULL DEFAULT 0,
  w                   INTEGER      NOT NULL DEFAULT 4,
  h                   INTEGER      NOT NULL DEFAULT 3,

  instance_config     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  data_binding        JSONB        NOT NULL DEFAULT '{}'::jsonb,

  required_permission VARCHAR(150),
  is_visible          BOOLEAN      NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, dashboard_id, instance_key)
);
CREATE INDEX IF NOT EXISTS ix_ui_dash_widgets_dashboard
  ON dos.ui_dashboard_widgets (dashboard_id);
CREATE INDEX IF NOT EXISTS ix_ui_dash_widgets_widget_key
  ON dos.ui_dashboard_widgets (widget_key);

-- ── 4. workspace states (WebOS desktop snapshot) ─────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_workspace_states (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  user_id             VARCHAR(64)  NOT NULL,

  product_code        VARCHAR(100),
  workspace_key       VARCHAR(120) NOT NULL DEFAULT 'default',

  active_module_code  VARCHAR(100),
  active_route        VARCHAR(300),
  open_apps           JSONB        NOT NULL DEFAULT '[]'::jsonb,
  panels              JSONB        NOT NULL DEFAULT '{}'::jsonb,
  layout_snapshot     JSONB        NOT NULL DEFAULT '{}'::jsonb,

  saved_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id, workspace_key)
);
CREATE INDEX IF NOT EXISTS ix_ui_workspace_user
  ON dos.ui_workspace_states (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS ix_ui_workspace_product
  ON dos.ui_workspace_states (tenant_id, product_code);

-- ── 5. data-grid states (per-user table prefs) ───────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_data_grid_states (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  user_id             VARCHAR(64)  NOT NULL,

  grid_key            VARCHAR(200) NOT NULL,
  module_code         VARCHAR(100),
  route_key           VARCHAR(300),

  column_state        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  sort_state          JSONB        NOT NULL DEFAULT '[]'::jsonb,
  filter_state        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  pagination_state    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  density             VARCHAR(20)  DEFAULT 'comfortable',

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id, grid_key)
);
CREATE INDEX IF NOT EXISTS ix_ui_grid_state_user
  ON dos.ui_data_grid_states (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS ix_ui_grid_state_module
  ON dos.ui_data_grid_states (module_code);

-- ── 6. tenant branding ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_tenant_branding (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL UNIQUE,

  brand_name          VARCHAR(200),
  logo_url            TEXT,
  logo_dark_url       TEXT,
  favicon_url         TEXT,

  primary_color       VARCHAR(20),
  secondary_color     VARCHAR(20),
  accent_color        VARCHAR(20),

  theme_tokens        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  css_overrides       JSONB        NOT NULL DEFAULT '{}'::jsonb,

  login_background_url TEXT,
  landing_config      JSONB        NOT NULL DEFAULT '{}'::jsonb,

  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 7. locales ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_locales (
  locale_code         VARCHAR(20)  PRIMARY KEY,
  native_name         VARCHAR(100) NOT NULL,
  english_name        VARCHAR(100) NOT NULL,
  direction           VARCHAR(8)   NOT NULL DEFAULT 'ltr',
  is_default          BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO dos.ui_locales (locale_code, native_name, english_name, direction, is_default, is_active) VALUES
  ('en', 'English',  'English', 'ltr', TRUE,  TRUE),
  ('ar', 'العربية',  'Arabic',  'rtl', FALSE, TRUE)
ON CONFLICT (locale_code) DO NOTHING;

-- ── 8. translations ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_translations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  locale_code         VARCHAR(20)  NOT NULL REFERENCES dos.ui_locales(locale_code) ON DELETE CASCADE,

  namespace           VARCHAR(80)  NOT NULL,
  translation_key     VARCHAR(300) NOT NULL,
  translation_value   TEXT         NOT NULL,

  source              VARCHAR(40)  DEFAULT 'dynamic-ui',
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ui_translations_scope
  ON dos.ui_translations (locale_code, namespace, translation_key, COALESCE(tenant_id, '*'));
CREATE INDEX IF NOT EXISTS ix_ui_translations_locale_ns
  ON dos.ui_translations (locale_code, namespace);

-- ── 9. tours ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_tours (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  product_code        VARCHAR(100),
  module_code         VARCHAR(100),

  tour_key            VARCHAR(150) NOT NULL,
  title_key           VARCHAR(150),
  description_key     VARCHAR(200),

  steps               JSONB        NOT NULL DEFAULT '[]'::jsonb,
  required_permission VARCHAR(150),
  trigger_config      JSONB        NOT NULL DEFAULT '{}'::jsonb,

  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ui_tours_scope
  ON dos.ui_tours (tour_key, COALESCE(tenant_id, '*'));
CREATE INDEX IF NOT EXISTS ix_ui_tours_module
  ON dos.ui_tours (module_code);
CREATE INDEX IF NOT EXISTS ix_ui_tours_product
  ON dos.ui_tours (product_code);

-- ── 10. user tour completion ledger ──────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_user_tours_completed (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  user_id             VARCHAR(64)  NOT NULL,
  tour_key            VARCHAR(150) NOT NULL,

  status              VARCHAR(20)  NOT NULL DEFAULT 'completed',
  completed_at        TIMESTAMPTZ,
  skipped_at          TIMESTAMPTZ,
  last_step_key       VARCHAR(150),

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id, tour_key)
);
CREATE INDEX IF NOT EXISTS ix_ui_user_tours_user
  ON dos.ui_user_tours_completed (tenant_id, user_id);

COMMIT;
