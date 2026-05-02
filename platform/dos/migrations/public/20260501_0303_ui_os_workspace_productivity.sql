-- =====================================================================
-- UI-OS workspace productivity (20260501_0303)
--
-- Phase A — UI-OS / Phase F — DB-Driven UI Management.
--
-- Second-wave delta on top of 20260501_0302. Adds the seven tables
-- that make the workspace feel like a real enterprise OS without
-- jumping into WebOS-heavy concerns (sessions, window-state audit,
-- clipboard, search history) that should wait for a stable workspace.
--
-- Tables created (7):
--   1. dos.ui_saved_views              — saved page/table views
--   2. dos.ui_pinned_items             — user-pinned modules/pages/dashboards/records
--   3. dos.ui_recent_items             — recently opened apps/pages/records
--   4. dos.ui_command_palette_items    — runtime command palette entries
--   5. dos.ui_user_shortcuts           — keyboard shortcuts / quick actions per user
--   6. dos.ui_announcements            — tenant/product/module banners and release notes
--   7. dos.ui_user_announcements_read  — tracks who dismissed/read announcements
--
-- tenant_id / user_id are VARCHAR(64) for consistency with the
-- existing dynamic_ui_* family. Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── 1. saved views ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_saved_views (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  user_id             VARCHAR(64),

  view_key            VARCHAR(150) NOT NULL,
  scope               VARCHAR(40)  NOT NULL DEFAULT 'user',
  module_code         VARCHAR(100),
  route_key           VARCHAR(300),
  entity_type         VARCHAR(80),

  name                VARCHAR(200) NOT NULL,
  description         TEXT,
  view_config         JSONB        NOT NULL DEFAULT '{}'::jsonb,

  is_default          BOOLEAN      NOT NULL DEFAULT FALSE,
  is_shared           BOOLEAN      NOT NULL DEFAULT FALSE,
  required_permission VARCHAR(150),

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ui_saved_views_user_key
  ON dos.ui_saved_views (tenant_id, COALESCE(user_id, '*'), view_key);
CREATE INDEX IF NOT EXISTS ix_ui_saved_views_tenant_module
  ON dos.ui_saved_views (tenant_id, module_code);
CREATE INDEX IF NOT EXISTS ix_ui_saved_views_entity
  ON dos.ui_saved_views (entity_type);

-- ── 2. pinned items ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_pinned_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  user_id             VARCHAR(64)  NOT NULL,

  entity_type         VARCHAR(40)  NOT NULL,
  entity_id           VARCHAR(200) NOT NULL,
  module_code         VARCHAR(100),
  route_key           VARCHAR(300),

  label               VARCHAR(200),
  icon                VARCHAR(120),
  sort_order          INTEGER      NOT NULL DEFAULT 0,
  metadata            JSONB        NOT NULL DEFAULT '{}'::jsonb,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_pinned_user
  ON dos.ui_pinned_items (tenant_id, user_id, sort_order);
CREATE INDEX IF NOT EXISTS ix_ui_pinned_module
  ON dos.ui_pinned_items (module_code);

-- ── 3. recent items ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_recent_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  user_id             VARCHAR(64)  NOT NULL,

  entity_type         VARCHAR(40)  NOT NULL,
  entity_id           VARCHAR(200) NOT NULL,
  module_code         VARCHAR(100),
  route_key           VARCHAR(300),

  label               VARCHAR(200),
  icon                VARCHAR(120),
  metadata            JSONB        NOT NULL DEFAULT '{}'::jsonb,

  visit_count         INTEGER      NOT NULL DEFAULT 1,
  last_visited_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_recent_user_visited
  ON dos.ui_recent_items (tenant_id, user_id, last_visited_at DESC);
CREATE INDEX IF NOT EXISTS ix_ui_recent_module
  ON dos.ui_recent_items (module_code);

-- ── 4. command palette items ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_command_palette_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  product_code        VARCHAR(100),
  module_code         VARCHAR(100),

  command_key         VARCHAR(150) NOT NULL,
  label_key           VARCHAR(150) NOT NULL,
  description_key     VARCHAR(200),
  icon                VARCHAR(120),
  shortcut            VARCHAR(40),

  command_type        VARCHAR(40)  NOT NULL DEFAULT 'navigate',
  command_payload     JSONB        NOT NULL DEFAULT '{}'::jsonb,

  required_permission VARCHAR(150),
  required_role_codes TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  keywords            TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],

  sort_order          INTEGER      NOT NULL DEFAULT 0,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ui_palette_scope
  ON dos.ui_command_palette_items (command_key, COALESCE(tenant_id, '*'));
CREATE INDEX IF NOT EXISTS ix_ui_palette_module
  ON dos.ui_command_palette_items (module_code);
CREATE INDEX IF NOT EXISTS ix_ui_palette_product
  ON dos.ui_command_palette_items (product_code);

-- ── 5. user shortcuts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_user_shortcuts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  user_id             VARCHAR(64)  NOT NULL,

  shortcut_key        VARCHAR(40)  NOT NULL,
  command_key         VARCHAR(150),
  module_code         VARCHAR(100),
  route_key           VARCHAR(300),

  label               VARCHAR(200),
  payload             JSONB        NOT NULL DEFAULT '{}'::jsonb,

  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id, shortcut_key)
);
CREATE INDEX IF NOT EXISTS ix_ui_shortcuts_user
  ON dos.ui_user_shortcuts (tenant_id, user_id);

-- ── 6. announcements ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_announcements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  product_code        VARCHAR(100),
  module_code         VARCHAR(100),

  announcement_key    VARCHAR(150) NOT NULL,
  severity            VARCHAR(20)  NOT NULL DEFAULT 'info',
  audience            VARCHAR(40)  NOT NULL DEFAULT 'tenant',

  title_key           VARCHAR(200),
  body_key            VARCHAR(200),
  cta_label_key       VARCHAR(150),
  cta_url             TEXT,

  starts_at           TIMESTAMPTZ,
  ends_at             TIMESTAMPTZ,
  is_dismissible      BOOLEAN      NOT NULL DEFAULT TRUE,
  required_permission VARCHAR(150),
  required_role_codes TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],

  payload             JSONB        NOT NULL DEFAULT '{}'::jsonb,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ui_announcements_scope
  ON dos.ui_announcements (announcement_key, COALESCE(tenant_id, '*'));
CREATE INDEX IF NOT EXISTS ix_ui_announcements_active
  ON dos.ui_announcements (is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS ix_ui_announcements_module
  ON dos.ui_announcements (module_code);
CREATE INDEX IF NOT EXISTS ix_ui_announcements_product
  ON dos.ui_announcements (product_code);

-- ── 7. user announcements read ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_user_announcements_read (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  user_id             VARCHAR(64)  NOT NULL,
  announcement_id     UUID         NOT NULL REFERENCES dos.ui_announcements(id) ON DELETE CASCADE,

  status              VARCHAR(20)  NOT NULL DEFAULT 'read',
  read_at             TIMESTAMPTZ,
  dismissed_at        TIMESTAMPTZ,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id, announcement_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_user_announce_read_user
  ON dos.ui_user_announcements_read (tenant_id, user_id);

COMMIT;
