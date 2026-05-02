-- =====================================================================
-- Dynamic UI catalog (20260501_0300)
--
-- Phase F — DB-Driven UI Management. Creates the canonical
-- `dos.dynamic_ui_*` table family consumed by `services/dynamic-ui-service`
-- (see services/.dynamic-ui-service.skipped/src/pg-store.ts) and by the
-- Dynamic UI Angular resolvers in platform/config-center/shared/dynamic-ui.
--
-- Tables created (18):
--   1.  dos.dynamic_ui_modules              — module catalog (registry view)
--   2.  dos.dynamic_ui_module_status        — per-tenant enrollment
--   3.  dos.dynamic_ui_navigation           — nav entries
--   4.  dos.dynamic_ui_routes               — page-experience routes
--   5.  dos.dynamic_ui_actions              — page actions
--   6.  dos.dynamic_ui_widgets              — page widgets
--   7.  dos.dynamic_ui_agents               — agent definitions
--   8.  dos.dynamic_ui_agent_actions        — agent-bound actions
--   9.  dos.dynamic_ui_page_agents          — page ↔ agent placement
--   10. dos.dynamic_ui_workflow_agents      — workflow-step ↔ agent
--   11. dos.dynamic_ui_agent_squads         — squads
--   12. dos.dynamic_ui_agent_squad_members  — squad membership
--   13. dos.dynamic_ui_kpis                 — KPI declarations
--   14. dos.dynamic_ui_data_resources       — data-resource bindings
--   15. dos.dynamic_ui_theme_tokens         — theme override tokens
--   16. dos.dynamic_ui_intents              — utterance → action mapping
--   17. dos.dynamic_ui_user_preferences     — per-user prefs
--   18. dos.dynamic_ui_shells               — shell layout regions
--
-- Tenant-scoped rows use VARCHAR(64) `tenant_id`. NULL tenant_id means
-- "platform default" (the row applies to all tenants unless overridden).
-- Where natural identity needs to discriminate platform-default rows from
-- tenant rows, a UNIQUE INDEX over `COALESCE(tenant_id, '*')` is used
-- alongside a UUID surrogate primary key (PostgreSQL does not allow
-- expression-based PRIMARY KEY constraints).
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── 1. modules ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_modules (
  module_code                       VARCHAR(100) PRIMARY KEY,
  platform_key                      VARCHAR(50),
  product_key                       VARCHAR(50)  NOT NULL,
  display_name                      VARCHAR(200) NOT NULL,
  default_route                     VARCHAR(300) NOT NULL,
  registry_status                   VARCHAR(40)  NOT NULL DEFAULT 'active',
  default_tenant_enrollment_status  VARCHAR(40)  NOT NULL DEFAULT 'enabled',
  canonical_source                  VARCHAR(200),
  created_at                        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 2. module status (per-tenant enrollment) ─────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_module_status (
  tenant_id          VARCHAR(64)  NOT NULL,
  module_code        VARCHAR(100) NOT NULL REFERENCES dos.dynamic_ui_modules(module_code) ON DELETE CASCADE,
  enrollment_status  VARCHAR(40)  NOT NULL DEFAULT 'enabled',
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, module_code)
);
CREATE INDEX IF NOT EXISTS ix_dui_module_status_module ON dos.dynamic_ui_module_status (module_code);

