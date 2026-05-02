-- dos:draft
-- =====================================================================
-- UI-OS — §6 Grids — saved views (grid-scoped) + export jobs  (20260502_0104)
--
-- Tables created (2) — DKNF compliant via ENUMs from 20260502_0099:
--   1. dos.ui_data_grid_saved_views — grid-scoped saved views (per-user or shared)
--   2. dos.ui_data_grid_exports     — async export job records
--
-- Normalization decisions:
--   - DKNF: format / status promoted to ENUMs
--          (dos.ui_grid_export_format_t, dos.ui_job_status_t).
--   - 1NF: view_config and filters JSONB are document-shaped (filter trees,
--          sort spec, grouping spec) — acceptable per normalization-framework.md.
--
-- Note: a generic dos.ui_saved_views (already migrated by 20260501_0303) exists
-- for non-grid surfaces. This grid-scoped table is intentionally distinct
-- because the view_config shape is grid-specific.
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ---------------------------------------------------------------------
-- 1. dos.ui_data_grid_saved_views
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.ui_data_grid_saved_views (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    VARCHAR(64) NOT NULL,
  grid_key     VARCHAR(150) NOT NULL,
  view_key     VARCHAR(150) NOT NULL,
  user_id      VARCHAR(64),
  name_key     VARCHAR(150),
  view_config  JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_shared    BOOLEAN NOT NULL DEFAULT FALSE,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   VARCHAR(64),
  updated_by   VARCHAR(64),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_data_grid_saved_views_uk
    UNIQUE NULLS NOT DISTINCT (tenant_id, grid_key, view_key, user_id)
);

CREATE INDEX IF NOT EXISTS ix_ui_data_grid_saved_views_tenant_grid
  ON dos.ui_data_grid_saved_views (tenant_id, grid_key);

CREATE INDEX IF NOT EXISTS ix_ui_data_grid_saved_views_user
  ON dos.ui_data_grid_saved_views (tenant_id, user_id) WHERE user_id IS NOT NULL;

COMMENT ON TABLE  dos.ui_data_grid_saved_views IS
  'Grid-scoped saved views. user_id NULL => shared/admin view; non-NULL => user-private view.';

-- ---------------------------------------------------------------------
-- 2. dos.ui_data_grid_exports
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dos.ui_data_grid_exports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64) NOT NULL,
  user_id         VARCHAR(64) NOT NULL,
  grid_key        VARCHAR(150) NOT NULL,
  view_id         UUID,
  format          dos.ui_grid_export_format_t NOT NULL,
  filters         JSONB NOT NULL DEFAULT '{}'::jsonb,
  row_count       INTEGER,
  status          dos.ui_job_status_t NOT NULL DEFAULT 'queued',
  download_url    TEXT,
  error           JSONB,
  expires_at      TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ui_data_grid_exports_view_fk
    FOREIGN KEY (view_id) REFERENCES dos.ui_data_grid_saved_views(id) ON DELETE SET NULL,
  CONSTRAINT ui_data_grid_exports_lifecycle_chk
    CHECK (
      (status IN ('queued') AND started_at IS NULL AND completed_at IS NULL) OR
      (status IN ('running') AND started_at IS NOT NULL AND completed_at IS NULL) OR
      (status IN ('succeeded','failed','expired','cancelled') AND completed_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS ix_ui_data_grid_exports_tenant_user
  ON dos.ui_data_grid_exports (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS ix_ui_data_grid_exports_status
  ON dos.ui_data_grid_exports (tenant_id, status) WHERE status IN ('queued','running');

COMMENT ON TABLE  dos.ui_data_grid_exports IS
  'Async export jobs. download_url is short-lived signed URL; never store raw export bytes.';

COMMIT;
