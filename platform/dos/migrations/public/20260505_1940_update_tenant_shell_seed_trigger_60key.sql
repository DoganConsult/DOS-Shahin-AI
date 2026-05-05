-- =============================================================================
-- Migration: 20260505_1940_update_tenant_shell_seed_trigger_60key.sql
-- Purpose:   Update the auto-seed trigger to use the new 60-key taxonomy.
--            When a new tenant is created, it gets all 60 workspace shell
--            surfaces automatically — but 0 modules (all unavailable).
--
-- The function reads LIVE from dos.dynamic_ui_component_registry so when
-- new workspace.* keys are added to the registry, new tenants automatically
-- get them — no trigger code change needed.
-- =============================================================================

-- Step 1: Replace function body (already owned by dos_auth after ALTER)
CREATE OR REPLACE FUNCTION dos.seed_workspace_shell_binding_for_tenant()
  RETURNS trigger
  LANGUAGE plpgsql
AS $fn$
BEGIN
  -- Seed workspace shell keys dynamically from the live registry.
  -- Position is alphabetical order within each band.
  INSERT INTO dos.workspace_shell_binding
    (tenant_id, component_key, enabled, position, perms_required, props)
  SELECT
    NEW.tenant_id,
    r.component_key,
    true,
    row_number() OVER (ORDER BY r.component_key)::int,
    '{}'::text[],
    '{}'::jsonb
  FROM dos.dynamic_ui_component_registry r
  WHERE r.component_key LIKE 'workspace.%'
    AND r.approval_status = 'approved'
  ON CONFLICT (tenant_id, component_key) DO NOTHING;

  RETURN NEW;
END
$fn$;

COMMENT ON FUNCTION dos.seed_workspace_shell_binding_for_tenant() IS
  '2026-05-05 v2 — auto-seed workspace shell bindings from the live 60-key taxonomy. Reads approved workspace.* keys from dos.dynamic_ui_component_registry. Fully dynamic — no hardcoded key list.';

-- Step 2: Verify function body is the new version
DO $$
DECLARE
  v_body text;
BEGIN
  SELECT prosrc INTO v_body
  FROM pg_proc WHERE proname = 'seed_workspace_shell_binding_for_tenant';

  IF v_body NOT LIKE '%dynamic_ui_component_registry%' THEN
    RAISE EXCEPTION 'Function body was NOT updated — still contains old hardcoded keys';
  END IF;

  RAISE NOTICE 'Function body updated — reads from dynamic_ui_component_registry';
END $$;

-- Step 3: Verify trigger is attached
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgname = 'trg_seed_workspace_shell_binding'
       AND tgrelid = 'dos.tenants'::regclass
       AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Trigger trg_seed_workspace_shell_binding is not installed on dos.tenants';
  END IF;
  RAISE NOTICE 'Trigger verified on dos.tenants';
END $$;

-- Step 4: Verify registry has 60 workspace keys
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM dos.dynamic_ui_component_registry
  WHERE component_key LIKE 'workspace.%' AND approval_status = 'approved';

  RAISE NOTICE 'Registry workspace keys: % (new tenants will get this many)', v_count;

  IF v_count < 60 THEN
    RAISE EXCEPTION 'Expected >= 60 workspace keys, got %', v_count;
  END IF;
END $$;
