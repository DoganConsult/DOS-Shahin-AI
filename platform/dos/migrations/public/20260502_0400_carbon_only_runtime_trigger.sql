-- =====================================================================
-- 0400 — Carbon-only runtime registry trigger.
--
-- Purpose: enforce at the database level that every row in
-- `dos.dynamic_ui_component_registry` either:
--   (a) has carbon_key referencing a vendor='ibm-carbon' row in
--       dos.ui_carbon_components whose runtime_status allows runtime use, or
--   (b) is in a transitional "domain composite" state with approval_status
--       in ('approved') AND vendor='ibm-carbon' (the application widgets
--       built FROM Carbon primitives).
--
-- Insert/update of any row violating those rules raises an exception and
-- aborts the transaction. NO bypass via DB role — every writer is gated.
--
-- Companion to layers 2-7 in the runtime allowlist enforcement stack.
-- =====================================================================

BEGIN;

-- 1. Trigger function — fires BEFORE INSERT/UPDATE on the runtime registry.
CREATE OR REPLACE FUNCTION dos.fn_block_non_ibm_runtime_row()
RETURNS trigger AS $$
DECLARE
  catalog_vendor          VARCHAR(40);
  catalog_runtime_status  VARCHAR(40);
BEGIN
  -- Vendor lock — registry row must declare ibm-carbon.
  IF NEW.vendor IS DISTINCT FROM 'ibm-carbon' THEN
    RAISE EXCEPTION
      'CARBON-ONLY: dynamic_ui_component_registry row "%" rejected — vendor=% (must be ibm-carbon)',
      NEW.component_key, NEW.vendor;
  END IF;

  -- Approval lock — only approved rows render.
  IF NEW.approval_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION
      'CARBON-ONLY: dynamic_ui_component_registry row "%" rejected — approval_status=% (must be approved)',
      NEW.component_key, NEW.approval_status;
  END IF;

  -- carbon_key linkage — must point at a real catalog row whose vendor is
  -- ibm-carbon and whose runtime_status permits runtime use.
  IF NEW.carbon_key IS NULL THEN
    RAISE EXCEPTION
      'CARBON-ONLY: dynamic_ui_component_registry row "%" rejected — carbon_key is NULL (must FK into dos.ui_carbon_components)',
      NEW.component_key;
  END IF;

  SELECT vendor, runtime_status
    INTO catalog_vendor, catalog_runtime_status
    FROM dos.ui_carbon_components
   WHERE carbon_key = NEW.carbon_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'CARBON-ONLY: dynamic_ui_component_registry row "%" rejected — carbon_key % not in dos.ui_carbon_components',
      NEW.component_key, NEW.carbon_key;
  END IF;

  IF catalog_vendor <> 'ibm-carbon' THEN
    RAISE EXCEPTION
      'CARBON-ONLY: dynamic_ui_component_registry row "%" rejected — catalog row % has vendor=% (must be ibm-carbon)',
      NEW.component_key, NEW.carbon_key, catalog_vendor;
  END IF;

  IF catalog_runtime_status IN ('blocked-react-only', 'missing-upstream-angular-binding', 'catalog-only') THEN
    RAISE EXCEPTION
      'CARBON-ONLY: dynamic_ui_component_registry row "%" rejected — catalog row % runtime_status=% is not runtime-eligible',
      NEW.component_key, NEW.carbon_key, catalog_runtime_status;
  END IF;

  RETURN NEW;
END $$ LANGUAGE plpgsql;

-- 2. Bind trigger.
DROP TRIGGER IF EXISTS trg_carbon_only_runtime ON dos.dynamic_ui_component_registry;
CREATE TRIGGER trg_carbon_only_runtime
BEFORE INSERT OR UPDATE ON dos.dynamic_ui_component_registry
FOR EACH ROW EXECUTE FUNCTION dos.fn_block_non_ibm_runtime_row();

-- 3. Mirror trigger on the catalog itself — never accept a non-IBM row.
--    (vendor CHECK already handles this, but a trigger gives a uniform error
--    message and lets us extend with package_name allowlist later.)
CREATE OR REPLACE FUNCTION dos.fn_block_non_ibm_catalog_row()
RETURNS trigger AS $$
BEGIN
  IF NEW.vendor IS DISTINCT FROM 'ibm-carbon' THEN
    RAISE EXCEPTION
      'CARBON-ONLY: ui_carbon_components row "%" rejected — vendor=% (must be ibm-carbon)',
      NEW.carbon_key, NEW.vendor;
  END IF;

  IF NEW.package_name NOT LIKE '@carbon/%'
     AND NEW.package_name <> 'carbon-components-angular' THEN
    RAISE EXCEPTION
      'CARBON-ONLY: ui_carbon_components row "%" rejected — package_name % is not an IBM Carbon package',
      NEW.carbon_key, NEW.package_name;
  END IF;

  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_carbon_only_catalog ON dos.ui_carbon_components;
CREATE TRIGGER trg_carbon_only_catalog
BEFORE INSERT OR UPDATE ON dos.ui_carbon_components
FOR EACH ROW EXECUTE FUNCTION dos.fn_block_non_ibm_catalog_row();

-- 4. Smoke test — verify trigger fires (negative case must throw).
DO $$
DECLARE
  caught_runtime BOOLEAN := false;
  caught_catalog BOOLEAN := false;
BEGIN
  -- Try inserting a non-IBM row in the runtime registry.
  BEGIN
    INSERT INTO dos.dynamic_ui_component_registry (component_key, vendor, approval_status, carbon_key)
      VALUES ('__smoketest_non_ibm__', 'custom', 'approved', NULL);
  EXCEPTION WHEN OTHERS THEN
    caught_runtime := (SQLERRM LIKE 'CARBON-ONLY:%');
  END;
  IF NOT caught_runtime THEN
    RAISE EXCEPTION '0400 trigger failed to block non-IBM runtime insert';
  END IF;

  -- Try inserting a non-Carbon package in the catalog.
  BEGIN
    INSERT INTO dos.ui_carbon_components (carbon_key, package_name, source_component_name, integration_mode, runtime_status)
      VALUES ('__smoketest_bad_pkg__', 'primeng', 'Button', 'native-angular', 'active');
  EXCEPTION WHEN OTHERS THEN
    caught_catalog := (SQLERRM LIKE 'CARBON-ONLY:%');
  END;
  IF NOT caught_catalog THEN
    RAISE EXCEPTION '0400 trigger failed to block non-Carbon catalog insert';
  END IF;

  RAISE NOTICE 'CARBON-ONLY triggers ARMED: runtime=%, catalog=%', caught_runtime, caught_catalog;
END $$;

INSERT INTO dos.schema_migrations (filename, checksum, applied_by)
SELECT '20260502_0400_carbon_only_runtime_trigger.sql', 'inline-0400', 'system'
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.schema_migrations
    WHERE filename = '20260502_0400_carbon_only_runtime_trigger.sql'
 );

COMMIT;
