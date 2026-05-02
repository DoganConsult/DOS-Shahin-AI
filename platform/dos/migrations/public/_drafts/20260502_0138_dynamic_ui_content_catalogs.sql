-- dos:draft
-- =====================================================================
-- F.2b — Dynamic UI content catalogs (20260502_0138)
--
-- Five content catalogs that turn the workspace from "Angular template
-- with hardcoded I18N" into a DB-driven surface:
--
--   1. dos.dynamic_ui_setup_steps
--      The workspace setup checklist (today: 4 hardcoded steps in
--      workspace-home.component.ts). Each row = one step with i18n
--      label_key, route, and a condition_kind that decides whether
--      the step is "done" at render time.
--
--   2. dos.dynamic_ui_empty_states
--      Catalog of named empty states. `state_key` is referenced by
--      dynamic_ui_widgets.empty_state_key + dynamic_ui_routes.empty_state_key.
--      Carries title_key/description_key/cta + tone + illustration.
--
--   3. dos.dynamic_ui_trial_banner_rules
--      When and how to render the trial banner. Severity escalation
--      table (e.g. days <=3 = danger; days <=7 = warning; otherwise info).
--
--   4. dos.dynamic_ui_page_headers
--      Per-route hero content (eyebrow/title/subtitle keys + variant
--      + gradient_token). The workspace-home hero ("Command center")
--      is configured here, not hardcoded.
--
--   5. dos.dynamic_ui_health_probes
--      System-readiness items shown in the admin-only health card.
--      Each row is a probe (label_key + endpoint + ok_threshold).
--
-- All *_key columns reference dos.i18n_keys.key (logical FK; not enforced
-- via SQL FK because i18n_keys uses UUID + composite scoping). The
-- resolver joins them at runtime.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── 1. setup steps ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_setup_steps (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64),                       -- NULL = platform default
  step_key          VARCHAR(150) NOT NULL,             -- 'profile', 'tenant', 'modules', 'team'
  label_key         VARCHAR(300) NOT NULL,
  description_key   VARCHAR(300),
  icon              VARCHAR(80),
  route             VARCHAR(300) NOT NULL,
  required_permission VARCHAR(150),
  sort_order        INTEGER      NOT NULL DEFAULT 0,
  condition_kind    VARCHAR(60)  NOT NULL DEFAULT 'always_pending'
                    CHECK (condition_kind IN (
                      'has_user_name','has_tenant_id','has_modules',
                      'has_team_members','custom','always_pending','always_done'
                    )),
  condition_payload JSONB        NOT NULL DEFAULT '{}'::jsonb,
                                                         -- e.g. {"min_members": 2}
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_setup_steps_scope
  ON dos.dynamic_ui_setup_steps (step_key, COALESCE(tenant_id,'*'));

CREATE INDEX IF NOT EXISTS ix_dui_setup_steps_tenant_active
  ON dos.dynamic_ui_setup_steps (tenant_id, is_active, sort_order);

-- ── 2. empty states ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_empty_states (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  state_key         VARCHAR(150) NOT NULL,             -- e.g. 'workspace.tasks.empty'
  title_key         VARCHAR(300) NOT NULL,
  description_key   VARCHAR(300),
  tone              VARCHAR(20)  NOT NULL DEFAULT 'neutral'
                    CHECK (tone IN ('neutral','brand','accent','success','warning','danger','info')),
  illustration      VARCHAR(80),                        -- token name resolved by FE
  primary_label_key   VARCHAR(300),
  primary_route       VARCHAR(300),
  primary_permission  VARCHAR(150),
  secondary_label_key VARCHAR(300),
  secondary_route     VARCHAR(300),
  secondary_permission VARCHAR(150),
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT dui_empty_states_uk UNIQUE (state_key)
);

-- ── 3. trial banner rules ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_trial_banner_rules (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64),                       -- NULL = platform default
  threshold_days_min INTEGER      NOT NULL DEFAULT 0,  -- inclusive
  threshold_days_max INTEGER      NOT NULL DEFAULT 365,-- inclusive
  severity          VARCHAR(20)  NOT NULL
                    CHECK (severity IN ('info','warning','danger')),
  title_key         VARCHAR(300) NOT NULL,
  message_key       VARCHAR(300) NOT NULL,
  cta_label_key     VARCHAR(300),
  cta_route         VARCHAR(300),
  dismissible       BOOLEAN      NOT NULL DEFAULT FALSE,
  sort_order        INTEGER      NOT NULL DEFAULT 0,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT dui_trial_banner_threshold_chk
    CHECK (threshold_days_min <= threshold_days_max)
);

CREATE INDEX IF NOT EXISTS ix_dui_trial_banner_rules_active
  ON dos.dynamic_ui_trial_banner_rules (is_active, sort_order);

-- ── 4. page headers (hero content) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_page_headers (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64),                       -- NULL = platform default
  route_key         VARCHAR(300) NOT NULL,             -- e.g. '/workspace-home'
  eyebrow_key       VARCHAR(300),
  title_key         VARCHAR(300) NOT NULL,
  subtitle_key      VARCHAR(300),
  variant           VARCHAR(20)  NOT NULL DEFAULT 'signature'
                    CHECK (variant IN ('signature','gradient','solid','minimal')),
  gradient_token    VARCHAR(120) NOT NULL DEFAULT '--dos-gradient-brand-soft',
  mesh_layers       JSONB        NOT NULL DEFAULT
                    '["--dos-gradient-mesh-1","--dos-gradient-mesh-2","--dos-gradient-mesh-3"]'::jsonb,
  hairline_visible  BOOLEAN      NOT NULL DEFAULT TRUE,
  hairline_token    VARCHAR(120) NOT NULL DEFAULT '--dos-gradient-kpi-line',
  density           VARCHAR(20)  NOT NULL DEFAULT 'comfortable'
                    CHECK (density IN ('compact','cozy','comfortable')),
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_page_headers_scope
  ON dos.dynamic_ui_page_headers (route_key, COALESCE(tenant_id,'*'));

-- ── 5. health probes (admin-only readiness) ─────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_health_probes (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64),                       -- NULL = platform default
  probe_key         VARCHAR(150) NOT NULL,             -- 'dna-modules', 'openfga-seed'
  label_key         VARCHAR(300) NOT NULL,
  description_key   VARCHAR(300),
  source_endpoint   VARCHAR(500),                       -- relative URL to GET
  source_kind       VARCHAR(40)  NOT NULL DEFAULT 'http_status'
                    CHECK (source_kind IN ('http_status','count','signal','derived')),
  ok_threshold      JSONB        NOT NULL DEFAULT '{}'::jsonb,
                                                         -- shape depends on source_kind
  required_permission VARCHAR(150) NOT NULL DEFAULT 'tenant_admin',
  sort_order        INTEGER      NOT NULL DEFAULT 0,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_health_probes_scope
  ON dos.dynamic_ui_health_probes (probe_key, COALESCE(tenant_id,'*'));

COMMIT;
