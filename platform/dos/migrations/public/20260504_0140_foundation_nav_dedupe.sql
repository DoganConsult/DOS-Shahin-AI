-- =====================================================================
-- 0140 — Drop foundation duplicate navigation rows.
--
-- Phase F-F7-4 — migration 0110 (nav-orphan backfill) inserted 5 rows
-- for /foundation/{overview,records,workflows,reports,settings} with
-- parent_id IS NULL. Pre-existing rows for the same routes carry a
-- non-NULL parent_id (foundation parent group `20b785c5...`), so the
-- partial unique index `(module_code, route) WHERE tenant_id IS NULL
-- AND parent_id IS NULL` did not catch the collision.
--
-- The pre-existing rows are the source of truth (they are nested under
-- the canonical "Foundation" sidebar group, sort_order is hand-curated,
-- readiness='ready'). The 0110-seeded `parent_id IS NULL` duplicates
-- with readiness='PARTIAL' must go.
-- =====================================================================
BEGIN;

DELETE FROM dos.dynamic_ui_navigation
 WHERE tenant_id IS NULL
   AND parent_id IS NULL
   AND module_code = 'foundation'
   AND route IN (
     '/foundation/overview', '/foundation/records', '/foundation/workflows',
     '/foundation/reports', '/foundation/settings'
   )
   AND readiness = 'PARTIAL';

COMMIT;
