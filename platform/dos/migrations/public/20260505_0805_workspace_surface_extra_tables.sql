-- =====================================================================
-- WS-DB-2 (extra) — Workspace surface composer-specific catalogs.
--
-- The pre-existing tables `dos.dynamic_ui_ai_tips`,
-- `dos.dynamic_ui_grid_columns`, `dos.dynamic_ui_page_headers` are
-- module-scoped (PK includes `module_code` with an FK to
-- `dynamic_ui_modules`) and serve the bespoke template engine. They
-- can NOT host the workspace-shell composer rows, which are surface-
-- and route-scoped (no module_code, no FK).
--
-- This migration adds three sibling tables shaped for the workspace
-- surface composer (per workspace-db-driven-rewrite-plan.md §10.2):
--
--   1. dos.dynamic_ui_workspace_ai_tips
--   2. dos.dynamic_ui_workspace_grid_columns
--   3. dos.dynamic_ui_workspace_page_headers
--
-- Forward-only and idempotent. Owner: ui-os-service.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── 1. workspace AI tips ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_workspace_ai_tips (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  tip_key             VARCHAR(150) NOT NULL,
  title_key           VARCHAR(300) NOT NULL,
  body_key            VARCHAR(300) NOT NULL,
  cta_label_key       VARCHAR(300),
  cta_route           VARCHAR(300),
  icon                VARCHAR(80),
  condition_kind      VARCHAR(60)  NOT NULL DEFAULT 'always'
                      CHECK (condition_kind IN (
                        'always','setup_below','setup_above','has_modules',
                        'no_modules','tenant_admin','member_count_below',
                        'trial_active','trial_expired','custom'
                      )),
  condition_payload   JSONB        NOT NULL DEFAULT '{}'::jsonb,
  priority            INTEGER      NOT NULL DEFAULT 50,
  required_permission VARCHAR(150),
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_ws_ai_tips_scope
  ON dos.dynamic_ui_workspace_ai_tips (tip_key, COALESCE(tenant_id,'*'));

CREATE INDEX IF NOT EXISTS ix_dui_ws_ai_tips_active_priority
  ON dos.dynamic_ui_workspace_ai_tips (is_active, priority);

-- ── 2. workspace grid columns ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_workspace_grid_columns (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64),
  scope           VARCHAR(150) NOT NULL,
  col_key         VARCHAR(80)  NOT NULL,
  label_key       VARCHAR(300) NOT NULL,
  data_field      VARCHAR(150) NOT NULL,
  data_kind       VARCHAR(40)  NOT NULL DEFAULT 'text'
                  CHECK (data_kind IN (
                    'text','number','date','status_pill','badge','link',
                    'icon','code','custom'
                  )),
  format_payload  JSONB        NOT NULL DEFAULT '{}'::jsonb,
  is_sortable     BOOLEAN      NOT NULL DEFAULT TRUE,
  is_filterable   BOOLEAN      NOT NULL DEFAULT FALSE,
  default_sort    VARCHAR(10)  CHECK (default_sort IN ('asc','desc')),
  sort_priority   INTEGER,
  width_hint      VARCHAR(40),
  align           VARCHAR(20)  NOT NULL DEFAULT 'start'
                  CHECK (align IN ('start','center','end')),
  sort_order      INTEGER      NOT NULL DEFAULT 0,
  is_visible      BOOLEAN      NOT NULL DEFAULT TRUE,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_ws_grid_columns_scope
  ON dos.dynamic_ui_workspace_grid_columns (scope, col_key, COALESCE(tenant_id,'*'));

CREATE INDEX IF NOT EXISTS ix_dui_ws_grid_columns_scope_visible
  ON dos.dynamic_ui_workspace_grid_columns (scope, is_visible, sort_order);

-- ── 3. workspace page headers ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_workspace_page_headers (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64),
  route_key        VARCHAR(300) NOT NULL,
  variant          VARCHAR(40)  NOT NULL DEFAULT 'signature'
                   CHECK (variant IN ('standard','hero','compact','split','signature')),
  density          VARCHAR(20)  NOT NULL DEFAULT 'comfortable'
                   CHECK (density IN ('compact','comfortable','spacious')),
  eyebrow_key      VARCHAR(300),
  title_key        VARCHAR(300) NOT NULL,
  subtitle_key     VARCHAR(300),
  gradient_token   VARCHAR(120) NOT NULL DEFAULT '--dos-gradient-brand-soft',
  mesh_layers      JSONB        NOT NULL DEFAULT '[]'::jsonb,
  hairline_visible BOOLEAN      NOT NULL DEFAULT TRUE,
  hairline_token   VARCHAR(120) NOT NULL DEFAULT '--dos-gradient-kpi-line',
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_ws_page_headers_scope
  ON dos.dynamic_ui_workspace_page_headers (route_key, COALESCE(tenant_id,'*'));

COMMIT;
