-- =====================================================================
-- WS-DB-2 (Phase WS) — Workspace surface content catalogs.
--
-- Promotes the five missing draft tables required by the workspace
-- DB-driven rewrite plan into the main public schema. Mirrors the
-- shapes already authored under
--   platform/dos/migrations/public/_drafts/20260502_0138_*.sql
--   platform/dos/migrations/public/_drafts/20260502_0139_*.sql
-- but only emits the CREATE TABLE statements for tables that do not
-- yet exist (the three siblings dynamic_ui_ai_tips,
-- dynamic_ui_grid_columns, dynamic_ui_page_headers were already
-- created by earlier migrations and are intentionally NOT redeclared
-- here so this file stays idempotent).
--
-- Forward-only and idempotent (CREATE TABLE IF NOT EXISTS +
-- CREATE INDEX IF NOT EXISTS). Owner: ui-os-service. Doctrine binding:
-- Article 3 (DB owns the runtime contract).
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── 1. setup steps ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_setup_steps (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  step_key            VARCHAR(150) NOT NULL,
  label_key           VARCHAR(300) NOT NULL,
  description_key     VARCHAR(300),
  icon                VARCHAR(80),
  route               VARCHAR(300) NOT NULL,
  required_permission VARCHAR(150),
  sort_order          INTEGER      NOT NULL DEFAULT 0,
  condition_kind      VARCHAR(60)  NOT NULL DEFAULT 'always_pending'
                      CHECK (condition_kind IN (
                        'has_user_name','has_tenant_id','has_modules',
                        'has_team_members','custom','always_pending','always_done'
                      )),
  condition_payload   JSONB        NOT NULL DEFAULT '{}'::jsonb,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_setup_steps_scope
  ON dos.dynamic_ui_setup_steps (step_key, COALESCE(tenant_id,'*'));

CREATE INDEX IF NOT EXISTS ix_dui_setup_steps_tenant_active
  ON dos.dynamic_ui_setup_steps (tenant_id, is_active, sort_order);

-- ── 2. quick actions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_quick_actions (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  surface_key         VARCHAR(150) NOT NULL DEFAULT 'workspace.home',
  action_key          VARCHAR(150) NOT NULL,
  eyebrow_key         VARCHAR(300),
  label_key           VARCHAR(300) NOT NULL,
  description_key     VARCHAR(300),
  icon                VARCHAR(80),
  route               VARCHAR(300) NOT NULL,
  required_permission VARCHAR(150),
  sort_order          INTEGER      NOT NULL DEFAULT 0,
  variant             VARCHAR(20)  NOT NULL DEFAULT 'solid'
                      CHECK (variant IN ('solid','gradient','minimal')),
  tone                VARCHAR(20)  NOT NULL DEFAULT 'neutral'
                      CHECK (tone IN ('neutral','brand','accent','success','warning','danger','info')),
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_quick_actions_scope
  ON dos.dynamic_ui_quick_actions (surface_key, action_key, COALESCE(tenant_id,'*'));

CREATE INDEX IF NOT EXISTS ix_dui_quick_actions_surface
  ON dos.dynamic_ui_quick_actions (surface_key, is_active, sort_order);

-- ── 3. health probes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_health_probes (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  probe_key           VARCHAR(150) NOT NULL,
  label_key           VARCHAR(300) NOT NULL,
  description_key     VARCHAR(300),
  source_endpoint     VARCHAR(500),
  source_kind         VARCHAR(40)  NOT NULL DEFAULT 'http_status'
                      CHECK (source_kind IN ('http_status','count','signal','derived')),
  ok_threshold        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  required_permission VARCHAR(150) NOT NULL DEFAULT 'tenant_admin',
  sort_order          INTEGER      NOT NULL DEFAULT 0,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_health_probes_scope
  ON dos.dynamic_ui_health_probes (probe_key, COALESCE(tenant_id,'*'));

-- ── 4. empty states ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_empty_states (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  state_key            VARCHAR(150) NOT NULL,
  title_key            VARCHAR(300) NOT NULL,
  description_key      VARCHAR(300),
  tone                 VARCHAR(20)  NOT NULL DEFAULT 'neutral'
                       CHECK (tone IN ('neutral','brand','accent','success','warning','danger','info')),
  illustration         VARCHAR(80),
  primary_label_key    VARCHAR(300),
  primary_route        VARCHAR(300),
  primary_permission   VARCHAR(150),
  secondary_label_key  VARCHAR(300),
  secondary_route      VARCHAR(300),
  secondary_permission VARCHAR(150),
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT dui_empty_states_uk UNIQUE (state_key)
);

-- ── 5. trial banner rules ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_trial_banner_rules (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  threshold_days_min  INTEGER      NOT NULL DEFAULT 0,
  threshold_days_max  INTEGER      NOT NULL DEFAULT 365,
  severity            VARCHAR(20)  NOT NULL
                      CHECK (severity IN ('info','warning','danger')),
  title_key           VARCHAR(300) NOT NULL,
  message_key         VARCHAR(300) NOT NULL,
  cta_label_key       VARCHAR(300),
  cta_route           VARCHAR(300),
  dismissible         BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order          INTEGER      NOT NULL DEFAULT 0,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT dui_trial_banner_threshold_chk
    CHECK (threshold_days_min <= threshold_days_max)
);

CREATE INDEX IF NOT EXISTS ix_dui_trial_banner_rules_active
  ON dos.dynamic_ui_trial_banner_rules (is_active, sort_order);

COMMIT;
