-- Phase WS-1 — Workspace Shell registry seed + binding table.
-- Owner: ui-os-service.
--
-- Registers the 10 default workspace-shell component_keys (workspace.*) in
-- dos.dynamic_ui_component_registry and creates the per-tenant binding table
-- that lets each tenant enable/disable, position, and parameterise each
-- workspace-shell surface without code changes.
--
-- Carbon-only: every row carries vendor='ibm-carbon' so the
-- trg_carbon_only_runtime trigger accepts it. carbon_key points at the
-- primary IBM Carbon primitive each wrapper composes.
--
-- Forward-only and idempotent (ON CONFLICT DO UPDATE / IF NOT EXISTS).
--
-- Ten workspace-shell component_keys (mirrors selectors in
-- platform/ui-system/dos-ui-system/src/shell/):
--   1. workspace.header           → <dos-workspace-header>
--   2. workspace.sidebar          → <dos-workspace-sidebar>
--   3. workspace.mobile-nav       → <dos-mobile-bottom-nav>
--   4. workspace.command-search   → <dos-command-search>
--   5. workspace.status-bar       → <dos-workspace-status-bar>
--   6. workspace.action-queue     → <dos-action-queue>          (shell variant)
--   7. workspace.agent-strip      → <dos-agent-activity-strip>
--   8. workspace.inbox-center     → <dos-inbox-center>
--   9. workspace.context-panel    → <dos-context-panel>
--  10. workspace.quick-create     → <dos-quick-create>

BEGIN;

-- ─── 1. Register the 10 workspace-shell component_keys ──────────────────────
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, bundle_url, schema_version, vendor, approval_status, carbon_key, metadata)
VALUES
  ('workspace.header',          '/shell/workspace-header.bundle.js',          1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-workspace-header','family','workspace-shell','position','top','responsive',true,'rtl',true,'permission_aware',true,'carbon_primitive','Header')),
  ('workspace.sidebar',         '/shell/workspace-sidebar.bundle.js',         1, 'ibm-carbon', 'approved', 'ui-shell',
     jsonb_build_object('selector','dos-workspace-sidebar','family','workspace-shell','position','left','responsive',true,'rtl',true,'permission_aware',true,'collapsible',true,'carbon_primitive','SideNav')),
  ('workspace.mobile-nav',      '/shell/mobile-bottom-nav.bundle.js',         1, 'ibm-carbon', 'approved', 'tiles',
     jsonb_build_object('selector','dos-mobile-bottom-nav','family','workspace-shell','position','bottom','breakpoints',jsonb_build_array('390','430'),'max_items',5)),
  ('workspace.command-search',  '/shell/command-search.bundle.js',            1, 'ibm-carbon', 'approved', 'search',
     jsonb_build_object('selector','dos-command-search','family','workspace-shell','launch','cmd-k','mobile_mode','full-screen-modal')),
  ('workspace.status-bar',      '/shell/workspace-status-bar.bundle.js',      1, 'ibm-carbon', 'approved', 'tag',
     jsonb_build_object('selector','dos-workspace-status-bar','family','workspace-shell','signals',jsonb_build_array('system-health','tenant-status','sync-state'))),
  ('workspace.action-queue',    '/shell/workspace-action-queue.bundle.js',    1, 'ibm-carbon', 'approved', 'tiles',
     jsonb_build_object('selector','dos-action-queue','family','workspace-shell','variant','shell','mobile_mode','card-list','source','dos.work_items')),
  ('workspace.agent-strip',     '/shell/agent-activity-strip.bundle.js',      1, 'ibm-carbon', 'approved', 'tiles',
     jsonb_build_object('selector','dos-agent-activity-strip','family','workspace-shell','source','dos.agent_runs','live_updates',true)),
  ('workspace.inbox-center',    '/shell/inbox-center.bundle.js',              1, 'ibm-carbon', 'approved', 'modal',
     jsonb_build_object('selector','dos-inbox-center','family','workspace-shell','mobile_mode','drawer','sources',jsonb_build_array('dos.inbox_items','dos.notifications'))),
  ('workspace.context-panel',   '/shell/context-panel.bundle.js',             1, 'ibm-carbon', 'approved', 'accordion',
     jsonb_build_object('selector','dos-context-panel','family','workspace-shell','position','right','mobile_mode','full-screen-sheet','tabs',jsonb_build_array('record','help','audit','ai-insights'))),
  ('workspace.quick-create',    '/shell/quick-create.bundle.js',              1, 'ibm-carbon', 'approved', 'button',
     jsonb_build_object('selector','dos-quick-create','family','workspace-shell','variant','fab','mobile_mode','sticky-bottom','permission_aware',true))
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
    ('workspace.header','workspace.sidebar','workspace.mobile-nav',
     'workspace.command-search','workspace.status-bar','workspace.action-queue',
     'workspace.agent-strip','workspace.inbox-center','workspace.context-panel',
     'workspace.quick-create'))
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

-- ─── 3. Default tenant binding (every tenant gets all 10 enabled) ───────────
-- Backfill for currently-known tenants. New tenants pick this up via the
-- tenant-provisioning service (TODO: add to provisioning seed).
INSERT INTO dos.workspace_shell_binding (tenant_id, component_key, position, perms_required, props)
SELECT t.tenant_id, ck.component_key, ck.pos, ck.perms, '{}'::jsonb
  FROM dos.tenants t
 CROSS JOIN (VALUES
    ('workspace.header',          1, ARRAY[]::text[]),
    ('workspace.sidebar',         2, ARRAY[]::text[]),
    ('workspace.mobile-nav',      3, ARRAY[]::text[]),
    ('workspace.command-search',  4, ARRAY['search.use']),
    ('workspace.status-bar',      5, ARRAY[]::text[]),
    ('workspace.action-queue',    6, ARRAY['workqueue.read']),
    ('workspace.agent-strip',     7, ARRAY['agents.observe']),
    ('workspace.inbox-center',    8, ARRAY['inbox.read']),
    ('workspace.context-panel',   9, ARRAY[]::text[]),
    ('workspace.quick-create',   10, ARRAY['records.create'])
 ) AS ck(component_key, pos, perms)
ON CONFLICT (tenant_id, component_key) DO NOTHING;

-- ─── 4. Sanity guard ────────────────────────────────────────────────────────
DO $$
DECLARE
  reg_count INTEGER;
BEGIN
  SELECT count(*) INTO reg_count FROM dos.dynamic_ui_component_registry
   WHERE component_key LIKE 'workspace.%';
  IF reg_count < 10 THEN
    RAISE EXCEPTION '[phase-ws-1] expected >=10 workspace.* component_keys, found %', reg_count;
  END IF;
END $$;

COMMIT;
