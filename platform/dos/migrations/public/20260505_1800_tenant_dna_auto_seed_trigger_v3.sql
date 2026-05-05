-- =============================================================================
-- Migration: 20260505_1800_tenant_dna_auto_seed_trigger_v3
-- Purpose:   Wave-1 republish closure — make tenant-DNA auto-seed fully
--            registry-driven so it stays in lock-step with whatever
--            workspace-shell key set is published into
--            dos.dynamic_ui_component_registry (currently 60 keys, 6 bands).
--
--            The previous bridge migration 20260505_1500 hardcoded the
--            old 30-key VALUES list (shell.app, workspace.header, page.*,
--            tile variants…). After v3.0.0 publish, none of those 30 keys
--            exist in the registry anymore, so the trigger silently
--            inserts ZERO rows for every newly-registered tenant.
--            That breaks the tenant-completeness CI guard for the next
--            tenant onboarded after v3.0.0.
--
--            This migration replaces the trigger function body with a
--            registry-driven INSERT … SELECT that:
--              - reads every approved workspace.* key from
--                dos.dynamic_ui_component_registry,
--              - assigns position from metadata->>'position' (falls back
--                to row_number ordering by component_key),
--              - leaves perms_required = '{}'::text[] (per-tenant overrides
--                live in dos.workspace_shell_binding.perms_required),
--              - is idempotent on UNIQUE(tenant_id, component_key).
--
-- Scope:     Replaces dos.seed_workspace_shell_binding_for_tenant() body.
--            Trigger trg_seed_workspace_shell_binding stays attached.
--            Existing tenants are unaffected (already backfilled to 60 rows).
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION dos.seed_workspace_shell_binding_for_tenant()
  RETURNS trigger
  LANGUAGE plpgsql
AS $fn$
BEGIN
  INSERT INTO dos.workspace_shell_binding
    (tenant_id, component_key, position, perms_required, props)
  SELECT
    NEW.tenant_id,
    r.component_key,
    COALESCE(NULLIF(r.metadata->>'position','')::int,
             row_number() OVER (ORDER BY r.component_key)::int),
    ARRAY[]::text[],
    '{}'::jsonb
    FROM dos.dynamic_ui_component_registry r
   WHERE r.component_key LIKE 'workspace.%'
     AND r.approval_status = 'approved'
   ON CONFLICT (tenant_id, component_key) DO NOTHING;
  RETURN NEW;
END
$fn$;

COMMENT ON FUNCTION dos.seed_workspace_shell_binding_for_tenant() IS
  '2026-05-05 v3 — registry-driven auto-seed for newly-inserted dos.tenants rows. Reads every approved workspace.* component_key from dos.dynamic_ui_component_registry; position lifted from metadata.position with row_number fallback. Idempotent on UNIQUE(tenant_id, component_key).';

-- Self-assertion: trigger still attached.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'trg_seed_workspace_shell_binding'
       AND tgrelid = 'dos.tenants'::regclass
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'trg_seed_workspace_shell_binding is not attached to dos.tenants';
  END IF;
END $$;

COMMIT;