-- ── 3. navigation ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_navigation (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    VARCHAR(64),
  module_code  VARCHAR(100) NOT NULL,
  label        VARCHAR(200) NOT NULL,
  route        VARCHAR(300) NOT NULL,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  parent_id    UUID         REFERENCES dos.dynamic_ui_navigation(id) ON DELETE CASCADE,
  readiness    VARCHAR(40),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_dui_nav_tenant_module ON dos.dynamic_ui_navigation (tenant_id, module_code);
CREATE INDEX IF NOT EXISTS ix_dui_nav_parent        ON dos.dynamic_ui_navigation (parent_id);

-- ── 4. routes (page experience) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_routes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             VARCHAR(64),
  module_code           VARCHAR(100) NOT NULL,
  path_pattern          VARCHAR(300) NOT NULL,
  component_key         VARCHAR(150) NOT NULL,
  permission_key        VARCHAR(150),
  sort_order            INTEGER      NOT NULL DEFAULT 0,
  readiness             VARCHAR(40),
  page_type             VARCHAR(60),
  layout                VARCHAR(60),
  kpi_scope             VARCHAR(60),
  user_intent           VARCHAR(120),
  audience_profiles     TEXT[],
  data_scope_mode       VARCHAR(40),
  realtime_channels     TEXT[],
  evidence_required     BOOLEAN,
  signature_widget      VARCHAR(120),
  mobile_variant        JSONB,
  empty_state_key       VARCHAR(120),
  error_state_key       VARCHAR(120),
  help_key              VARCHAR(120),
  title_key             VARCHAR(150),
  subtitle_key          VARCHAR(150),
  data_resource_key     VARCHAR(150),
  visible_when_perm     TEXT[],
  visible_when_profile  TEXT[],
  default_view          VARCHAR(60),
  audit_enabled         BOOLEAN,
  realtime_enabled      BOOLEAN,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_dui_routes_tenant_module ON dos.dynamic_ui_routes (tenant_id, module_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_routes_module_path
  ON dos.dynamic_ui_routes (module_code, path_pattern, COALESCE(tenant_id, '*'));

-- ── 5. actions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_actions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64),
  module_code        VARCHAR(100) NOT NULL,
  route              VARCHAR(300) NOT NULL,
  action_id          VARCHAR(150) NOT NULL,
  position           VARCHAR(60),
  label_key          VARCHAR(150),
  icon               VARCHAR(120),
  permission         VARCHAR(150),
  profiles           TEXT[],
  risk_level         VARCHAR(40),
  requires_approval  BOOLEAN      NOT NULL DEFAULT FALSE,
  workflow_code      VARCHAR(150),
  evidence_required  BOOLEAN      NOT NULL DEFAULT FALSE,
  handler_key        VARCHAR(150),
  sort_order         INTEGER      NOT NULL DEFAULT 0,
  is_active          BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_actions_scope
  ON dos.dynamic_ui_actions (module_code, route, action_id, COALESCE(tenant_id, '*'));
CREATE INDEX IF NOT EXISTS ix_dui_actions_module_route ON dos.dynamic_ui_actions (module_code, route);

-- ── 6. widgets ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_widgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64),
  module_code   VARCHAR(100) NOT NULL,
  route         VARCHAR(300) NOT NULL,
  widget_key    VARCHAR(150) NOT NULL,
  zone          VARCHAR(60),
  permission    VARCHAR(150),
  profiles      TEXT[],
  config        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  is_signature  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_widgets_scope
  ON dos.dynamic_ui_widgets (module_code, route, widget_key, COALESCE(tenant_id, '*'));
CREATE INDEX IF NOT EXISTS ix_dui_widgets_module_route ON dos.dynamic_ui_widgets (module_code, route);

-- ── 7. agents ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_agents (
  agent_id                 VARCHAR(150) PRIMARY KEY,
  module_code              VARCHAR(100),
  name_key                 VARCHAR(150) NOT NULL,
  description_key          VARCHAR(200),
  level                    VARCHAR(40)  NOT NULL DEFAULT 'L1',
  scope                    VARCHAR(60),
  capabilities             JSONB        NOT NULL DEFAULT '{}'::jsonb,
  allowed_page_types       TEXT[],
  allowed_actions          TEXT[],
  requires_human_approval  BOOLEAN      NOT NULL DEFAULT TRUE,
  audit_required           BOOLEAN      NOT NULL DEFAULT TRUE,
  default_risk_level       VARCHAR(40)  NOT NULL DEFAULT 'low',
  prompt_template_ref      VARCHAR(200),
  is_active                BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_dui_agents_module ON dos.dynamic_ui_agents (module_code);

-- ── 8. agent actions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_agent_actions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            VARCHAR(64),
  module_code          VARCHAR(100) NOT NULL,
  route                VARCHAR(300) NOT NULL,
  agent_id             VARCHAR(150) NOT NULL REFERENCES dos.dynamic_ui_agents(agent_id) ON DELETE CASCADE,
  action_id            VARCHAR(150) NOT NULL,
  label_key            VARCHAR(150),
  permission           VARCHAR(150),
  level                VARCHAR(40),
  risk_level           VARCHAR(40),
  requires_approval    BOOLEAN      NOT NULL DEFAULT TRUE,
  workflow_code        VARCHAR(150),
  evidence_required    BOOLEAN      NOT NULL DEFAULT FALSE,
  prompt_template_ref  VARCHAR(200),
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_agent_actions_scope
  ON dos.dynamic_ui_agent_actions (module_code, route, agent_id, action_id, COALESCE(tenant_id, '*'));

-- ── 9. page agents ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_page_agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64),
  module_code   VARCHAR(100) NOT NULL,
  route         VARCHAR(300) NOT NULL,
  agent_id      VARCHAR(150) NOT NULL REFERENCES dos.dynamic_ui_agents(agent_id) ON DELETE CASCADE,
  is_primary    BOOLEAN      NOT NULL DEFAULT FALSE,
  presentation  VARCHAR(60),
  profiles      TEXT[],
  permission    VARCHAR(150),
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_page_agents_scope
  ON dos.dynamic_ui_page_agents (module_code, route, agent_id, COALESCE(tenant_id, '*'));

-- ── 10. workflow agents ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_workflow_agents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        VARCHAR(64),
  module_code      VARCHAR(100) NOT NULL,
  workflow_code    VARCHAR(150) NOT NULL,
  step_code        VARCHAR(150) NOT NULL,
  agent_id         VARCHAR(150) NOT NULL REFERENCES dos.dynamic_ui_agents(agent_id) ON DELETE CASCADE,
  agent_action_id  VARCHAR(150),
  blocking         BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order       INTEGER      NOT NULL DEFAULT 0,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_workflow_agents_scope
  ON dos.dynamic_ui_workflow_agents (module_code, workflow_code, step_code, agent_id, COALESCE(tenant_id, '*'));

