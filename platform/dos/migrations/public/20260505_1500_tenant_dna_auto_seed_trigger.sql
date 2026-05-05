-- =============================================================================
-- Migration: 20260505_1500_tenant_dna_auto_seed_trigger
-- Purpose:   Forward-fix the workspace-shell DNA gap identified in the
--            unified signup/provisioning plan §"Built-in tenant DNA".
--
--            Migration 20260504_0010_workspace_shell_registry.sql backfills
--            30 workspace_shell_binding rows per existing dos.tenants row
--            via INSERT ... SELECT FROM dos.tenants, but installs no trigger.
--            Every newly-registered tenant therefore receives 0 shell
--            bindings until scripts/dos-master/reconcile-tenants.mjs runs,
--            and tenant-completeness.mjs CI guard fails for the new tenant.
--
--            This migration installs an AFTER INSERT trigger on dos.tenants
--            that idempotently seeds the canonical 30-row workspace shell
--            binding for every new tenant. The seed mirrors exactly the
--            backfill pattern in 20260504_0010 §3 (component_key, position,
--            perms_required) — keep these in sync.
--
-- Scope:     Only dos.workspace_shell_binding (NOT a controlled DDL table —
--            no trg_dos_master_only attached, so this trigger does not need
--            dos.actor='dos-master'). RLS-free, tenant_id is plain text.
--
-- Idempotent: YES.
--   - CREATE OR REPLACE FUNCTION
--   - DROP TRIGGER IF EXISTS / CREATE TRIGGER
--   - INSERT ... ON CONFLICT (tenant_id, component_key) DO NOTHING
--
-- PnP discipline (Doctrine Article 11):
--   - Additive only. No row deletions, no constraint changes.
--   - Existing tenants are unaffected (the prior backfill already ran);
--     this trigger only fires on FUTURE inserts.
--   - Re-running this file replaces the function/trigger atomically.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION dos.seed_workspace_shell_binding_for_tenant()
  RETURNS trigger
  LANGUAGE plpgsql
AS $fn$
BEGIN
  INSERT INTO dos.workspace_shell_binding
    (tenant_id, component_key, position, perms_required, props)
  SELECT NEW.tenant_id, ck.component_key, ck.pos, ck.perms, '{}'::jsonb
    FROM (VALUES
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
      ('workspace.command-search', 12, ARRAY['workspace.search.use']),
      ('workspace.inbox-center',   13, ARRAY['workspace.inbox.read']),
      ('workspace.quick-create',   14, ARRAY['workspace.records.create']),
      ('workspace.context-panel',  15, ARRAY[]::text[]),
      ('shell.account-menu',       16, ARRAY[]::text[]),
      -- Group 4: Work Activity & Status (3)
      ('workspace.status-bar',     17, ARRAY[]::text[]),
      ('workspace.action-queue',   18, ARRAY['workspace.workqueue.read']),
      ('workspace.agent-strip',    19, ARRAY['workspace.agents.observe']),
      -- Group 5: Alerts & Singletons (2)
      ('shell.banner-strip',       20, ARRAY[]::text[]),
      ('shell.toast-outlet',       21, ARRAY[]::text[]),
      -- Group 6: Page Content Infrastructure (5)
      ('page.layout',              22, ARRAY[]::text[]),
      ('page.masthead',            23, ARRAY[]::text[]),
      ('page.header',              24, ARRAY[]::text[]),
      ('page.tabs',                25, ARRAY[]::text[]),
      ('page.widget-frame',        26, ARRAY[]::text[]),
      -- Group 7: Tile Variants (4) — selectable/clickable/expandable/ai
      ('workspace.selectable-tile',27, ARRAY[]::text[]),
      ('workspace.clickable-tile', 28, ARRAY[]::text[]),
      ('workspace.expandable-tile',29, ARRAY[]::text[]),
      ('workspace.ai-tile',        30, ARRAY[]::text[])
   ) AS ck(component_key, pos, perms)
   WHERE EXISTS (
     SELECT 1 FROM dos.dynamic_ui_component_registry r
      WHERE r.component_key = ck.component_key
   )
   ON CONFLICT (tenant_id, component_key) DO NOTHING;
  RETURN NEW;
END
$fn$;

COMMENT ON FUNCTION dos.seed_workspace_shell_binding_for_tenant() IS
  '2026-05-05 Bridge — auto-seed the canonical 30 workspace shell bindings for every newly-inserted dos.tenants row. Mirrors 20260504_0010 §3 backfill. Idempotent on UNIQUE(tenant_id, component_key). Skips component_keys not present in dos.dynamic_ui_component_registry so the seed adapts to the live registry surface.';

DROP TRIGGER IF EXISTS trg_seed_workspace_shell_binding ON dos.tenants;
CREATE TRIGGER trg_seed_workspace_shell_binding
  AFTER INSERT ON dos.tenants
  FOR EACH ROW EXECUTE FUNCTION dos.seed_workspace_shell_binding_for_tenant();

-- Self-assertion: trigger exists and is enabled.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'trg_seed_workspace_shell_binding'
       AND tgrelid = 'dos.tenants'::regclass
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'trg_seed_workspace_shell_binding was not installed';
  END IF;
END $$;

COMMIT;
