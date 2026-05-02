-- =====================================================================
-- UI-OS — final 6NF normalization pass: explode TEXT[] of first-class
-- entities into proper junction child tables. (20260502_0133)
--
-- Per platform/config-center/ops/normalization/normalization-framework.md,
-- 1NF prohibits multivalued attributes when each value is itself an
-- entity-grade reference. Persisting role_codes / event_codes / metric_keys
-- as TEXT[] precludes:
--   - per-membership audit
--   - per-membership grant time / grantor / expiry
--   - referential integrity to roles / events / metrics catalogues
--   - efficient role-based filtering at query time
--
-- This migration creates 11 child tables (one per offending column),
-- backfills from the array, then drops the array column.
--
-- Idempotent — guarded with information_schema checks before backfill /
-- drop so re-runs are safe.
--
-- Tables touched:
--   ui_dashboards.role_codes              → ui_dashboard_roles
--   ui_command_palette_items.required_role_codes → ui_command_palette_item_roles
--   ui_announcements.required_role_codes  → ui_announcement_roles
--   ui_quick_actions.required_role_codes  → ui_quick_action_roles
--   ui_context_menus.required_role_codes  → ui_context_menu_roles
--   ui_bulk_actions.required_role_codes   → ui_bulk_action_roles
--   ui_layout_templates.required_role_codes → ui_layout_template_roles
--   ui_page_layouts.required_role_codes   → ui_page_layout_roles
--   ui_page_sections.required_role_codes  → ui_page_section_roles
--   ui_widget_refresh_policies.refresh_on_event_codes → ui_widget_refresh_policy_events
--   ui_experiments.metric_keys            → ui_experiment_metrics
-- =====================================================================
BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── 1) Child table DDL (idempotent) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.ui_dashboard_roles (
  dashboard_id UUID NOT NULL REFERENCES dos.ui_dashboards(id) ON DELETE CASCADE,
  role_code    VARCHAR(80) NOT NULL,
  granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (dashboard_id, role_code)
);

CREATE TABLE IF NOT EXISTS dos.ui_command_palette_item_roles (
  item_id    UUID NOT NULL REFERENCES dos.ui_command_palette_items(id) ON DELETE CASCADE,
  role_code  VARCHAR(80) NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (item_id, role_code)
);

CREATE TABLE IF NOT EXISTS dos.ui_announcement_roles (
  announcement_id UUID NOT NULL REFERENCES dos.ui_announcements(id) ON DELETE CASCADE,
  role_code       VARCHAR(80) NOT NULL,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (announcement_id, role_code)
);

CREATE TABLE IF NOT EXISTS dos.ui_quick_action_roles (
  action_id  UUID NOT NULL REFERENCES dos.ui_quick_actions(id) ON DELETE CASCADE,
  role_code  VARCHAR(80) NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (action_id, role_code)
);

CREATE TABLE IF NOT EXISTS dos.ui_context_menu_roles (
  menu_id    UUID NOT NULL REFERENCES dos.ui_context_menus(id) ON DELETE CASCADE,
  role_code  VARCHAR(80) NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (menu_id, role_code)
);

CREATE TABLE IF NOT EXISTS dos.ui_bulk_action_roles (
  action_id  UUID NOT NULL REFERENCES dos.ui_bulk_actions(id) ON DELETE CASCADE,
  role_code  VARCHAR(80) NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (action_id, role_code)
);

CREATE TABLE IF NOT EXISTS dos.ui_layout_template_roles (
  template_id UUID NOT NULL REFERENCES dos.ui_layout_templates(id) ON DELETE CASCADE,
  role_code   VARCHAR(80) NOT NULL,
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (template_id, role_code)
);

CREATE TABLE IF NOT EXISTS dos.ui_page_layout_roles (
  layout_id  UUID NOT NULL REFERENCES dos.ui_page_layouts(id) ON DELETE CASCADE,
  role_code  VARCHAR(80) NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (layout_id, role_code)
);

