-- dos:draft
-- =====================================================================
-- UI-OS — §6 Grids — column catalog + per-role column permissions  (20260502_0103)
--
-- Tables created (2) — DKNF compliant via ENUMs from 20260502_0099:
--   1. dos.ui_data_grid_column_catalog      — declared columns per grid_key
--   2. dos.ui_data_grid_column_permissions  — per-role column visibility/edit
--
-- Normalization decisions:
--   - DKNF: data_type / capability / effect promoted to ENUMs
--          (dos.ui_grid_column_data_type_t, dos.ui_grid_column_capability_t,
--          dos.ui_perm_effect_t).
--   - 1NF: cell_renderer_key kept as VARCHAR (free-form key matching code-side
--          GRID_CELL_COMPONENT_MAP allowlist; no DB lookup table needed).
--
-- Plan: docs/migration/ui-os-tables-0100-0130-plan.md
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ---------------------------------------------------------------------
-- 1. dos.ui_data_grid_column_catalog
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.ui_data_grid_column_catalog (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  grid_key           VARCHAR(150) NOT NULL,
  column_key         VARCHAR(100) NOT NULL,
  data_type          dos.ui_grid_column_data_type_t NOT NULL,
  cell_renderer_key  VARCHAR(150),
  header_key         VARCHAR(150),
  description_key    VARCHAR(200),
  default_width_px   INTEGER,
  min_width_px       INTEGER,
  max_width_px       INTEGER,
  is_sortable        BOOLEAN NOT NULL DEFAULT TRUE,
  is_filterable      BOOLEAN NOT NULL DEFAULT TRUE,
  is_editable        BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinnable        BOOLEAN NOT NULL DEFAULT TRUE,
  is_resizable       BOOLEAN NOT NULL DEFAULT TRUE,
  display_order      INTEGER NOT NULL DEFAULT 0,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_by         VARCHAR(64),
  updated_by         VARCHAR(64),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_data_grid_column_catalog_widths_chk
    CHECK (
      (default_width_px IS NULL OR default_width_px > 0) AND
      (min_width_px IS NULL OR min_width_px > 0) AND
      (max_width_px IS NULL OR max_width_px > 0) AND
      (min_width_px IS NULL OR max_width_px IS NULL OR min_width_px <= max_width_px)
    ),
  CONSTRAINT ui_data_grid_column_catalog_uk
    UNIQUE (tenant_id, grid_key, column_key)
);

CREATE INDEX IF NOT EXISTS ix_ui_data_grid_column_catalog_tenant_grid
  ON dos.ui_data_grid_column_catalog (tenant_id, grid_key);

CREATE INDEX IF NOT EXISTS ix_ui_data_grid_column_catalog_active
  ON dos.ui_data_grid_column_catalog (tenant_id, grid_key) WHERE is_active = TRUE;

COMMENT ON TABLE  dos.ui_data_grid_column_catalog IS
  'Declared columns per grid_key. cell_renderer_key must exist in code-side GRID_CELL_COMPONENT_MAP allowlist.';

-- ---------------------------------------------------------------------
-- 2. dos.ui_data_grid_column_permissions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.ui_data_grid_column_permissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(64) NOT NULL,
  column_catalog_id   UUID NOT NULL,
  permission_code     VARCHAR(150) NOT NULL,
  effect              dos.ui_perm_effect_t NOT NULL,
  capability          dos.ui_grid_column_capability_t NOT NULL DEFAULT 'view',
  role_code           VARCHAR(100),
  user_id             VARCHAR(64),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          VARCHAR(64),
  updated_by          VARCHAR(64),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_data_grid_column_perm_col_fk
    FOREIGN KEY (column_catalog_id) REFERENCES dos.ui_data_grid_column_catalog(id) ON DELETE CASCADE,
  CONSTRAINT ui_data_grid_column_perm_unique
    UNIQUE NULLS NOT DISTINCT (column_catalog_id, permission_code, capability, role_code, user_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_data_grid_column_perm_tenant
  ON dos.ui_data_grid_column_permissions (tenant_id);

CREATE INDEX IF NOT EXISTS ix_ui_data_grid_column_perm_col
  ON dos.ui_data_grid_column_permissions (column_catalog_id);

COMMIT;