-- ── 11. agent squads ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_agent_squads (
  squad_id                       VARCHAR(150) PRIMARY KEY,
  module_code                    VARCHAR(100) NOT NULL,
  name_key                       VARCHAR(150) NOT NULL,
  orchestrator_agent_id          VARCHAR(150) REFERENCES dos.dynamic_ui_agents(agent_id) ON DELETE SET NULL,
  max_depth                      INTEGER      NOT NULL DEFAULT 3,
  prevent_circular_delegation    BOOLEAN      NOT NULL DEFAULT TRUE,
  ledger_required                BOOLEAN      NOT NULL DEFAULT TRUE,
  human_approval_required        BOOLEAN      NOT NULL DEFAULT TRUE,
  is_active                      BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS ix_dui_squads_module ON dos.dynamic_ui_agent_squads (module_code);

-- ── 12. squad members ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_agent_squad_members (
  squad_id       VARCHAR(150) NOT NULL REFERENCES dos.dynamic_ui_agent_squads(squad_id) ON DELETE CASCADE,
  agent_id       VARCHAR(150) NOT NULL REFERENCES dos.dynamic_ui_agents(agent_id) ON DELETE CASCADE,
  role_in_squad  VARCHAR(60)  NOT NULL DEFAULT 'member',
  sort_order     INTEGER      NOT NULL DEFAULT 0,
  PRIMARY KEY (squad_id, agent_id)
);

-- ── 13. KPIs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_kpis (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64),
  module_code    VARCHAR(100) NOT NULL,
  route          VARCHAR(300),
  kpi_key        VARCHAR(150) NOT NULL,
  label_key      VARCHAR(150),
  unit           VARCHAR(40),
  data_resource  VARCHAR(150),
  permission     VARCHAR(150),
  profiles       TEXT[],
  scope          VARCHAR(60)  NOT NULL DEFAULT 'page',
  format         VARCHAR(60),
  trend_enabled  BOOLEAN      NOT NULL DEFAULT FALSE,
  threshold      JSONB,
  sort_order     INTEGER      NOT NULL DEFAULT 0,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_kpis_scope
  ON dos.dynamic_ui_kpis (module_code, COALESCE(route, '*'), kpi_key, COALESCE(tenant_id, '*'));

-- ── 14. data resources ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_data_resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64),
  module_code     VARCHAR(100) NOT NULL,
  resource_key    VARCHAR(150) NOT NULL,
  resource_type   VARCHAR(40)  NOT NULL,
  url_or_query    TEXT         NOT NULL,
  permission      VARCHAR(150),
  cache_ttl_sec   INTEGER,
  realtime_topic  VARCHAR(200),
  pagination      JSONB,
  shape_ref       VARCHAR(200),
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_data_resources_scope
  ON dos.dynamic_ui_data_resources (module_code, resource_key, COALESCE(tenant_id, '*'));

-- ── 15. theme tokens ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_theme_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    VARCHAR(64),
  module_code  VARCHAR(100),
  token_key    VARCHAR(150) NOT NULL,
  token_value  TEXT         NOT NULL,
  scope        VARCHAR(60)  NOT NULL DEFAULT 'global',
  route        VARCHAR(300),
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_theme_tokens_scope
  ON dos.dynamic_ui_theme_tokens (token_key, COALESCE(module_code, '*'), COALESCE(route, '*'), COALESCE(tenant_id, '*'));

-- ── 16. intents ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_intents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     VARCHAR(64),
  module_code   VARCHAR(100) NOT NULL,
  intent_key    VARCHAR(150) NOT NULL,
  utterance_en  TEXT,
  utterance_ar  TEXT,
  route         VARCHAR(300),
  action_id     VARCHAR(150),
  permission    VARCHAR(150),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_intents_scope
  ON dos.dynamic_ui_intents (module_code, intent_key, COALESCE(tenant_id, '*'));

-- ── 17. user preferences ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_user_preferences (
  tenant_id    VARCHAR(64)  NOT NULL,
  user_id      VARCHAR(64)  NOT NULL,
  module_code  VARCHAR(100) NOT NULL,
  route        VARCHAR(300) NOT NULL DEFAULT '*',
  pref_key     VARCHAR(150) NOT NULL,
  payload      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  scope        VARCHAR(60)  NOT NULL DEFAULT 'user',
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, user_id, module_code, route, pref_key)
);

-- ── 18. shells ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_shells (
  module_code     VARCHAR(100) NOT NULL,
  layout_version  VARCHAR(40)  NOT NULL DEFAULT 'v1',
  layout          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (module_code, layout_version)
);

COMMIT;
