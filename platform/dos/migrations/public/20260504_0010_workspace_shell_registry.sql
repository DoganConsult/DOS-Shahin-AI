-- Phase WS-1 — Workspace Shell registry seed + binding table.
-- Owner: ui-os-service.
--
-- Registers the 26 workspace-shell component_keys (shell.*, workspace.*, page.*)
-- in dos.dynamic_ui_component_registry and creates the per-tenant binding table
-- that lets each tenant enable/disable, position, and parameterise each
-- workspace-shell surface without code changes.
--
-- Carbon-only: every row carries vendor='ibm-carbon' so the
-- trg_carbon_only_runtime trigger accepts it. carbon_key points at the
-- primary IBM Carbon primitive each wrapper composes.
--
-- Forward-only and idempotent (ON CONFLICT DO UPDATE / IF NOT EXISTS).
--
-- Twenty-six workspace-shell component_keys (mirrors selectors in
-- platform/ui-system/dos-ui-system/src/shell/):
--   Group 1: Shell Layout Framework (4)
--     1. shell.app                 → <dos-app-shell>
--     2. shell.desktop             → <dos-desktop-shell>
--     3. shell.mobile              → <dos-mobile-shell>
--     4. shell.desktop-sidebar     → <dos-desktop-sidebar>
--   Group 2: Header & Navigation (7)
--     5. workspace.header          → <dos-workspace-header>
--     6. workspace.sidebar         → <dos-workspace-sidebar>
--     7. workspace.mobile-nav      → <dos-mobile-bottom-nav>
--     8. shell.mobile-drawer       → <dos-mobile-drawer>
--     9. shell.workspace-nav       → <dos-workspace-nav>
--    10. shell.nav-section         → <dos-nav-section>
--    11. shell.nav-item            → <dos-nav-item>
--   Group 3: Global Action Surfaces (5)
--    12. workspace.command-search   → <dos-command-search>
--    13. workspace.inbox-center     → <dos-inbox-center>
--    14. workspace.quick-create    → <dos-quick-create>
--    15. workspace.context-panel   → <dos-context-panel>
--    16. shell.account-menu        → <dos-account-menu>
--   Group 4: Work Activity & Status (3)
--    17. workspace.status-bar       → <dos-workspace-status-bar>
--    18. workspace.action-queue     → <dos-action-queue>
--    19. workspace.agent-strip      → <dos-agent-activity-strip>
--   Group 5: Alerts & Singletons (2)
--    20. shell.banner-strip        → <dos-shell-banner-strip>
--    21. shell.toast-outlet        → <dos-toast-outlet>
--   Group 6: Page Content Infrastructure (5)
--    22. page.layout               → <dos-page-layout>
--    23. page.masthead             → <dos-page-masthead>
--    24. page.header               → <dos-page-header>
--    25. page.tabs                 → <dos-tabs>
--    26. page.widget-frame         → <dos-widget-frame>

BEGIN;

