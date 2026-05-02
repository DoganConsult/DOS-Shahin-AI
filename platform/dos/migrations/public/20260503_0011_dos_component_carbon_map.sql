-- =====================================================================
-- 0011 — Dos* ApprovedComponentKey ↔ IBM Carbon carbon_key map.
--
-- Every UI-System ApprovedComponentKey (the 22 Dos* keys consumed by
-- module enrollment contracts) MUST resolve to a real, Angular-usable
-- IBM Carbon carbon_key in dos.ui_carbon_components.
--
-- Constraints (locked):
--   * carbon_key references dos.ui_carbon_components(carbon_key)
--     (vendor='ibm-carbon', is_active=true,
--      runtime_status IN ('active','wrapper-required')).
--   * One row per Dos* key (PRIMARY KEY).
--   * Idempotent (INSERT ... ON CONFLICT DO UPDATE).
-- =====================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS dos.ui_dos_component_carbon_map (
  dos_component_key text PRIMARY KEY,
  carbon_key        varchar NOT NULL
                    REFERENCES dos.ui_carbon_components(carbon_key)
                    ON UPDATE CASCADE ON DELETE RESTRICT,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT NOW(),
  updated_at        timestamptz NOT NULL DEFAULT NOW()
);

-- Guard: only Angular-usable Carbon keys may be referenced.
CREATE OR REPLACE FUNCTION dos.fn_dos_component_carbon_map_check()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rs text;
BEGIN
  SELECT runtime_status INTO rs
    FROM dos.ui_carbon_components
   WHERE carbon_key = NEW.carbon_key
     AND vendor = 'ibm-carbon'
     AND is_active = true;
  IF rs IS NULL THEN
    RAISE EXCEPTION 'carbon_key % is not an active ibm-carbon catalog row', NEW.carbon_key;
  END IF;
  IF rs NOT IN ('active','wrapper-required') THEN
    RAISE EXCEPTION 'carbon_key % runtime_status=% is not Angular-usable', NEW.carbon_key, rs;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dos_component_carbon_map_check
  ON dos.ui_dos_component_carbon_map;
CREATE TRIGGER trg_dos_component_carbon_map_check
  BEFORE INSERT OR UPDATE ON dos.ui_dos_component_carbon_map
  FOR EACH ROW EXECUTE FUNCTION dos.fn_dos_component_carbon_map_check();

INSERT INTO dos.ui_dos_component_carbon_map (dos_component_key, carbon_key, notes) VALUES
  ('AppShell',           'ui-shell',         'Carbon UI Shell frame'),
  ('PageHeader',         'wc.page-header',   'Carbon web-component page header'),
  ('Tabs',               'tabs',             'cds-tabs / cds-tab'),
  ('MetricCard',         'tiles',            'cds-tile composition for KPI metrics'),
  ('AdaptiveCommandBar', 'combo-button',     'Carbon combo-button + overflow menu pattern'),
  ('StatusBanner',       'notification',     'cds-inline-notification / cds-actionable-notification'),
  ('ServiceCard',        'tiles',            'cds-clickable-tile'),
  ('ChallengeCard',      'tiles',            'cds-expandable-tile'),
  ('EmptyState',         'tiles',            'cds-tile + cds-skeleton-text'),
  ('LoadingState',       'loading',          'cds-loading'),
  ('BottomSheet',        'wc.side-panel',    'Mobile bottom-sheet uses cds-side-panel'),
  ('DesktopDialog',      'modal',            'cds-modal'),
  ('SideDrawer',         'wc.side-panel',    'cds-side-panel (web-component)'),
  ('AccountMenu',        'menu-button',      'cds-menu-button + cds-menu'),
  ('AiAssistantFab',     'ai.chat-button',   'Carbon AI chat-button'),
  ('DataTable',          'table',            'cds-table / cds-table-toolbar'),
  ('GraphCanvas',        'chart.scatter',    'IBM Carbon Charts (ibm-scatter-chart) default canvas'),
  ('AIWorkbenchPanel',   'aichat.container', 'Carbon AI chat container'),
  ('NavItem',            'ui-shell',         'cds-sidenav-link / cds-sidenav-menu-item'),
  ('NavSection',         'ui-shell',         'cds-sidenav-menu'),
  ('WorkspaceNav',       'ui-shell',         'cds-sidenav root')
ON CONFLICT (dos_component_key) DO UPDATE
  SET carbon_key = EXCLUDED.carbon_key,
      notes      = EXCLUDED.notes,
      updated_at = NOW();

COMMIT;
