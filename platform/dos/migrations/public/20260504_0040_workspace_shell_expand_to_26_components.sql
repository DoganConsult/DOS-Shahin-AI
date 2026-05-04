-- 20260504_0040_workspace_shell_expand_to_26_components.sql
-- Expands workspace-shell from 10 to 26 components (shell.*, workspace.*, page.*)
-- This is a follow-up to 20260504_0010_workspace_shell_registry.sql
--
-- Adds 16 new component keys:
--   Group 1: Shell Layout Framework (4) - shell.app, shell.desktop, shell.mobile, shell.desktop-sidebar
--   Group 2: Header & Navigation (4 new) - shell.mobile-drawer, shell.workspace-nav, shell.nav-section, shell.nav-item
--   Group 3: Global Action Surfaces (1 new) - shell.account-menu
--   Group 5: Alerts & Singletons (2) - shell.banner-strip, shell.toast-outlet
--   Group 6: Page Content Infrastructure (5) - page.layout, page.masthead, page.header, page.tabs, page.widget-frame
--
-- Updates the check constraint to allow all 26 component keys.

BEGIN;

-- ─── 1. Drop old constraint ─────────────────────────────────────────────────
ALTER TABLE dos.workspace_shell_binding DROP CONSTRAINT IF EXISTS chk_workspace_component_key;

-- ─── 2. Add new constraint with all 26 component keys ─────────────────────────────
ALTER TABLE dos.workspace_shell_binding
  ADD CONSTRAINT chk_workspace_component_key CHECK (component_key IN
    ('shell.app','shell.desktop','shell.mobile','shell.desktop-sidebar',
     'workspace.header','workspace.sidebar','workspace.mobile-nav',
     'shell.mobile-drawer','shell.workspace-nav','shell.nav-section','shell.nav-item',
     'workspace.command-search','workspace.inbox-center','workspace.quick-create',
     'workspace.context-panel','shell.account-menu',
     'workspace.status-bar','workspace.action-queue','workspace.agent-strip',
     'shell.banner-strip','shell.toast-outlet',
     'page.layout','page.masthead','page.header','page.tabs','page.widget-frame')
);

