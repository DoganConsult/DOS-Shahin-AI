-- =====================================================================
-- UI-OS productivity tail (20260501_0304)
--
-- Wave 2a — completes §3 of the UI-OS master checklist.
-- Adds the five productivity tables that were not in 0303:
--   1. dos.ui_saved_filters    — reusable filters independent of grid state
--   2. dos.ui_favorites        — user-favourited records / pages
--   3. dos.ui_quick_actions    — per-tenant action buttons surfaced in headers
--   4. dos.ui_context_menus    — right-click / overflow menu definitions
--   5. dos.ui_bulk_actions     — bulk-action declarations + workflow bindings
--
-- tenant_id / user_id are VARCHAR(64) for consistency with 0302/0303.
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── 1. saved filters ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_saved_filters (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  user_id             VARCHAR(64),

  filter_key          VARCHAR(150) NOT NULL,
  scope               VARCHAR(40)  NOT NULL DEFAULT 'user',
  module_code         VARCHAR(100),
  route_key           VARCHAR(300),
  entity_type         VARCHAR(80),

  name                VARCHAR(200) NOT NULL,
  description         TEXT,
  filter_config       JSONB        NOT NULL DEFAULT '{}'::jsonb,

  is_default          BOOLEAN      NOT NULL DEFAULT FALSE,
  is_shared           BOOLEAN      NOT NULL DEFAULT FALSE,
  required_permission VARCHAR(150),

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ui_saved_filters_key
  ON dos.ui_saved_filters (tenant_id, COALESCE(user_id, '*'), filter_key);
CREATE INDEX IF NOT EXISTS ix_ui_saved_filters_module
  ON dos.ui_saved_filters (tenant_id, module_code);
CREATE INDEX IF NOT EXISTS ix_ui_saved_filters_entity
  ON dos.ui_saved_filters (entity_type);

-- ── 2. favorites ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_favorites (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  user_id             VARCHAR(64)  NOT NULL,

  entity_type         VARCHAR(40)  NOT NULL,
  entity_id           VARCHAR(200) NOT NULL,
  module_code         VARCHAR(100),
  route_key           VARCHAR(300),

  label               VARCHAR(200),
  icon                VARCHAR(120),
  group_label         VARCHAR(120),
  sort_order          INTEGER      NOT NULL DEFAULT 0,
  metadata            JSONB        NOT NULL DEFAULT '{}'::jsonb,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS ix_ui_favorites_user
  ON dos.ui_favorites (tenant_id, user_id, sort_order);
CREATE INDEX IF NOT EXISTS ix_ui_favorites_module
  ON dos.ui_favorites (module_code);

-- ── 3. quick actions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_quick_actions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  product_code        VARCHAR(100),
  module_code         VARCHAR(100),

  action_key          VARCHAR(150) NOT NULL,
  label_key           VARCHAR(150) NOT NULL,
  description_key     VARCHAR(200),
  icon                VARCHAR(120),
  surface             VARCHAR(40)  NOT NULL DEFAULT 'header',
  shortcut            VARCHAR(40),

  command_type        VARCHAR(40)  NOT NULL DEFAULT 'navigate',
  command_payload     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  workflow_code       VARCHAR(150),

  required_permission VARCHAR(150),
  required_role_codes TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  visibility_rule     JSONB        NOT NULL DEFAULT '{}'::jsonb,

  sort_order          INTEGER      NOT NULL DEFAULT 0,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ui_quick_actions_scope
  ON dos.ui_quick_actions (action_key, COALESCE(tenant_id, '*'));
CREATE INDEX IF NOT EXISTS ix_ui_quick_actions_module
  ON dos.ui_quick_actions (module_code);
CREATE INDEX IF NOT EXISTS ix_ui_quick_actions_product
  ON dos.ui_quick_actions (product_code);
CREATE INDEX IF NOT EXISTS ix_ui_quick_actions_surface
  ON dos.ui_quick_actions (surface);

-- ── 4. context menus ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_context_menus (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  module_code         VARCHAR(100),
  route_key           VARCHAR(300),

  menu_key            VARCHAR(150) NOT NULL,
  entity_type         VARCHAR(80),
  trigger             VARCHAR(40)  NOT NULL DEFAULT 'right-click',

  items               JSONB        NOT NULL DEFAULT '[]'::jsonb,

  required_permission VARCHAR(150),
  required_role_codes TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],

  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ui_context_menus_scope
  ON dos.ui_context_menus (menu_key, COALESCE(tenant_id, '*'));
CREATE INDEX IF NOT EXISTS ix_ui_context_menus_module
  ON dos.ui_context_menus (module_code);
CREATE INDEX IF NOT EXISTS ix_ui_context_menus_entity
  ON dos.ui_context_menus (entity_type);

-- ── 5. bulk actions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_bulk_actions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  module_code         VARCHAR(100) NOT NULL,
  route_key           VARCHAR(300),
  entity_type         VARCHAR(80),

  action_key          VARCHAR(150) NOT NULL,
  label_key           VARCHAR(150) NOT NULL,
  description_key     VARCHAR(200),
  icon                VARCHAR(120),

  workflow_code       VARCHAR(150),
  handler_key         VARCHAR(150),
  command_payload     JSONB        NOT NULL DEFAULT '{}'::jsonb,

  required_permission VARCHAR(150),
  required_role_codes TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],

  max_selection       INTEGER,
  requires_approval   BOOLEAN      NOT NULL DEFAULT FALSE,
  evidence_required   BOOLEAN      NOT NULL DEFAULT FALSE,
  risk_level          VARCHAR(40)  NOT NULL DEFAULT 'low',

  sort_order          INTEGER      NOT NULL DEFAULT 0,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ui_bulk_actions_scope
  ON dos.ui_bulk_actions (module_code, action_key, COALESCE(tenant_id, '*'));
CREATE INDEX IF NOT EXISTS ix_ui_bulk_actions_entity
  ON dos.ui_bulk_actions (entity_type);
CREATE INDEX IF NOT EXISTS ix_ui_bulk_actions_route
  ON dos.ui_bulk_actions (route_key);

COMMIT;
