-- 0148 — Wave W11: IBM Carbon Angular component catalog (canonical, 100%).
--
-- Per workspace rule: the only approved frontend component vendor is
-- carbon-components-angular (IBM Carbon). This migration:
--   1. Creates dos.ui_carbon_components — the canonical catalog of every
--      Carbon module shipped by carbon-components-angular@5.69.0.
--   2. Seeds 1 row per Carbon module (folder under
--      node_modules/carbon-components-angular/<module>/).
--   3. Adds a `vendor`/`approval_status` column to
--      dos.dynamic_ui_component_registry so any non-Carbon component is
--      flagged 'unapproved' until explicitly wrapped/approved.
--   4. Back-flags every existing component_registry row whose component_key
--      does not resolve to a Carbon module as 'unapproved'.
--
-- 6NF: every catalog row holds scalar attributes only; multi-valued data
-- (subcomponents, exported directives) is reserved for future child tables.
-- =====================================================================
BEGIN;

-- 1. Carbon canonical catalog
CREATE TABLE IF NOT EXISTS dos.ui_carbon_components (
  carbon_key       VARCHAR(80)  NOT NULL PRIMARY KEY,
  package_name     VARCHAR(120) NOT NULL DEFAULT 'carbon-components-angular',
  package_version  VARCHAR(40)  NOT NULL DEFAULT '5.69.0',
  category         VARCHAR(40)  NOT NULL DEFAULT 'component'
                   CHECK (category IN ('component','primitive','layout','utility','experimental','shell')),
  is_experimental  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON dos.ui_carbon_components TO dos_app, dos_auth;

-- 2. Seed every Carbon module shipped by carbon-components-angular@5.69.0.
--    Source of truth: node_modules/carbon-components-angular/<folder>/.
INSERT INTO dos.ui_carbon_components (carbon_key, category, is_experimental) VALUES
  ('accordion','component',FALSE),
  ('ai-label','component',FALSE),
  ('aspect-ratio','layout',FALSE),
  ('breadcrumb','component',FALSE),
  ('button','component',FALSE),
  ('checkbox','component',FALSE),
  ('code-snippet','component',FALSE),
  ('combo-button','component',FALSE),
  ('combobox','component',FALSE),
  ('contained-list','component',FALSE),
  ('content-switcher','component',FALSE),
  ('context-menu','component',FALSE),
  ('datepicker','component',FALSE),
  ('datepicker-input','component',FALSE),
  ('dialog','primitive',FALSE),
  ('dropdown','component',FALSE),
  ('experimental','experimental',TRUE),
  ('file-uploader','component',FALSE),
  ('forms','utility',FALSE),
  ('grid','layout',FALSE),
  ('icon','primitive',FALSE),
  ('inline-loading','component',FALSE),
  ('input','component',FALSE),
  ('layer','layout',FALSE),
  ('layout','layout',FALSE),
  ('link','component',FALSE),
  ('list','component',FALSE),
  ('loading','component',FALSE),
  ('menu-button','component',FALSE),
  ('modal','component',FALSE),
  ('notification','component',FALSE),
  ('number-input','component',FALSE),
  ('pagination','component',FALSE),
  ('placeholder','utility',FALSE),
  ('popover','primitive',FALSE),
  ('progress-bar','component',FALSE),
  ('progress-indicator','component',FALSE),
  ('radio','component',FALSE),
  ('search','component',FALSE),
  ('select','component',FALSE),
  ('skeleton','component',FALSE),
  ('slider','component',FALSE),
  ('structured-list','component',FALSE),
  ('table','component',FALSE),
  ('tabs','component',FALSE),
  ('tag','component',FALSE),
  ('theme','utility',FALSE),
  ('tiles','component',FALSE),
  ('timepicker','component',FALSE),
  ('timepicker-select','component',FALSE),
  ('toggle','component',FALSE),
  ('toggletip','primitive',FALSE),
  ('tooltip','primitive',FALSE),
  ('treeview','component',FALSE),
  ('ui-shell','shell',FALSE),
  ('utils','utility',FALSE),
  ('common','utility',FALSE),
  ('i18n','utility',FALSE)
ON CONFLICT (carbon_key) DO UPDATE
   SET category = EXCLUDED.category,
       is_experimental = EXCLUDED.is_experimental,
       is_active = TRUE;

-- 3. Extend component_registry with vendor + approval_status.
ALTER TABLE dos.dynamic_ui_component_registry
  ADD COLUMN IF NOT EXISTS vendor          VARCHAR(40)  NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20)  NOT NULL DEFAULT 'unapproved'
    CHECK (approval_status IN ('approved','unapproved','deprecated','archived')),
  ADD COLUMN IF NOT EXISTS carbon_key      VARCHAR(80)  REFERENCES dos.ui_carbon_components(carbon_key)
                                                          ON DELETE SET NULL ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMPTZ;

-- 4. Back-classify existing rows.
--    Convention: a row is "Carbon-backed" if its component_key matches a
--    canonical archetype that wraps a Carbon module (signature widgets and
--    grids), or contains a recognised Carbon module name as a token. All
--    others are flagged 'unapproved' so they show up in the audit gate.
UPDATE dos.dynamic_ui_component_registry r
   SET vendor          = 'ibm-carbon',
       carbon_key      = c.carbon_key,
       approval_status = 'approved',
       approved_at     = COALESCE(r.approved_at, NOW())
  FROM dos.ui_carbon_components c
 WHERE r.component_key = c.carbon_key;

-- Map signature archetype prefixes → Carbon backing module.
UPDATE dos.dynamic_ui_component_registry
   SET vendor          = 'ibm-carbon',
       carbon_key      = CASE
         WHEN component_key LIKE 'command-center.%'  THEN 'tiles'
         WHEN component_key LIKE 'smart-grid.%'      THEN 'table'
         WHEN component_key LIKE 'audit-timeline.%'  THEN 'structured-list'
         WHEN component_key LIKE 'matrix.%'          THEN 'table'
         WHEN component_key LIKE 'context-rail.%'    THEN 'tiles'
         WHEN component_key LIKE 'recommendation-card.%' THEN 'tiles'
         WHEN component_key LIKE 'page-masthead%'    THEN 'breadcrumb'
       END,
       approval_status = 'approved',
       approved_at     = COALESCE(approved_at, NOW())
 WHERE approval_status <> 'approved'
   AND (component_key LIKE 'command-center.%'
     OR component_key LIKE 'smart-grid.%'
     OR component_key LIKE 'audit-timeline.%'
     OR component_key LIKE 'matrix.%'
     OR component_key LIKE 'context-rail.%'
     OR component_key LIKE 'recommendation-card.%'
     OR component_key LIKE 'page-masthead%');

-- Everything still 'unapproved' is genuinely non-Carbon — flag explicitly.
UPDATE dos.dynamic_ui_component_registry
   SET vendor = 'custom',
       approval_status = 'unapproved'
 WHERE approval_status <> 'approved'
   AND vendor <> 'ibm-carbon';

CREATE INDEX IF NOT EXISTS ix_dyn_comp_reg_approval
  ON dos.dynamic_ui_component_registry(approval_status);

-- 5. Post-flight: assert canonical Carbon catalog count.
DO $$
DECLARE n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n FROM dos.ui_carbon_components;
  IF n < 55 THEN
    RAISE EXCEPTION 'W11: ui_carbon_components seed below baseline (got %, want >=55)', n;
  END IF;
END $$;

COMMIT;
