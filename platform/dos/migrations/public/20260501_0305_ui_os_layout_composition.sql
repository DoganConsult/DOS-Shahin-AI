-- =====================================================================
-- UI-OS layout & composition (20260501_0305)
--
-- Wave 2b — closes §4 of the UI-OS master checklist.
-- Adds 8 layout / composition tables. The catalog (0300) still owns
-- *what exists*; these tables own *how pages and sections are
-- assembled, versioned, and published*.
--
-- Tables created (8):
--   1. dos.ui_layout_templates         — admin-defined layout templates
--   2. dos.ui_user_layout_overrides    — per-user override on a template
--   3. dos.ui_page_layouts             — page-level layout binding
--   4. dos.ui_page_sections            — sections within a page layout
--   5. dos.ui_section_widgets          — widget instances inside a section
--   6. dos.ui_responsive_breakpoints   — desktop/tablet/mobile profiles
--   7. dos.ui_layout_versions          — versioned layout snapshots
--   8. dos.ui_layout_publish_history   — publish audit trail
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── 1. layout templates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_layout_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  product_code        VARCHAR(100),
  module_code         VARCHAR(100),

  template_key        VARCHAR(150) NOT NULL,
  name_key            VARCHAR(150) NOT NULL,
  description_key     VARCHAR(200),

  surface             VARCHAR(40)  NOT NULL DEFAULT 'page',
  layout_kind         VARCHAR(40)  NOT NULL DEFAULT 'grid',
  layout_config       JSONB        NOT NULL DEFAULT '{}'::jsonb,

  required_permission VARCHAR(150),
  required_role_codes TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],

  is_system           BOOLEAN      NOT NULL DEFAULT FALSE,
  is_default          BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ui_layout_templates_scope
  ON dos.ui_layout_templates (template_key, COALESCE(tenant_id, '*'));
CREATE INDEX IF NOT EXISTS ix_ui_layout_templates_module
  ON dos.ui_layout_templates (module_code);
CREATE INDEX IF NOT EXISTS ix_ui_layout_templates_product
  ON dos.ui_layout_templates (product_code);

-- ── 2. user layout overrides ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_user_layout_overrides (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64)  NOT NULL,
  user_id             VARCHAR(64)  NOT NULL,

  template_id         UUID         REFERENCES dos.ui_layout_templates(id) ON DELETE CASCADE,
  template_key        VARCHAR(150),
  scope_key           VARCHAR(200) NOT NULL,

  override_config     JSONB        NOT NULL DEFAULT '{}'::jsonb,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, user_id, scope_key)
);
CREATE INDEX IF NOT EXISTS ix_ui_user_layout_overrides_user
  ON dos.ui_user_layout_overrides (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS ix_ui_user_layout_overrides_template
  ON dos.ui_user_layout_overrides (template_id);

-- ── 3. page layouts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_page_layouts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  module_code         VARCHAR(100) NOT NULL,
  route_key           VARCHAR(300) NOT NULL,

  layout_key          VARCHAR(150) NOT NULL,
  template_id         UUID         REFERENCES dos.ui_layout_templates(id) ON DELETE SET NULL,
  layout_kind         VARCHAR(40)  NOT NULL DEFAULT 'grid',
  layout_config       JSONB        NOT NULL DEFAULT '{}'::jsonb,

  required_permission VARCHAR(150),
  required_role_codes TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],

  is_default          BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  current_version     INTEGER      NOT NULL DEFAULT 1,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ui_page_layouts_scope
  ON dos.ui_page_layouts (module_code, route_key, layout_key, COALESCE(tenant_id, '*'));
CREATE INDEX IF NOT EXISTS ix_ui_page_layouts_route
  ON dos.ui_page_layouts (module_code, route_key);

-- ── 4. page sections ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_page_sections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  page_layout_id      UUID         NOT NULL REFERENCES dos.ui_page_layouts(id) ON DELETE CASCADE,

  section_key         VARCHAR(150) NOT NULL,
  title_key           VARCHAR(150),
  description_key     VARCHAR(200),

  section_kind        VARCHAR(40)  NOT NULL DEFAULT 'grid',
  position            JSONB        NOT NULL DEFAULT '{}'::jsonb,
  section_config      JSONB        NOT NULL DEFAULT '{}'::jsonb,

  required_permission VARCHAR(150),
  required_role_codes TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],

  sort_order          INTEGER      NOT NULL DEFAULT 0,
  is_collapsible      BOOLEAN      NOT NULL DEFAULT FALSE,
  is_visible          BOOLEAN      NOT NULL DEFAULT TRUE,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (page_layout_id, section_key)
);
CREATE INDEX IF NOT EXISTS ix_ui_page_sections_layout
  ON dos.ui_page_sections (page_layout_id, sort_order);

-- ── 5. section widgets ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_section_widgets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  page_section_id     UUID         NOT NULL REFERENCES dos.ui_page_sections(id) ON DELETE CASCADE,

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

  UNIQUE (page_section_id, instance_key)
);
CREATE INDEX IF NOT EXISTS ix_ui_section_widgets_section
  ON dos.ui_section_widgets (page_section_id);
CREATE INDEX IF NOT EXISTS ix_ui_section_widgets_widget_key
  ON dos.ui_section_widgets (widget_key);

-- ── 6. responsive breakpoints ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_responsive_breakpoints (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),

  breakpoint_key      VARCHAR(40)  NOT NULL,
  label               VARCHAR(80),
  min_width_px        INTEGER      NOT NULL,
  max_width_px        INTEGER,

  layout_overrides    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  density             VARCHAR(20)  DEFAULT 'comfortable',

  is_default          BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ui_responsive_breakpoints_scope
  ON dos.ui_responsive_breakpoints (breakpoint_key, COALESCE(tenant_id, '*'));

-- ── 7. layout versions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_layout_versions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  page_layout_id      UUID         NOT NULL REFERENCES dos.ui_page_layouts(id) ON DELETE CASCADE,

  version             INTEGER      NOT NULL,
  status              VARCHAR(20)  NOT NULL DEFAULT 'draft',
  snapshot            JSONB        NOT NULL DEFAULT '{}'::jsonb,

  created_by          VARCHAR(64),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  published_at        TIMESTAMPTZ,

  UNIQUE (page_layout_id, version)
);
CREATE INDEX IF NOT EXISTS ix_ui_layout_versions_status
  ON dos.ui_layout_versions (status);

-- ── 8. layout publish history ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_layout_publish_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64),
  page_layout_id      UUID         NOT NULL REFERENCES dos.ui_page_layouts(id) ON DELETE CASCADE,
  layout_version_id   UUID         REFERENCES dos.ui_layout_versions(id) ON DELETE SET NULL,

  action              VARCHAR(40)  NOT NULL,
  actor_user_id       VARCHAR(64),
  actor_role          VARCHAR(80),
  reason              TEXT,
  diff                JSONB        NOT NULL DEFAULT '{}'::jsonb,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_ui_layout_publish_layout
  ON dos.ui_layout_publish_history (page_layout_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_ui_layout_publish_version
  ON dos.ui_layout_publish_history (layout_version_id);

COMMIT;