-- ─── 3. Insert 16 new component keys into dynamic_ui_component_registry ───────────
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, bundle_url, schema_version, vendor, approval_status, carbon_key, metadata)
VALUES
  -- Group 1: Shell Layout Framework (4)
  ('shell.app',                 '/shell/app-shell.bundle.js',                 1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-app-shell','family','workspace-shell','position','root','responsive',true,'rtl',true)),
  ('shell.desktop',             '/shell/desktop-shell.bundle.js',             1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-desktop-shell','family','workspace-shell','position','root-desktop','responsive',true,'rtl',true)),
  ('shell.mobile',              '/shell/mobile-shell.bundle.js',              1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-mobile-shell','family','workspace-shell','position','root-mobile','responsive',true,'rtl',true)),
  ('shell.desktop-sidebar',     '/shell/desktop-sidebar.bundle.js',            1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-desktop-sidebar','family','workspace-shell','position','left','collapsible',true,'rail_width','48','expanded_width','280')),
  -- Group 2: Header & Navigation (4 new)
  ('shell.mobile-drawer',       '/shell/mobile-drawer.bundle.js',              1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-mobile-drawer','family','workspace-shell','position','left-overlay','responsive',true,'rtl',true)),
  ('shell.workspace-nav',       '/shell/workspace-nav.bundle.js',              1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-workspace-nav','family','workspace-shell','position','sidebar-content')),
  ('shell.nav-section',         '/shell/nav-section.bundle.js',                1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-nav-section','family','workspace-shell','position','sidebar-group','collapsible',true)),
  ('shell.nav-item',            '/shell/nav-item.bundle.js',                   1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-nav-item','family','workspace-shell','position','sidebar-leaf')),
  -- Group 3: Global Action Surfaces (1 new)
  ('shell.account-menu',        '/shell/account-menu.bundle.js',               1, 'ibm-carbon', 'approved', 'overflow-menu',
     jsonb_build_object('selector','dos-account-menu','family','workspace-shell','position','avatar')),
  -- Group 5: Alerts & Singletons (2)
  ('shell.banner-strip',        '/shell/banner-strip.bundle.js',               1, 'ibm-carbon', 'approved', 'notification',
     jsonb_build_object('selector','dos-shell-banner-strip','family','workspace-shell','position','top-overlay')),
  ('shell.toast-outlet',        '/shell/toast-outlet.bundle.js',               1, 'ibm-carbon', 'approved', 'notification',
     jsonb_build_object('selector','dos-toast-outlet','family','workspace-shell','position','fixed-overlay')),
  -- Group 6: Page Content Infrastructure (5)
  ('page.layout',               '/shell/page-layout.bundle.js',                1, 'ibm-carbon', 'approved', 'grid',
     jsonb_build_object('selector','dos-page-layout','family','workspace-shell','zones',jsonb_build_array('masthead','tabs','main','rail','footer'))),
  ('page.masthead',             '/shell/page-masthead.bundle.js',              1, 'ibm-carbon', 'approved', 'tiles',
     jsonb_build_object('selector','dos-page-masthead','family','workspace-shell','tokens',jsonb_build_array('gradient','mesh','hairline'))),
  ('page.header',               '/shell/page-header.bundle.js',                1, 'ibm-carbon', 'approved', 'breadcrumb',
     jsonb_build_object('selector','dos-page-header','family','workspace-shell','elements',jsonb_build_array('breadcrumb','title','actions'))),
  ('page.tabs',                 '/shell/tabs.bundle.js',                       1, 'ibm-carbon', 'approved', 'tabs',
     jsonb_build_object('selector','dos-tabs','family','workspace-shell','source_table','dos.ui_route_tab','permission_gated',true)),
  ('page.widget-frame',         '/shell/widget-frame.bundle.js',               1, 'ibm-carbon', 'approved', 'tiles',
     jsonb_build_object('selector','dos-widget-frame','family','workspace-shell','variants',jsonb_build_array('default','compact','expanded','loading','error','empty')))
ON CONFLICT (component_key) DO UPDATE SET
  bundle_url      = EXCLUDED.bundle_url,
  schema_version  = EXCLUDED.schema_version,
  vendor          = EXCLUDED.vendor,
  approval_status = EXCLUDED.approval_status,
  carbon_key      = EXCLUDED.carbon_key,
  metadata        = EXCLUDED.metadata,
  approved_at     = COALESCE(dos.dynamic_ui_component_registry.approved_at, now());

-- ─── 4. Insert default tenant bindings for 16 new components ─────────────────────
INSERT INTO dos.workspace_shell_binding (tenant_id, component_key, position, perms_required, props)
SELECT t.tenant_id, ck.component_key, ck.pos, ck.perms, '{}'::jsonb
  FROM dos.tenants t
 CROSS JOIN (VALUES
    -- Group 1: Shell Layout Framework (4)
    ('shell.app',                 11, ARRAY[]::text[]),
    ('shell.desktop',             12, ARRAY[]::text[]),
    ('shell.mobile',              13, ARRAY[]::text[]),
    ('shell.desktop-sidebar',     14, ARRAY[]::text[]),
    -- Group 2: Header & Navigation (4 new)
    ('shell.mobile-drawer',       15, ARRAY[]::text[]),
    ('shell.workspace-nav',       16, ARRAY[]::text[]),
    ('shell.nav-section',         17, ARRAY[]::text[]),
    ('shell.nav-item',            18, ARRAY[]::text[]),
    -- Group 3: Global Action Surfaces (1 new)
    ('shell.account-menu',        19, ARRAY[]::text[]),
    -- Group 5: Alerts & Singletons (2)
    ('shell.banner-strip',        20, ARRAY[]::text[]),
    ('shell.toast-outlet',        21, ARRAY[]::text[]),
    -- Group 6: Page Content Infrastructure (5)
    ('page.layout',              22, ARRAY[]::text[]),
    ('page.masthead',            23, ARRAY[]::text[]),
    ('page.header',              24, ARRAY[]::text[]),
    ('page.tabs',                25, ARRAY[]::text[]),
    ('page.widget-frame',        26, ARRAY[]::text[])
 ) AS ck(component_key, pos, perms)
ON CONFLICT (tenant_id, component_key) DO NOTHING;

-- ─── 5. Sanity guard ────────────────────────────────────────────────────────
DO $$
DECLARE
  reg_count INTEGER;
BEGIN
  SELECT count(*) INTO reg_count FROM dos.dynamic_ui_component_registry
   WHERE component_key LIKE 'workspace.%' OR component_key LIKE 'shell.%' OR component_key LIKE 'page.%';
  IF reg_count < 26 THEN
    RAISE EXCEPTION '[workspace-shell-expand] expected >=26 workspace-shell component_keys (shell.*, workspace.*, page.*), found %', reg_count;
  END IF;
END $$;

COMMIT;
