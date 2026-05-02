-- =====================================================================
-- 0501 — Register IBM Carbon UI primitives in dos.dynamic_ui_component_registry.
--
-- This migration registers the individual Carbon Angular directives/components
-- (sub-components of the canonical catalog modules) as first-class entries
-- in the runtime registry.
--
-- Classification:
--   TIER 1 — Workspace Frame: ui-shell primitives rendered once at app root
--   TIER 2 — Pages / Cards / Forms / Tables: composed inside route views
--   TIER 3 — Enterprise Polish: UX refinements allowed across all zones
--
-- Each row satisfies the Layer 1 trigger (0400):
--   vendor='ibm-carbon', approval_status='approved', carbon_key FK valid.
--
-- The metadata.tier field identifies where the component may be used:
--   'workspace-frame' → app shell only (rendered once, wraps all routes)
--   'page-content'    → inside routed page views
--   'enterprise-polish'→ allowed anywhere for UX refinement
-- =====================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- TIER 1 — Workspace Frame (carbon_key = 'ui-shell')
-- These compose the persistent application chrome.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata)
VALUES
  ('UIShell',              'ibm-carbon', 'approved', 'ui-shell', '1', '{"tier":"workspace-frame","kind":"shell-root"}'),
  ('Header',              'ibm-carbon', 'approved', 'ui-shell', '1', '{"tier":"workspace-frame","kind":"shell-header"}'),
  ('HeaderName',          'ibm-carbon', 'approved', 'ui-shell', '1', '{"tier":"workspace-frame","kind":"shell-header"}'),
  ('HeaderNavigation',    'ibm-carbon', 'approved', 'ui-shell', '1', '{"tier":"workspace-frame","kind":"shell-header"}'),
  ('HeaderMenu',          'ibm-carbon', 'approved', 'ui-shell', '1', '{"tier":"workspace-frame","kind":"shell-header"}'),
  ('HeaderMenuItem',      'ibm-carbon', 'approved', 'ui-shell', '1', '{"tier":"workspace-frame","kind":"shell-header"}'),
  ('HeaderGlobalBar',     'ibm-carbon', 'approved', 'ui-shell', '1', '{"tier":"workspace-frame","kind":"shell-header"}'),
  ('HeaderGlobalAction',  'ibm-carbon', 'approved', 'ui-shell', '1', '{"tier":"workspace-frame","kind":"shell-header"}'),
  ('SideNav',             'ibm-carbon', 'approved', 'ui-shell', '1', '{"tier":"workspace-frame","kind":"shell-sidenav"}'),
  ('SideNavItems',        'ibm-carbon', 'approved', 'ui-shell', '1', '{"tier":"workspace-frame","kind":"shell-sidenav"}'),
  ('SideNavMenu',         'ibm-carbon', 'approved', 'ui-shell', '1', '{"tier":"workspace-frame","kind":"shell-sidenav"}'),
  ('SideNavMenuItem',     'ibm-carbon', 'approved', 'ui-shell', '1', '{"tier":"workspace-frame","kind":"shell-sidenav"}'),
  ('SideNavLink',         'ibm-carbon', 'approved', 'ui-shell', '1', '{"tier":"workspace-frame","kind":"shell-sidenav"}'),
  ('Content',             'ibm-carbon', 'approved', 'ui-shell', '1', '{"tier":"workspace-frame","kind":"shell-content"}')
ON CONFLICT (component_key) DO UPDATE
   SET vendor          = EXCLUDED.vendor,
       approval_status = EXCLUDED.approval_status,
       carbon_key      = EXCLUDED.carbon_key,
       metadata        = EXCLUDED.metadata;

-- ─────────────────────────────────────────────────────────────────────
-- TIER 2 — Pages / Cards / Forms / Tables
-- These are composed inside routed page views.
-- ─────────────────────────────────────────────────────────────────────

-- Layout primitives
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata)
VALUES
  ('Grid',               'ibm-carbon', 'approved', 'grid',    '1', '{"tier":"page-content","kind":"layout"}'),
  ('Column',             'ibm-carbon', 'approved', 'grid',    '1', '{"tier":"page-content","kind":"layout"}'),
  ('Layer',              'ibm-carbon', 'approved', 'layer',   '1', '{"tier":"page-content","kind":"layout"}')
ON CONFLICT (component_key) DO UPDATE
   SET vendor          = EXCLUDED.vendor,
       approval_status = EXCLUDED.approval_status,
       carbon_key      = EXCLUDED.carbon_key,
       metadata        = EXCLUDED.metadata;

-- Navigation & orientation
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata)
VALUES
  ('Breadcrumb',         'ibm-carbon', 'approved', 'breadcrumb', '1', '{"tier":"page-content","kind":"navigation"}'),
  ('Tabs',               'ibm-carbon', 'approved', 'tabs',       '1', '{"tier":"page-content","kind":"navigation"}'),
  ('Tab',                'ibm-carbon', 'approved', 'tabs',       '1', '{"tier":"page-content","kind":"navigation"}')
