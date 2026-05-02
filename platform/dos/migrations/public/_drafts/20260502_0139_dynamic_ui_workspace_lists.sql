-- dos:draft
-- =====================================================================
-- F.2c — Workspace list catalogs (20260502_0139)
--
-- Lists rendered on the workspace surface that are TODAY hardcoded
-- in workspace-home.component.ts:
--
--   1. dos.dynamic_ui_quick_actions  — the "Quick actions" card grid
--                                      (Account / Workspace / Preferences /
--                                      Administration / Team / Copilot).
--                                      Hardcoded today; this table replaces
--                                      the inline `quickActions = computed(...)`.
--
--   2. dos.dynamic_ui_ai_tips        — AI recommendations card. Each row
--                                      pairs a condition with a tip
--                                      (title/body/cta keys).
--
--   3. dos.dynamic_ui_grid_columns   — generic "table column" registry
--                                      so the module-launcher table and
--                                      future grids (tasks, approvals,
--                                      activity) read columns from DB.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── 1. quick actions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_quick_actions (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64),                       -- NULL = platform default
  surface_key       VARCHAR(150) NOT NULL DEFAULT 'workspace.home',
                                                         -- which surface this action lives on
  action_key        VARCHAR(150) NOT NULL,             -- 'profile','tenant-settings','ask-ai'
  eyebrow_key       VARCHAR(300),
  label_key         VARCHAR(300) NOT NULL,
  description_key   VARCHAR(300),
  icon              VARCHAR(80),
  route             VARCHAR(300) NOT NULL,
  required_permission VARCHAR(150),
  sort_order        INTEGER      NOT NULL DEFAULT 0,
  variant           VARCHAR(20)  NOT NULL DEFAULT 'solid'
                    CHECK (variant IN ('solid','gradient','minimal')),
  tone              VARCHAR(20)  NOT NULL DEFAULT 'neutral'
                    CHECK (tone IN ('neutral','brand','accent','success','warning','danger','info')),
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_quick_actions_scope
  ON dos.dynamic_ui_quick_actions (surface_key, action_key, COALESCE(tenant_id,'*'));

CREATE INDEX IF NOT EXISTS ix_dui_quick_actions_surface
  ON dos.dynamic_ui_quick_actions (surface_key, is_active, sort_order);

-- ── 2. AI tips ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_ai_tips (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64),                       -- NULL = platform default
  tip_key           VARCHAR(150) NOT NULL,             -- 'setup-incomplete', 'invite-team'
  title_key         VARCHAR(300) NOT NULL,
  body_key          VARCHAR(300) NOT NULL,
  cta_label_key     VARCHAR(300),
  cta_route         VARCHAR(300),
  icon              VARCHAR(80),
  condition_kind    VARCHAR(60)  NOT NULL DEFAULT 'always'
                    CHECK (condition_kind IN (
                      'always','setup_below','setup_above','has_modules',
                      'no_modules','tenant_admin','member_count_below',
                      'trial_active','trial_expired','custom'
                    )),
  condition_payload JSONB        NOT NULL DEFAULT '{}'::jsonb,
                                                         -- e.g. {"setup_threshold": 100}
  priority          INTEGER      NOT NULL DEFAULT 50,  -- lower = higher priority
  required_permission VARCHAR(150),
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_ai_tips_scope
  ON dos.dynamic_ui_ai_tips (tip_key, COALESCE(tenant_id,'*'));

CREATE INDEX IF NOT EXISTS ix_dui_ai_tips_active_priority
  ON dos.dynamic_ui_ai_tips (is_active, priority);

-- ── 3. grid columns (registry for any data table on the workspace) ──
CREATE TABLE IF NOT EXISTS dos.dynamic_ui_grid_columns (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         VARCHAR(64),                       -- NULL = platform default
  scope             VARCHAR(150) NOT NULL,             -- 'workspace.modules','workspace.tasks'
  col_key           VARCHAR(80)  NOT NULL,             -- 'title','code','description','status'
  label_key         VARCHAR(300) NOT NULL,
  data_field        VARCHAR(150) NOT NULL,             -- field name on the row object
  data_kind         VARCHAR(40)  NOT NULL DEFAULT 'text'
                    CHECK (data_kind IN (
                      'text','number','date','status_pill','badge','link',
                      'icon','code','custom'
                    )),
  format_payload    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  is_sortable       BOOLEAN      NOT NULL DEFAULT TRUE,
  is_filterable     BOOLEAN      NOT NULL DEFAULT FALSE,
  default_sort      VARCHAR(10)  CHECK (default_sort IN ('asc','desc')),
  sort_priority     INTEGER,
  width_hint        VARCHAR(40),                        -- '120px','1fr','minmax(...)'
  align             VARCHAR(20)  NOT NULL DEFAULT 'start'
                    CHECK (align IN ('start','center','end')),
  sort_order        INTEGER      NOT NULL DEFAULT 0,
  is_visible        BOOLEAN      NOT NULL DEFAULT TRUE,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_dui_grid_columns_scope
  ON dos.dynamic_ui_grid_columns (scope, col_key, COALESCE(tenant_id,'*'));

CREATE INDEX IF NOT EXISTS ix_dui_grid_columns_scope_visible
  ON dos.dynamic_ui_grid_columns (scope, is_visible, sort_order);

COMMIT;