-- ─── 1. Register the 26 workspace-shell component_keys ─────────────────────
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
  -- Group 2: Header & Navigation (7)
  ('workspace.header',          '/shell/workspace-header.bundle.js',          1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-workspace-header','family','workspace-shell','position','top','responsive',true,'rtl',true,'permission_aware',true,'carbon_primitive','Header')),
  ('workspace.sidebar',         '/shell/workspace-sidebar.bundle.js',         1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-workspace-sidebar','family','workspace-shell','position','left','responsive',true,'rtl',true,'permission_aware',true,'collapsible',true,'carbon_primitive','SideNav')),
  ('workspace.mobile-nav',      '/shell/mobile-bottom-nav.bundle.js',         1, 'ibm-carbon', 'approved', 'tiles',
     jsonb_build_object('selector','dos-mobile-bottom-nav','family','workspace-shell','position','bottom','breakpoints',jsonb_build_array('390','430'),'max_items',5)),
  ('shell.mobile-drawer',       '/shell/mobile-drawer.bundle.js',              1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-mobile-drawer','family','workspace-shell','position','left-overlay','responsive',true,'rtl',true)),
  ('shell.workspace-nav',       '/shell/workspace-nav.bundle.js',              1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-workspace-nav','family','workspace-shell','position','sidebar-content')),
  ('shell.nav-section',         '/shell/nav-section.bundle.js',                1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-nav-section','family','workspace-shell','position','sidebar-group','collapsible',true)),
  ('shell.nav-item',            '/shell/nav-item.bundle.js',                   1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-nav-item','family','workspace-shell','position','sidebar-leaf')),
  -- Group 3: Global Action Surfaces (5)
  ('workspace.command-search',  '/shell/command-search.bundle.js',            1, 'ibm-carbon', 'approved', 'search',
     jsonb_build_object('selector','dos-command-search','family','workspace-shell','launch','cmd-k','mobile_mode','full-screen-modal')),
  ('workspace.inbox-center',    '/shell/inbox-center.bundle.js',              1, 'ibm-carbon', 'approved', 'modal',
     jsonb_build_object('selector','dos-inbox-center','family','workspace-shell','mobile_mode','drawer','sources',jsonb_build_array('dos.inbox_items','dos.notifications'))),
  ('workspace.quick-create',    '/shell/quick-create.bundle.js',              1, 'ibm-carbon', 'approved', 'button',
     jsonb_build_object('selector','dos-quick-create','family','workspace-shell','variant','fab','mobile_mode','sticky-bottom','permission_aware',true)),
  ('workspace.context-panel',   '/shell/context-panel.bundle.js',             1, 'ibm-carbon', 'approved', 'accordion',
     jsonb_build_object('selector','dos-context-panel','family','workspace-shell','position','right','mobile_mode','full-screen-sheet','tabs',jsonb_build_array('record','help','audit','ai-insights'))),
  ('shell.account-menu',        '/shell/account-menu.bundle.js',               1, 'ibm-carbon', 'approved', 'overflow-menu',
     jsonb_build_object('selector','dos-account-menu','family','workspace-shell','position','avatar')),
  -- Group 4: Work Activity & Status (3)
  ('workspace.status-bar',      '/shell/workspace-status-bar.bundle.js',      1, 'ibm-carbon', 'approved', 'tag',
     jsonb_build_object('selector','dos-workspace-status-bar','family','workspace-shell','signals',jsonb_build_array('system-health','tenant-status','sync-state'))),
  ('workspace.action-queue',    '/shell/workspace-action-queue.bundle.js',    1, 'ibm-carbon', 'approved', 'tiles',
     jsonb_build_object('selector','dos-action-queue','family','workspace-shell','variant','shell','mobile_mode','card-list','source','dos.work_items')),
  ('workspace.agent-strip',     '/shell/agent-activity-strip.bundle.js',      1, 'ibm-carbon', 'approved', 'tiles',
     jsonb_build_object('selector','dos-agent-activity-strip','family','workspace-shell','source','dos.agent_runs','live_updates',true)),
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

-- ─── 2. Per-tenant binding table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.workspace_shell_binding (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  component_key   TEXT NOT NULL,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  position        INTEGER NOT NULL DEFAULT 0,
  perms_required  TEXT[] NOT NULL DEFAULT '{}',
  props           JSONB  NOT NULL DEFAULT '{}'::jsonb,
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, component_key),
  CONSTRAINT chk_workspace_component_key CHECK (component_key IN
    ('shell.app','shell.desktop','shell.mobile','shell.desktop-sidebar',
     'workspace.header','workspace.sidebar','workspace.mobile-nav',
     'shell.mobile-drawer','shell.workspace-nav','shell.nav-section','shell.nav-item',
     'workspace.command-search','workspace.inbox-center','workspace.quick-create',
     'workspace.context-panel','shell.account-menu',
     'workspace.status-bar','workspace.action-queue','workspace.agent-strip',
     'shell.banner-strip','shell.toast-outlet',
     'page.layout','page.masthead','page.header','page.tabs','page.widget-frame')
);
CREATE INDEX IF NOT EXISTS ix_workspace_shell_binding_tenant
  ON dos.workspace_shell_binding(tenant_id);

-- Bump version on every UPDATE.
CREATE OR REPLACE FUNCTION dos.bump_workspace_shell_binding_version() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := COALESCE(OLD.version, 0) + 1;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bump_workspace_shell_binding_version ON dos.workspace_shell_binding;
CREATE TRIGGER trg_bump_workspace_shell_binding_version
  BEFORE UPDATE ON dos.workspace_shell_binding
  FOR EACH ROW EXECUTE FUNCTION dos.bump_workspace_shell_binding_version();

-- ─── 3. Default tenant binding (every tenant gets all 26 enabled) ──────────
-- Backfill for currently-known tenants. New tenants pick this up via the
-- tenant-provisioning service (TODO: add to provisioning seed).
INSERT INTO dos.workspace_shell_binding (tenant_id, component_key, position, perms_required, props)
SELECT t.tenant_id, ck.component_key, ck.pos, ck.perms, '{}'::jsonb
  FROM dos.tenants t
 CROSS JOIN (VALUES
    -- Group 1: Shell Layout Framework (4)
    ('shell.app',                 1, ARRAY[]::text[]),
    ('shell.desktop',             2, ARRAY[]::text[]),
    ('shell.mobile',              3, ARRAY[]::text[]),
    ('shell.desktop-sidebar',     4, ARRAY[]::text[]),
    -- Group 2: Header & Navigation (7)
    ('workspace.header',          5, ARRAY[]::text[]),
    ('workspace.sidebar',         6, ARRAY[]::text[]),
    ('workspace.mobile-nav',      7, ARRAY[]::text[]),
    ('shell.mobile-drawer',       8, ARRAY[]::text[]),
    ('shell.workspace-nav',       9, ARRAY[]::text[]),
    ('shell.nav-section',        10, ARRAY[]::text[]),
    ('shell.nav-item',           11, ARRAY[]::text[]),
    -- Group 3: Global Action Surfaces (5)
    ('workspace.command-search',  12, ARRAY['search.use']),
    ('workspace.inbox-center',    13, ARRAY['inbox.read']),
    ('workspace.quick-create',    14, ARRAY['records.create']),
    ('workspace.context-panel',   15, ARRAY[]::text[]),
    ('shell.account-menu',        16, ARRAY[]::text[]),
    -- Group 4: Work Activity & Status (3)
    ('workspace.status-bar',      17, ARRAY[]::text[]),
    ('workspace.action-queue',    18, ARRAY['workqueue.read']),
    ('workspace.agent-strip',     19, ARRAY['agents.observe']),
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

-- ─── 4. Sanity guard ────────────────────────────────────────────────────────
DO $$
DECLARE
  reg_count INTEGER;
BEGIN
  SELECT count(*) INTO reg_count FROM dos.dynamic_ui_component_registry
   WHERE component_key LIKE 'workspace.%' OR component_key LIKE 'shell.%' OR component_key LIKE 'page.%';
  IF reg_count < 26 THEN
    RAISE EXCEPTION '[phase-ws-1] expected >=26 workspace-shell component_keys (shell.*, workspace.*, page.*), found %', reg_count;
  END IF;
END $$;

COMMIT;