ON CONFLICT (component_key) DO UPDATE
   SET vendor          = EXCLUDED.vendor,
       approval_status = EXCLUDED.approval_status,
       carbon_key      = EXCLUDED.carbon_key,
       metadata        = EXCLUDED.metadata;

-- Tiles / cards
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata)
VALUES
  ('Tile',               'ibm-carbon', 'approved', 'tiles', '1', '{"tier":"page-content","kind":"card"}'),
  ('ClickableTile',      'ibm-carbon', 'approved', 'tiles', '1', '{"tier":"page-content","kind":"card"}'),
  ('ExpandableTile',     'ibm-carbon', 'approved', 'tiles', '1', '{"tier":"page-content","kind":"card"}'),
  ('Tag',                'ibm-carbon', 'approved', 'tag',   '1', '{"tier":"page-content","kind":"card"}')
ON CONFLICT (component_key) DO UPDATE
   SET vendor          = EXCLUDED.vendor,
       approval_status = EXCLUDED.approval_status,
       carbon_key      = EXCLUDED.carbon_key,
       metadata        = EXCLUDED.metadata;

-- Data table & companions
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata)
VALUES
  ('DataTable',            'ibm-carbon', 'approved', 'table', '1', '{"tier":"page-content","kind":"table"}'),
  ('TableToolbar',         'ibm-carbon', 'approved', 'table', '1', '{"tier":"page-content","kind":"table"}'),
  ('TableToolbarSearch',   'ibm-carbon', 'approved', 'table', '1', '{"tier":"page-content","kind":"table"}'),
  ('TableToolbarActions',  'ibm-carbon', 'approved', 'table', '1', '{"tier":"page-content","kind":"table"}'),
  ('TableBatchActions',    'ibm-carbon', 'approved', 'table', '1', '{"tier":"page-content","kind":"table"}'),
  ('Pagination',           'ibm-carbon', 'approved', 'pagination', '1', '{"tier":"page-content","kind":"table"}'),
  ('StructuredList',       'ibm-carbon', 'approved', 'structured-list', '1', '{"tier":"page-content","kind":"table"}')
ON CONFLICT (component_key) DO UPDATE
   SET vendor          = EXCLUDED.vendor,
       approval_status = EXCLUDED.approval_status,
       carbon_key      = EXCLUDED.carbon_key,
       metadata        = EXCLUDED.metadata;

-- Form controls
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata)
VALUES
  ('Search',             'ibm-carbon', 'approved', 'search',       '1', '{"tier":"page-content","kind":"form"}'),
  ('Dropdown',           'ibm-carbon', 'approved', 'dropdown',     '1', '{"tier":"page-content","kind":"form"}'),
  ('ComboBox',           'ibm-carbon', 'approved', 'combobox',     '1', '{"tier":"page-content","kind":"form"}'),
  ('MultiSelect',        'ibm-carbon', 'approved', 'combobox',     '1', '{"tier":"page-content","kind":"form"}'),
  ('DatePicker',         'ibm-carbon', 'approved', 'datepicker',   '1', '{"tier":"page-content","kind":"form"}'),
  ('TextInput',          'ibm-carbon', 'approved', 'input',        '1', '{"tier":"page-content","kind":"form"}'),
  ('TextArea',           'ibm-carbon', 'approved', 'input',        '1', '{"tier":"page-content","kind":"form"}'),
  ('NumberInput',        'ibm-carbon', 'approved', 'number-input', '1', '{"tier":"page-content","kind":"form"}'),
  ('Select',             'ibm-carbon', 'approved', 'select',       '1', '{"tier":"page-content","kind":"form"}'),
  ('Checkbox',           'ibm-carbon', 'approved', 'checkbox',     '1', '{"tier":"page-content","kind":"form"}'),
  ('Radio',              'ibm-carbon', 'approved', 'radio',        '1', '{"tier":"page-content","kind":"form"}'),
  ('Toggle',             'ibm-carbon', 'approved', 'toggle',       '1', '{"tier":"page-content","kind":"form"}')
ON CONFLICT (component_key) DO UPDATE
   SET vendor          = EXCLUDED.vendor,
       approval_status = EXCLUDED.approval_status,
       carbon_key      = EXCLUDED.carbon_key,
       metadata        = EXCLUDED.metadata;

-- Actions & menus
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata)
VALUES
  ('Button',             'ibm-carbon', 'approved', 'button',       '1', '{"tier":"page-content","kind":"action"}'),
  ('IconButton',         'ibm-carbon', 'approved', 'button',       '1', '{"tier":"page-content","kind":"action"}'),
  ('OverflowMenu',       'ibm-carbon', 'approved', 'context-menu', '1', '{"tier":"page-content","kind":"action"}'),
  ('OverflowMenuOption', 'ibm-carbon', 'approved', 'context-menu', '1', '{"tier":"page-content","kind":"action"}')
