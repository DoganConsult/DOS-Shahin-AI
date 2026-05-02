-- =====================================================================
-- 0159 — Production lock for promotion-ready modules + named page-experience
--        CHECK constraints on dos.dynamic_ui_routes.
--
-- Two atomic moves:
--
-- A) Add named CHECK constraints required by the §10 hard-gates static
--    probe (scripts/ci-guards/dynamic-ui-hard-gates.mjs):
--      - ck_dynamic_ui_routes_page_type
--      - ck_dynamic_ui_routes_layout
--      - ck_dynamic_ui_routes_kpi_scope
--    Mirrors VALID_PAGE_TYPES / VALID_LAYOUTS / VALID_KPI_SCOPES sets.
--
-- B) Flip registry_status='production' for the 12 modules that cleared
--    the W8/W9 verifier thresholds after Migrations 0157 + 0158:
--      access, ai-platform, config-center, dauth, dnoc, dos-platform,
--      dsoc, foundation-admin, multi-tenant-mgmt, runtime,
--      tenant-management, ui-system.
--
-- Idempotent via DO blocks + WHERE filters.
-- =====================================================================
BEGIN;

-- A) Named CHECK constraints (§10 hard-gate static probe).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'ck_dynamic_ui_routes_page_type'
  ) THEN
    ALTER TABLE dos.dynamic_ui_routes
      ADD CONSTRAINT ck_dynamic_ui_routes_page_type
      CHECK (page_type IS NULL OR page_type IN (
        'overview','list','object','workflow','analytics','audit','settings'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'ck_dynamic_ui_routes_layout'
  ) THEN
    ALTER TABLE dos.dynamic_ui_routes
      ADD CONSTRAINT ck_dynamic_ui_routes_layout
      CHECK (layout IS NULL OR layout IN (
        'dashboard','full-page','split-view','object-page','wizard','report'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'ck_dynamic_ui_routes_kpi_scope'
  ) THEN
    ALTER TABLE dos.dynamic_ui_routes
      ADD CONSTRAINT ck_dynamic_ui_routes_kpi_scope
      CHECK (kpi_scope IS NULL OR kpi_scope IN (
        'module-overview','page-local','none'
      ));
  END IF;
END $$;

-- B) Production lock — 12 ready modules.
UPDATE dos.dynamic_ui_modules
   SET registry_status = 'production',
       updated_at      = NOW()
 WHERE module_code = ANY(ARRAY[
         'access','ai-platform','config-center','dauth','dnoc',
         'dos-platform','dsoc','foundation-admin','multi-tenant-mgmt',
         'runtime','tenant-management','ui-system'])
   AND registry_status <> 'production';

-- Post-flight assertion — confirm CHECKs exist + 12 modules locked.
DO $$
DECLARE
  ck_count INT;
  prod_count INT;
BEGIN
  SELECT COUNT(*) INTO ck_count FROM pg_constraint
   WHERE conname = ANY(ARRAY[
     'ck_dynamic_ui_routes_page_type',
     'ck_dynamic_ui_routes_layout',
     'ck_dynamic_ui_routes_kpi_scope']);
  IF ck_count <> 3 THEN
    RAISE EXCEPTION '0159: expected 3 named CHECK constraints, found %', ck_count;
  END IF;

  SELECT COUNT(*) INTO prod_count FROM dos.dynamic_ui_modules
   WHERE registry_status = 'production'
     AND module_code = ANY(ARRAY[
       'access','ai-platform','config-center','dauth','dnoc',
       'dos-platform','dsoc','foundation-admin','multi-tenant-mgmt',
       'runtime','tenant-management','ui-system']);
  IF prod_count <> 12 THEN
    RAISE EXCEPTION '0159: expected 12 production-locked modules, found %', prod_count;
  END IF;

  RAISE NOTICE '0159: 3 page-experience CHECKs installed, 12 modules locked production';
END $$;

INSERT INTO dos.schema_migrations (filename, checksum, applied_by)
SELECT '20260502_0159_promote_modules_production_page_experience_lock.sql', 'inline-0159', 'system'
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.schema_migrations
    WHERE filename = '20260502_0159_promote_modules_production_page_experience_lock.sql'
 );

COMMIT;