CREATE TABLE IF NOT EXISTS dos.ui_page_section_roles (
  section_id UUID NOT NULL REFERENCES dos.ui_page_sections(id) ON DELETE CASCADE,
  role_code  VARCHAR(80) NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (section_id, role_code)
);

CREATE TABLE IF NOT EXISTS dos.ui_widget_refresh_policy_events (
  policy_id   UUID NOT NULL REFERENCES dos.ui_widget_refresh_policies(id) ON DELETE CASCADE,
  event_code  VARCHAR(150) NOT NULL,
  bound_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (policy_id, event_code)
);

CREATE TABLE IF NOT EXISTS dos.ui_experiment_metrics (
  experiment_id UUID NOT NULL REFERENCES dos.ui_experiments(id) ON DELETE CASCADE,
  metric_key    VARCHAR(150) NOT NULL,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  bound_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (experiment_id, metric_key)
);

-- Lookup indexes for child-side filtering
CREATE INDEX IF NOT EXISTS ix_ui_dashboard_roles_role          ON dos.ui_dashboard_roles (role_code);
CREATE INDEX IF NOT EXISTS ix_ui_cpi_roles_role                ON dos.ui_command_palette_item_roles (role_code);
CREATE INDEX IF NOT EXISTS ix_ui_announcement_roles_role       ON dos.ui_announcement_roles (role_code);
CREATE INDEX IF NOT EXISTS ix_ui_quick_action_roles_role       ON dos.ui_quick_action_roles (role_code);
CREATE INDEX IF NOT EXISTS ix_ui_context_menu_roles_role       ON dos.ui_context_menu_roles (role_code);
CREATE INDEX IF NOT EXISTS ix_ui_bulk_action_roles_role        ON dos.ui_bulk_action_roles (role_code);
CREATE INDEX IF NOT EXISTS ix_ui_layout_template_roles_role    ON dos.ui_layout_template_roles (role_code);
CREATE INDEX IF NOT EXISTS ix_ui_page_layout_roles_role        ON dos.ui_page_layout_roles (role_code);
CREATE INDEX IF NOT EXISTS ix_ui_page_section_roles_role       ON dos.ui_page_section_roles (role_code);
CREATE INDEX IF NOT EXISTS ix_ui_wrp_events_event              ON dos.ui_widget_refresh_policy_events (event_code);
CREATE INDEX IF NOT EXISTS ix_ui_experiment_metrics_metric     ON dos.ui_experiment_metrics (metric_key);

-- ── 2) Backfill + drop legacy array columns ─────────────────────────
-- Each block: (a) backfill from array if column still present;
--             (b) drop the array column.

