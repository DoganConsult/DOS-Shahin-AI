-- dos:draft
-- =====================================================================
-- UI-OS — §5 Widgets — widget instances + per-instance permissions  (20260502_0100)
--
-- Tables created (3) — normalized to 4NF:
--   1. dos.ui_widget_instances              — instances of catalog widgets
--   2. dos.ui_widget_instance_permissions   — per-instance permission overrides
--   3. dos.ui_widget_instance_role_grants   — first-class role gating (1NF child)
--
-- Normalization decisions:
--   - 1NF: removed `role_codes TEXT[]` from ui_widget_instances; promoted to
--          child table ui_widget_instance_role_grants (roles are first-class
--          entities tracked in public.roles, so storing them as a TEXT[] is a
--          1NF violation per normalization-framework.md §1NF).
--   - DKNF: `effect` uses dos.ui_perm_effect_t (created in 20260502_0099),
--          replacing CHECK (effect IN ('allow','deny')).
--   - 3NF: no <x>_id + <x>_name pairs; only FK references.
--   - 4NF: each row holds a single owning relationship; permissions and role
--          grants live in their own tables.
--
-- Parent dependencies:
--   - dos.dynamic_ui_widgets   (catalog; from 20260501_0300)
--   - dos.ui_dashboards        (from 20260501_0302)
--   - dos.ui_page_layouts      (from 20260501_0305)
--   - dos.ui_perm_effect_t     (from 20260502_0099)
--
-- Plan: docs/migration/ui-os-tables-0100-0130-plan.md
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ---------------------------------------------------------------------
-- 1. dos.ui_widget_instances
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.ui_widget_instances (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  instance_key        VARCHAR(150) NOT NULL,
  widget_catalog_id   UUID NOT NULL,
  dashboard_id        UUID,
  page_layout_id      UUID,
  product_code        VARCHAR(100),
  module_code         VARCHAR(100),
  title_key           VARCHAR(150),
  description_key     VARCHAR(200),
  position_config     JSONB NOT NULL DEFAULT '{}'::jsonb,
  size_config         JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_binding_id     UUID,
  required_permission VARCHAR(150),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          VARCHAR(64),
  updated_by          VARCHAR(64),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_widget_instances_tenant_key_uk UNIQUE (tenant_id, instance_key),
  CONSTRAINT ui_widget_instances_dashboard_fk
    FOREIGN KEY (dashboard_id) REFERENCES dos.ui_dashboards(id) ON DELETE CASCADE,
  CONSTRAINT ui_widget_instances_page_layout_fk
    FOREIGN KEY (page_layout_id) REFERENCES dos.ui_page_layouts(id) ON DELETE CASCADE,
  CONSTRAINT ui_widget_instances_widget_catalog_fk
    FOREIGN KEY (widget_catalog_id) REFERENCES dos.dynamic_ui_widgets(id) ON DELETE RESTRICT,
  CONSTRAINT ui_widget_instances_owner_chk
    CHECK (dashboard_id IS NOT NULL OR page_layout_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ix_ui_widget_instances_tenant
  ON dos.ui_widget_instances (tenant_id);

CREATE INDEX IF NOT EXISTS ix_ui_widget_instances_dashboard
  ON dos.ui_widget_instances (dashboard_id) WHERE dashboard_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ui_widget_instances_page_layout
  ON dos.ui_widget_instances (page_layout_id) WHERE page_layout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ui_widget_instances_tenant_active
  ON dos.ui_widget_instances (tenant_id) WHERE is_active = TRUE;

COMMENT ON TABLE  dos.ui_widget_instances IS
  'Per-tenant instance of a catalog widget. 1NF child tables: ui_widget_instance_permissions, ui_widget_instance_role_grants.';

-- ---------------------------------------------------------------------
-- 2. dos.ui_widget_instance_permissions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.ui_widget_instance_permissions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  widget_instance_id UUID NOT NULL,
  permission_code    VARCHAR(150) NOT NULL,
  effect             dos.ui_perm_effect_t NOT NULL,
  role_code          VARCHAR(100),
  user_id            VARCHAR(64),
  notes              TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_widget_inst_perm_inst_fk
    FOREIGN KEY (widget_instance_id) REFERENCES dos.ui_widget_instances(id) ON DELETE CASCADE,
  CONSTRAINT ui_widget_inst_perm_unique
    UNIQUE NULLS NOT DISTINCT (widget_instance_id, permission_code, role_code, user_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_widget_inst_perm_tenant
  ON dos.ui_widget_instance_permissions (tenant_id);

CREATE INDEX IF NOT EXISTS ix_ui_widget_inst_perm_instance
  ON dos.ui_widget_instance_permissions (widget_instance_id);

COMMENT ON TABLE  dos.ui_widget_instance_permissions IS
  'Per-instance permission overrides. UI gating only; backend authorization remains source of truth.';

-- ---------------------------------------------------------------------
-- 3. dos.ui_widget_instance_role_grants  (1NF child for role_codes)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.ui_widget_instance_role_grants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  widget_instance_id UUID NOT NULL,
  role_code          VARCHAR(100) NOT NULL,
  granted_by         VARCHAR(64),
  granted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_widget_inst_role_grant_inst_fk
    FOREIGN KEY (widget_instance_id) REFERENCES dos.ui_widget_instances(id) ON DELETE CASCADE,
  CONSTRAINT ui_widget_inst_role_grant_uk
    UNIQUE (widget_instance_id, role_code)
);

CREATE INDEX IF NOT EXISTS ix_ui_widget_inst_role_grants_tenant_role
  ON dos.ui_widget_instance_role_grants (tenant_id, role_code);

CREATE INDEX IF NOT EXISTS ix_ui_widget_inst_role_grants_instance
  ON dos.ui_widget_instance_role_grants (widget_instance_id);

COMMENT ON TABLE  dos.ui_widget_instance_role_grants IS
  'First-class role grants for widget instances (1NF). One row per (instance, role) — never a TEXT[] of role codes.';

COMMIT;
