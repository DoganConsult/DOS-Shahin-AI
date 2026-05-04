-- Phase WS-10 — Tile Variant Workspace Shell Bindings.
-- Owner: ui-os-service.
--
-- 1. Updates the CHECK constraint on dos.workspace_shell_binding to include the 4 new tile variant keys
-- 2. Backfills default bindings for all tenants
--
-- New component keys:
--   1. workspace.selectable-tile
--   2. workspace.clickable-tile
--   3. workspace.expandable-tile
--   4. workspace.ai-tile
--
-- Forward-only and idempotent (ON CONFLICT DO UPDATE / IF NOT EXISTS).

BEGIN;

-- Drop and recreate the CHECK constraint with the new keys
ALTER TABLE dos.workspace_shell_binding
  DROP CONSTRAINT IF EXISTS chk_workspace_component_key;
ALTER TABLE dos.workspace_shell_binding
  ADD CONSTRAINT chk_workspace_component_key CHECK (component_key IN
    ('shell.app','shell.desktop','shell.mobile','shell.desktop-sidebar',
     'workspace.header','workspace.sidebar','workspace.mobile-nav',
     'shell.mobile-drawer','shell.workspace-nav','shell.nav-section','shell.nav-item',
     'workspace.command-search','workspace.inbox-center','workspace.quick-create',
     'workspace.context-panel','shell.account-menu',
     'workspace.status-bar','workspace.action-queue','workspace.agent-strip',
     'shell.banner-strip','shell.toast-outlet',
     'page.layout','page.masthead','page.header','page.tabs','page.widget-frame',
     'workspace.selectable-tile','workspace.clickable-tile','workspace.expandable-tile','workspace.ai-tile')
);

-- Backfill default tenant bindings for the 4 new tile variant keys
INSERT INTO dos.workspace_shell_binding (tenant_id, component_key, position, perms_required, props)
SELECT t.tenant_id, ck.component_key, ck.pos, ck.perms, '{}'::jsonb
  FROM dos.tenants t
 CROSS JOIN (VALUES
    ('workspace.selectable-tile', 27, ARRAY[]::text[]),
    ('workspace.clickable-tile',  28, ARRAY[]::text[]),
    ('workspace.expandable-tile', 29, ARRAY[]::text[]),
    ('workspace.ai-tile',         30, ARRAY[]::text[])
 ) AS ck(component_key, pos, perms)
ON CONFLICT (tenant_id, component_key) DO NOTHING;

COMMIT;