DO $$
DECLARE has_col BOOLEAN;
BEGIN
  -- ui_dashboards.role_codes
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='dos' AND table_name='ui_dashboards' AND column_name='role_codes') INTO has_col;
  IF has_col THEN
    INSERT INTO dos.ui_dashboard_roles (dashboard_id, role_code)
    SELECT id, UNNEST(role_codes) FROM dos.ui_dashboards
    WHERE role_codes IS NOT NULL AND CARDINALITY(role_codes) > 0
    ON CONFLICT DO NOTHING;
    EXECUTE 'ALTER TABLE dos.ui_dashboards DROP COLUMN role_codes';
  END IF;

  -- ui_command_palette_items.required_role_codes
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='dos' AND table_name='ui_command_palette_items' AND column_name='required_role_codes') INTO has_col;
  IF has_col THEN
    INSERT INTO dos.ui_command_palette_item_roles (item_id, role_code)
    SELECT id, UNNEST(required_role_codes) FROM dos.ui_command_palette_items
    WHERE required_role_codes IS NOT NULL AND CARDINALITY(required_role_codes) > 0
    ON CONFLICT DO NOTHING;
    EXECUTE 'ALTER TABLE dos.ui_command_palette_items DROP COLUMN required_role_codes';
  END IF;

  -- ui_announcements.required_role_codes
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='dos' AND table_name='ui_announcements' AND column_name='required_role_codes') INTO has_col;
  IF has_col THEN
    INSERT INTO dos.ui_announcement_roles (announcement_id, role_code)
    SELECT id, UNNEST(required_role_codes) FROM dos.ui_announcements
    WHERE required_role_codes IS NOT NULL AND CARDINALITY(required_role_codes) > 0
    ON CONFLICT DO NOTHING;
    EXECUTE 'ALTER TABLE dos.ui_announcements DROP COLUMN required_role_codes';
  END IF;

  -- ui_quick_actions.required_role_codes
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='dos' AND table_name='ui_quick_actions' AND column_name='required_role_codes') INTO has_col;
  IF has_col THEN
    INSERT INTO dos.ui_quick_action_roles (action_id, role_code)
    SELECT id, UNNEST(required_role_codes) FROM dos.ui_quick_actions
    WHERE required_role_codes IS NOT NULL AND CARDINALITY(required_role_codes) > 0
    ON CONFLICT DO NOTHING;
    EXECUTE 'ALTER TABLE dos.ui_quick_actions DROP COLUMN required_role_codes';
  END IF;

  -- ui_context_menus.required_role_codes
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='dos' AND table_name='ui_context_menus' AND column_name='required_role_codes') INTO has_col;
  IF has_col THEN
    INSERT INTO dos.ui_context_menu_roles (menu_id, role_code)
    SELECT id, UNNEST(required_role_codes) FROM dos.ui_context_menus
    WHERE required_role_codes IS NOT NULL AND CARDINALITY(required_role_codes) > 0
    ON CONFLICT DO NOTHING;
    EXECUTE 'ALTER TABLE dos.ui_context_menus DROP COLUMN required_role_codes';
  END IF;

  -- ui_bulk_actions.required_role_codes
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='dos' AND table_name='ui_bulk_actions' AND column_name='required_role_codes') INTO has_col;
  IF has_col THEN
    INSERT INTO dos.ui_bulk_action_roles (action_id, role_code)
    SELECT id, UNNEST(required_role_codes) FROM dos.ui_bulk_actions
    WHERE required_role_codes IS NOT NULL AND CARDINALITY(required_role_codes) > 0
    ON CONFLICT DO NOTHING;
    EXECUTE 'ALTER TABLE dos.ui_bulk_actions DROP COLUMN required_role_codes';
  END IF;

  -- ui_layout_templates.required_role_codes
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='dos' AND table_name='ui_layout_templates' AND column_name='required_role_codes') INTO has_col;
  IF has_col THEN
    INSERT INTO dos.ui_layout_template_roles (template_id, role_code)
    SELECT id, UNNEST(required_role_codes) FROM dos.ui_layout_templates
    WHERE required_role_codes IS NOT NULL AND CARDINALITY(required_role_codes) > 0
    ON CONFLICT DO NOTHING;
    EXECUTE 'ALTER TABLE dos.ui_layout_templates DROP COLUMN required_role_codes';
  END IF;

  -- ui_page_layouts.required_role_codes
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='dos' AND table_name='ui_page_layouts' AND column_name='required_role_codes') INTO has_col;
  IF has_col THEN
    INSERT INTO dos.ui_page_layout_roles (layout_id, role_code)
    SELECT id, UNNEST(required_role_codes) FROM dos.ui_page_layouts
    WHERE required_role_codes IS NOT NULL AND CARDINALITY(required_role_codes) > 0
    ON CONFLICT DO NOTHING;
    EXECUTE 'ALTER TABLE dos.ui_page_layouts DROP COLUMN required_role_codes';
  END IF;

  -- ui_page_sections.required_role_codes
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='dos' AND table_name='ui_page_sections' AND column_name='required_role_codes') INTO has_col;
  IF has_col THEN
    INSERT INTO dos.ui_page_section_roles (section_id, role_code)
    SELECT id, UNNEST(required_role_codes) FROM dos.ui_page_sections
    WHERE required_role_codes IS NOT NULL AND CARDINALITY(required_role_codes) > 0
    ON CONFLICT DO NOTHING;
    EXECUTE 'ALTER TABLE dos.ui_page_sections DROP COLUMN required_role_codes';
  END IF;

  -- ui_widget_refresh_policies.refresh_on_event_codes
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='dos' AND table_name='ui_widget_refresh_policies' AND column_name='refresh_on_event_codes') INTO has_col;
  IF has_col THEN
    INSERT INTO dos.ui_widget_refresh_policy_events (policy_id, event_code)
    SELECT id, UNNEST(refresh_on_event_codes) FROM dos.ui_widget_refresh_policies
    WHERE refresh_on_event_codes IS NOT NULL AND CARDINALITY(refresh_on_event_codes) > 0
    ON CONFLICT DO NOTHING;
    EXECUTE 'ALTER TABLE dos.ui_widget_refresh_policies DROP COLUMN refresh_on_event_codes';
  END IF;

  -- ui_experiments.metric_keys
  SELECT EXISTS(SELECT 1 FROM information_schema.columns
    WHERE table_schema='dos' AND table_name='ui_experiments' AND column_name='metric_keys') INTO has_col;
  IF has_col THEN
    INSERT INTO dos.ui_experiment_metrics (experiment_id, metric_key)
    SELECT id, UNNEST(metric_keys) FROM dos.ui_experiments
    WHERE metric_keys IS NOT NULL AND CARDINALITY(metric_keys) > 0
    ON CONFLICT DO NOTHING;
    EXECUTE 'ALTER TABLE dos.ui_experiments DROP COLUMN metric_keys';
  END IF;
