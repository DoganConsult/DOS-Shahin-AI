-- =====================================================================
-- 0100_down — Reverse module-registry / dynamic-ui-modules sync.
-- Removes only rows tagged with canonical_source='module_registry_sync_0100'
-- to avoid harming pre-existing rows. Reciprocal `module_registry` rows
-- inserted from the 13 ghost set are removed by display_name match
-- against the captured ghost list.
-- =====================================================================
BEGIN;

-- Reverse step 1: drop dynamic_ui_modules rows that 0100 inserted.
DELETE FROM dos.dynamic_ui_modules
 WHERE canonical_source = 'module_registry_sync_0100';

-- Reverse step 2: drop the 13 module_registry rows seeded from ghosts.
DELETE FROM dos.module_registry
 WHERE module_code IN (
   'access','dnoc','dos-platform','dsoc','foundation-admin',
   'knowledge','marketing','multi-tenant-mgmt','runtime',
   'sample_ops','sample_risk','tenant-management','ui-system'
 );

COMMIT;