ON CONFLICT (component_key) DO UPDATE
   SET vendor          = EXCLUDED.vendor,
       approval_status = EXCLUDED.approval_status,
       carbon_key      = EXCLUDED.carbon_key,
       metadata        = EXCLUDED.metadata;

-- Dialogs & notifications
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata)
VALUES
  ('Modal',               'ibm-carbon', 'approved', 'modal',        '1', '{"tier":"page-content","kind":"dialog"}'),
  ('InlineNotification',  'ibm-carbon', 'approved', 'notification', '1', '{"tier":"page-content","kind":"feedback"}'),
  ('ToastNotification',   'ibm-carbon', 'approved', 'notification', '1', '{"tier":"page-content","kind":"feedback"}')
ON CONFLICT (component_key) DO UPDATE
   SET vendor          = EXCLUDED.vendor,
       approval_status = EXCLUDED.approval_status,
       carbon_key      = EXCLUDED.carbon_key,
       metadata        = EXCLUDED.metadata;

-- ─────────────────────────────────────────────────────────────────────
-- TIER 3 — Enterprise Polish
-- Allowed anywhere for UX refinement.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata)
VALUES
  ('Tooltip',             'ibm-carbon', 'approved', 'tooltip',        '1', '{"tier":"enterprise-polish","kind":"overlay"}'),
  ('Toggletip',           'ibm-carbon', 'approved', 'toggletip',      '1', '{"tier":"enterprise-polish","kind":"overlay"}'),
  ('Popover',             'ibm-carbon', 'approved', 'popover',        '1', '{"tier":"enterprise-polish","kind":"overlay"}'),
  ('ProgressBar',         'ibm-carbon', 'approved', 'progress-bar',   '1', '{"tier":"enterprise-polish","kind":"loading"}'),
  ('InlineLoading',       'ibm-carbon', 'approved', 'inline-loading', '1', '{"tier":"enterprise-polish","kind":"loading"}'),
  ('SkeletonText',        'ibm-carbon', 'approved', 'skeleton',       '1', '{"tier":"enterprise-polish","kind":"loading"}'),
  ('SkeletonPlaceholder', 'ibm-carbon', 'approved', 'skeleton',       '1', '{"tier":"enterprise-polish","kind":"loading"}'),
  ('ContextMenu',         'ibm-carbon', 'approved', 'context-menu',   '1', '{"tier":"enterprise-polish","kind":"action"}'),
  ('FileUploader',        'ibm-carbon', 'approved', 'file-uploader',  '1', '{"tier":"enterprise-polish","kind":"form"}'),
  ('Accordion',           'ibm-carbon', 'approved', 'accordion',      '1', '{"tier":"enterprise-polish","kind":"disclosure"}')
ON CONFLICT (component_key) DO UPDATE
   SET vendor          = EXCLUDED.vendor,
       approval_status = EXCLUDED.approval_status,
       carbon_key      = EXCLUDED.carbon_key,
       metadata        = EXCLUDED.metadata;

-- ─────────────────────────────────────────────────────────────────────
-- Post-flight: assert all 60 primitives registered successfully.
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE n INTEGER;
BEGIN
  SELECT COUNT(*) INTO n
    FROM dos.dynamic_ui_component_registry
   WHERE component_key IN (
     -- Tier 1 (14)
     'UIShell','Header','HeaderName','HeaderNavigation','HeaderMenu','HeaderMenuItem',
     'HeaderGlobalBar','HeaderGlobalAction',
     'SideNav','SideNavItems','SideNavMenu','SideNavMenuItem','SideNavLink','Content',
     -- Tier 2 (36)
     'Grid','Column','Layer',
     'Breadcrumb','Tabs','Tab',
     'Tile','ClickableTile','ExpandableTile','Tag',
     'DataTable','TableToolbar','TableToolbarSearch','TableToolbarActions','TableBatchActions',
     'Pagination','StructuredList',
     'Search','Dropdown','ComboBox','MultiSelect','DatePicker',
     'TextInput','TextArea','NumberInput','Select','Checkbox','Radio','Toggle',
     'Button','IconButton','OverflowMenu','OverflowMenuOption',
     'Modal','InlineNotification','ToastNotification',
     -- Tier 3 (10)
     'Tooltip','Toggletip','Popover','ProgressBar','InlineLoading',
     'SkeletonText','SkeletonPlaceholder','ContextMenu','FileUploader','Accordion'
   )
   AND vendor = 'ibm-carbon'
   AND approval_status = 'approved';

  IF n < 60 THEN
    RAISE EXCEPTION '0501: Carbon primitives registration incomplete — got %, expected 60', n;
  END IF;
END $$;

COMMIT;
