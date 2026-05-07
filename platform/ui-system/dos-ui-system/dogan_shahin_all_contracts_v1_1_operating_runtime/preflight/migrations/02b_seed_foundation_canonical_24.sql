-- =====================================================================
-- v1.1 Operating Runtime Pack — Preflight Blocker B2b
-- Seed the 6 canonical Foundation pages missing from dos.ui_module_nav_item
-- ---------------------------------------------------------------------
-- Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / DB-as-source.
-- This migration is shipped as ready-for-review SQL inside the v1.1
-- contract pack. It MUST NOT be auto-executed by the migrator pipeline.
-- Execution is gated on human review + lockstep CI guard.
--
-- Defect:
--   v1.1 foundation.module.contract declares 24 canonical pages, but
--   dos.ui_module_nav_item carries only 18 rows for module_code='foundation'.
--   The 6 missing rows (permissions, ownership, sod, hierarchy_viz,
--   user_lifecycle, diagnostics) cannot be invented in the frontend
--   per ZERO_STATIC doctrine; they MUST be seeded in the DB.
--
-- Fix mode:
--   Idempotent INSERT ... ON CONFLICT DO NOTHING on
--   (module_code, item_id) primary key. Existing rows are not touched.
--   sort_order continues live convention (+10 step) starting at 190.
--   group_id reuses the existing 'main' group already populated.
--   Permission convention follows live data: foundation.<key>.read
--   (foundation.ownership reuses the existing ownership.read perm).
--   Routes follow live URL convention (hyphenated path slugs).
--
-- Idempotent:  yes (ON CONFLICT DO NOTHING)
-- Destructive: no
-- Review required: yes (introduces new visible nav items;
--                    Foundation owner must approve labels/icons/perms)
-- =====================================================================

BEGIN;

INSERT INTO dos.ui_module_nav_item
  (module_code, item_id, group_id, sort_order, route, icon, permission,
   label_key, label_en, label_ar, badge, enabled, version)
VALUES
  ('foundation', 'foundation.permissions',     'main', 190,
   '/foundation/permissions',     'Identification',
   'foundation.permissions.read',
   'foundation.permissions.nav',     'Permissions',                 NULL, NULL, true, 1),

  ('foundation', 'foundation.ownership',       'main', 200,
   '/foundation/ownership',       'OwnerPersonal',
   'foundation.ownership.read',
   'foundation.ownership.nav',       'Ownership',                   NULL, NULL, true, 1),

  ('foundation', 'foundation.sod',             'main', 210,
   '/foundation/sod',             'RuleDataAnalytics',
   'foundation.sod.read',
   'foundation.sod.nav',             'Segregation of Duties',       NULL, NULL, true, 1),

  ('foundation', 'foundation.hierarchy_viz',   'main', 220,
   '/foundation/hierarchy-viz',   'ChartTreeMap',
   'foundation.hierarchy_viz.read',
   'foundation.hierarchy_viz.nav',   'Hierarchy Visualization',     NULL, NULL, true, 1),

  ('foundation', 'foundation.user_lifecycle',  'main', 230,
   '/foundation/user-lifecycle',  'UserActivity',
   'foundation.user_lifecycle.read',
   'foundation.user_lifecycle.nav',  'User Lifecycle',              NULL, NULL, true, 1),

  ('foundation', 'foundation.diagnostics',     'main', 240,
   '/foundation/diagnostics',     'Stethoscope',
   'foundation.diagnostics.read',
   'foundation.diagnostics.nav',     'Diagnostics',                 NULL, NULL, true, 1)
ON CONFLICT (module_code, item_id) DO NOTHING;

DO $$
DECLARE
  expected_canonical TEXT[] := ARRAY[
    'foundation.overview','foundation.organization','foundation.business_units',
    'foundation.departments','foundation.positions','foundation.users',
    'foundation.teams','foundation.roles','foundation.locations',
    'foundation.committees','foundation.delegations','foundation.ownership_mapping',
    'foundation.access_review','foundation.policies','foundation.data_processing',
    'foundation.reference_data','foundation.audit','foundation.settings',
    'foundation.permissions','foundation.ownership','foundation.sod',
    'foundation.hierarchy_viz','foundation.user_lifecycle','foundation.diagnostics'
  ];
  present_count INT;
  missing_count INT;
BEGIN
  SELECT count(*) INTO present_count
    FROM dos.ui_module_nav_item
   WHERE module_code = 'foundation'
     AND item_id = ANY(expected_canonical);

  SELECT count(*) INTO missing_count
    FROM unnest(expected_canonical) AS x(item_id)
   WHERE NOT EXISTS (
     SELECT 1
       FROM dos.ui_module_nav_item i
      WHERE i.module_code = 'foundation'
        AND i.item_id     = x.item_id
   );

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'B2b post-condition failed: % of 24 canonical Foundation rows still missing', missing_count;
  END IF;

  RAISE NOTICE 'B2b OK: all 24 canonical Foundation rows present (% rows match expected set).', present_count;
END $$;

COMMIT;