END $$;

-- ── 3) Annotations ──────────────────────────────────────────────────
COMMENT ON TABLE dos.ui_dashboard_roles               IS 'UI-OS 6NF junction — role grants on dashboards (was ui_dashboards.role_codes TEXT[]).';
COMMENT ON TABLE dos.ui_command_palette_item_roles    IS 'UI-OS 6NF junction — role grants on palette items (was ui_command_palette_items.required_role_codes TEXT[]).';
COMMENT ON TABLE dos.ui_announcement_roles            IS 'UI-OS 6NF junction — role grants on announcements (was ui_announcements.required_role_codes TEXT[]).';
COMMENT ON TABLE dos.ui_quick_action_roles            IS 'UI-OS 6NF junction — role grants on quick actions (was ui_quick_actions.required_role_codes TEXT[]).';
COMMENT ON TABLE dos.ui_context_menu_roles            IS 'UI-OS 6NF junction — role grants on context menus (was ui_context_menus.required_role_codes TEXT[]).';
COMMENT ON TABLE dos.ui_bulk_action_roles             IS 'UI-OS 6NF junction — role grants on bulk actions (was ui_bulk_actions.required_role_codes TEXT[]).';
COMMENT ON TABLE dos.ui_layout_template_roles         IS 'UI-OS 6NF junction — role grants on layout templates (was ui_layout_templates.required_role_codes TEXT[]).';
COMMENT ON TABLE dos.ui_page_layout_roles             IS 'UI-OS 6NF junction — role grants on page layouts (was ui_page_layouts.required_role_codes TEXT[]).';
COMMENT ON TABLE dos.ui_page_section_roles            IS 'UI-OS 6NF junction — role grants on page sections (was ui_page_sections.required_role_codes TEXT[]).';
COMMENT ON TABLE dos.ui_widget_refresh_policy_events  IS 'UI-OS 6NF junction — events that trigger widget refresh (was ui_widget_refresh_policies.refresh_on_event_codes TEXT[]).';
COMMENT ON TABLE dos.ui_experiment_metrics            IS 'UI-OS 6NF junction — metric keys tracked by an experiment (was ui_experiments.metric_keys TEXT[]); is_primary flag distinguishes primary metric.';

COMMIT;
