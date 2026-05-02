-- Reverts the 6NF junction explode. Restores the TEXT[] array columns
-- and copies values back from the junctions before dropping them.
BEGIN;

-- 1) Re-add legacy array columns (idempotent, only if missing)
ALTER TABLE dos.ui_dashboards               ADD COLUMN IF NOT EXISTS role_codes              TEXT[];
ALTER TABLE dos.ui_command_palette_items    ADD COLUMN IF NOT EXISTS required_role_codes     TEXT[];
ALTER TABLE dos.ui_announcements            ADD COLUMN IF NOT EXISTS required_role_codes     TEXT[];
ALTER TABLE dos.ui_quick_actions            ADD COLUMN IF NOT EXISTS required_role_codes     TEXT[];
ALTER TABLE dos.ui_context_menus            ADD COLUMN IF NOT EXISTS required_role_codes     TEXT[];
ALTER TABLE dos.ui_bulk_actions             ADD COLUMN IF NOT EXISTS required_role_codes     TEXT[];
ALTER TABLE dos.ui_layout_templates         ADD COLUMN IF NOT EXISTS required_role_codes     TEXT[];
ALTER TABLE dos.ui_page_layouts             ADD COLUMN IF NOT EXISTS required_role_codes     TEXT[];
ALTER TABLE dos.ui_page_sections            ADD COLUMN IF NOT EXISTS required_role_codes     TEXT[];
ALTER TABLE dos.ui_widget_refresh_policies  ADD COLUMN IF NOT EXISTS refresh_on_event_codes  TEXT[];
ALTER TABLE dos.ui_experiments              ADD COLUMN IF NOT EXISTS metric_keys             TEXT[];

-- 2) Repopulate arrays from junctions
UPDATE dos.ui_dashboards d SET role_codes = sub.codes
  FROM (SELECT dashboard_id, ARRAY_AGG(role_code ORDER BY role_code) AS codes
          FROM dos.ui_dashboard_roles GROUP BY dashboard_id) sub
  WHERE d.id = sub.dashboard_id;

UPDATE dos.ui_command_palette_items d SET required_role_codes = sub.codes
  FROM (SELECT item_id, ARRAY_AGG(role_code ORDER BY role_code) AS codes
          FROM dos.ui_command_palette_item_roles GROUP BY item_id) sub
  WHERE d.id = sub.item_id;

UPDATE dos.ui_announcements d SET required_role_codes = sub.codes
  FROM (SELECT announcement_id, ARRAY_AGG(role_code ORDER BY role_code) AS codes
          FROM dos.ui_announcement_roles GROUP BY announcement_id) sub
  WHERE d.id = sub.announcement_id;

UPDATE dos.ui_quick_actions d SET required_role_codes = sub.codes
  FROM (SELECT action_id, ARRAY_AGG(role_code ORDER BY role_code) AS codes
          FROM dos.ui_quick_action_roles GROUP BY action_id) sub
  WHERE d.id = sub.action_id;

UPDATE dos.ui_context_menus d SET required_role_codes = sub.codes
  FROM (SELECT menu_id, ARRAY_AGG(role_code ORDER BY role_code) AS codes
          FROM dos.ui_context_menu_roles GROUP BY menu_id) sub
  WHERE d.id = sub.menu_id;

UPDATE dos.ui_bulk_actions d SET required_role_codes = sub.codes
  FROM (SELECT action_id, ARRAY_AGG(role_code ORDER BY role_code) AS codes
          FROM dos.ui_bulk_action_roles GROUP BY action_id) sub
  WHERE d.id = sub.action_id;

UPDATE dos.ui_layout_templates d SET required_role_codes = sub.codes
  FROM (SELECT template_id, ARRAY_AGG(role_code ORDER BY role_code) AS codes
          FROM dos.ui_layout_template_roles GROUP BY template_id) sub
  WHERE d.id = sub.template_id;

UPDATE dos.ui_page_layouts d SET required_role_codes = sub.codes
  FROM (SELECT layout_id, ARRAY_AGG(role_code ORDER BY role_code) AS codes
          FROM dos.ui_page_layout_roles GROUP BY layout_id) sub
  WHERE d.id = sub.layout_id;

UPDATE dos.ui_page_sections d SET required_role_codes = sub.codes
  FROM (SELECT section_id, ARRAY_AGG(role_code ORDER BY role_code) AS codes
          FROM dos.ui_page_section_roles GROUP BY section_id) sub
  WHERE d.id = sub.section_id;

UPDATE dos.ui_widget_refresh_policies d SET refresh_on_event_codes = sub.codes
  FROM (SELECT policy_id, ARRAY_AGG(event_code ORDER BY event_code) AS codes
          FROM dos.ui_widget_refresh_policy_events GROUP BY policy_id) sub
  WHERE d.id = sub.policy_id;

UPDATE dos.ui_experiments d SET metric_keys = sub.codes
  FROM (SELECT experiment_id, ARRAY_AGG(metric_key ORDER BY metric_key) AS codes
          FROM dos.ui_experiment_metrics GROUP BY experiment_id) sub
  WHERE d.id = sub.experiment_id;

-- 3) Drop junctions
DROP TABLE IF EXISTS dos.ui_dashboard_roles;
DROP TABLE IF EXISTS dos.ui_command_palette_item_roles;
DROP TABLE IF EXISTS dos.ui_announcement_roles;
DROP TABLE IF EXISTS dos.ui_quick_action_roles;
DROP TABLE IF EXISTS dos.ui_context_menu_roles;
DROP TABLE IF EXISTS dos.ui_bulk_action_roles;
DROP TABLE IF EXISTS dos.ui_layout_template_roles;
DROP TABLE IF EXISTS dos.ui_page_layout_roles;
DROP TABLE IF EXISTS dos.ui_page_section_roles;
DROP TABLE IF EXISTS dos.ui_widget_refresh_policy_events;
DROP TABLE IF EXISTS dos.ui_experiment_metrics;

COMMIT;
