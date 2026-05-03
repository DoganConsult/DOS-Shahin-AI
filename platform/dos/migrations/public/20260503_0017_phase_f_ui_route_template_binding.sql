-- Phase F migration: 9 DB-driven UI binding tables.
-- Owner: ui-os-service.
-- Coherence with dos.dynamic_ui_routes(path_pattern) is enforced at
-- application level by `pnpm ui-registry:verify` (Phase F gate). A hard FK
-- is intentionally avoided so legacy routes can be reseeded without
-- circular-migration ordering concerns.
--
-- Forward-only DDL, idempotent (CREATE TABLE IF NOT EXISTS). No data backfill
-- here — the seed-pack importer (pnpm ui-registry:import) will populate from
-- platform/ui-system/module_complete_direct_seed_pack/*.md.

BEGIN;

-- 1. Per-route template binding
CREATE TABLE IF NOT EXISTS dos.ui_route_template_binding (
  route             TEXT PRIMARY KEY,
  archetype         TEXT NOT NULL,
  template_export   TEXT NOT NULL,
  props             JSONB NOT NULL DEFAULT '{}'::jsonb,
  version           INTEGER NOT NULL DEFAULT 1,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_archetype CHECK (archetype IN (
    'command-home','posture-overview','intelligent-register','risk-landscape',
    'workflow-control','trend-intelligence','evidence-reports','action-queue',
    'module-settings','record-story','guided-create','ai-advisor','activation-journey'
  ))
);

-- 2. KPI tiles per route
CREATE TABLE IF NOT EXISTS dos.ui_route_kpi (
  id          BIGSERIAL PRIMARY KEY,
  route       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  label_en    TEXT NOT NULL,
  label_ar    TEXT,
  source_path TEXT,                -- JSONPath into the resolver payload
  format      TEXT,                -- e.g. 'percent', 'count', 'currency'
  ai_insight  TEXT,
  status      TEXT,                -- 'critical','warning','success','info'
  link        TEXT
);
CREATE INDEX IF NOT EXISTS ix_ui_route_kpi_route ON dos.ui_route_kpi(route);

-- 3. Table columns per route
CREATE TABLE IF NOT EXISTS dos.ui_route_column (
  id          BIGSERIAL PRIMARY KEY,
  route       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  field_key   TEXT NOT NULL,
  label_en    TEXT NOT NULL,
  label_ar    TEXT,
  type        TEXT,                -- 'text'|'tag'|'progress'|'ai-score'|'date'|'link'|'actions'
  sortable    BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS ix_ui_route_column_route ON dos.ui_route_column(route);

-- 4. Tabs per route
CREATE TABLE IF NOT EXISTS dos.ui_route_tab (
  id          BIGSERIAL PRIMARY KEY,
  route       TEXT NOT NULL,
  tab_id      TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  label_en    TEXT NOT NULL,
  label_ar    TEXT,
  permission  TEXT,
  UNIQUE(route, tab_id)
);

-- 5. Next-best-actions per route
CREATE TABLE IF NOT EXISTS dos.ui_route_nba (
  id          BIGSERIAL PRIMARY KEY,
  route       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  label_en    TEXT NOT NULL,
  label_ar    TEXT,
  description TEXT,
  ai_score    INTEGER,
  target_route TEXT,
  permission  TEXT,
  severity    TEXT
);
CREATE INDEX IF NOT EXISTS ix_ui_route_nba_route ON dos.ui_route_nba(route);

-- 6. Settings sections per settings-archetype route
CREATE TABLE IF NOT EXISTS dos.ui_route_setting_section (
  id          BIGSERIAL PRIMARY KEY,
  route       TEXT NOT NULL,
  section_id  TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  label_en    TEXT NOT NULL,
  label_ar    TEXT,
  icon        TEXT,
  UNIQUE(route, section_id)
);

-- 7. Report cards per evidence-reports archetype route
CREATE TABLE IF NOT EXISTS dos.ui_route_report_card (
  id            BIGSERIAL PRIMARY KEY,
  route         TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  report_id     TEXT NOT NULL,
  title_en      TEXT NOT NULL,
  title_ar      TEXT,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'ready',
  tag           TEXT,
  ai_generated  BOOLEAN NOT NULL DEFAULT false,
  download_url  TEXT,
  UNIQUE(route, report_id)
);

-- 8. Workqueue groups per action-queue route
CREATE TABLE IF NOT EXISTS dos.ui_route_workqueue_group (
  id          BIGSERIAL PRIMARY KEY,
  route       TEXT NOT NULL,
  group_id    TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  label_en    TEXT NOT NULL,
  label_ar    TEXT,
  urgency     TEXT,                -- 'overdue','today','week','upcoming'
  filter_expr JSONB,
  UNIQUE(route, group_id)
);

-- 9. Heatmap axes per risk-landscape route
CREATE TABLE IF NOT EXISTS dos.ui_route_heatmap_axis (
  id          BIGSERIAL PRIMARY KEY,
  route       TEXT NOT NULL,
  axis        TEXT NOT NULL CHECK (axis IN ('x','y')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  label_en    TEXT NOT NULL,
  label_ar    TEXT,
  bucket_key  TEXT,
  UNIQUE(route, axis, sort_order)
);

-- Touch-trigger: bump version on template binding update
CREATE OR REPLACE FUNCTION dos.bump_ui_route_template_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := COALESCE(OLD.version,0) + 1;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bump_ui_route_template_version ON dos.ui_route_template_binding;
CREATE TRIGGER trg_bump_ui_route_template_version
  BEFORE UPDATE ON dos.ui_route_template_binding
  FOR EACH ROW EXECUTE FUNCTION dos.bump_ui_route_template_version();

COMMIT;
