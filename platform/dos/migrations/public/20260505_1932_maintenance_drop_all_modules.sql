-- ============================================================================
-- Migration: 20260505_1932_maintenance_drop_all_modules.sql
-- Maintenance window — suspend ALL product modules.
-- ============================================================================

BEGIN;

-- 1. dynamic_ui_modules → unavailable
UPDATE dos.dynamic_ui_modules
SET registry_status = 'unavailable',
    updated_at = now()
WHERE registry_status = 'active';

-- 2. module_registry → unavailable (no updated_at column)
UPDATE dos.module_registry
SET status = 'unavailable'
WHERE status = 'active';

-- 3. tenant_module_entitlements → suspended
UPDATE dos.tenant_module_entitlements
SET entitlement_status = 'suspended',
    updated_at = now()
WHERE entitlement_status = 'active';

-- 4. module_operating_state → disabled (skip if column/values don't match)
DO $$ BEGIN
  UPDATE dos.module_operating_state SET state = 'disabled' WHERE state NOT IN ('disabled', 'unavailable');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'module_operating_state update skipped: %', SQLERRM;
END $$;

-- 5. Verify
DO $$
DECLARE
  v1 int; v2 int; v3 int;
BEGIN
  SELECT count(*) INTO v1 FROM dos.dynamic_ui_modules WHERE registry_status = 'active';
  SELECT count(*) INTO v2 FROM dos.tenant_module_entitlements WHERE entitlement_status = 'active';
  SELECT count(*) INTO v3 FROM dos.module_registry WHERE status = 'active';
  RAISE NOTICE 'MAINTENANCE DROP DONE — modules_active=%, entitlements_active=%, registry_active=%', v1, v2, v3;
  IF v1 > 0 OR v2 > 0 OR v3 > 0 THEN
    RAISE EXCEPTION 'FAILED: some rows still active';
  END IF;
END $$;

COMMIT;
