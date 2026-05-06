-- 20260510_0200_p0_1_foundation_nav_permission_id_alignment.sql
--
-- P0-1 — Align dos.ui_module_nav_item.permission with canonical
-- platform_dauth.permissions.permission_id so workspace-shell loadNav
-- (services/ui-os-service/src/routes/workspace-shell.routes.ts) matches:
--   i.permission = ANY(DISTINCT unnest(functional_roles.permissions))
--
-- Root cause: foundation nav seed (20260505_0510) stores permission_code-style
-- strings (foundation.read, audit_trail.read, access_review:create) while
-- functional_roles.permissions[] is backfilled from role_permissions as
-- permission_id (20260507_0200) and extended with direct-seed codes that map
-- to permission rows (20260508_0001).
--
-- This migration:
--   1) Rewrites foundation nav item permissions: permission_code → permission_id
--      via join on platform_dauth.permissions (no invented permissions).
--   2) Merges every distinct foundation nav permission_id into
--      platform_admin so entitled tenants with that role see full Foundation
--      nav (parity with tenant_admin / tenant_owner direct-seed baseline).
--
-- Idempotent. Forward-only.

BEGIN;

-- ─── 1) Map nav permission column to catalog permission_id ─────────────────
-- Idempotent: resolves either legacy permission_code or already-stored permission_id.
UPDATE dos.ui_module_nav_item ni
   SET permission = p.permission_id,
       updated_at   = now()
  FROM platform_dauth.permissions p
 WHERE ni.module_code = 'foundation'
   AND COALESCE(btrim(ni.permission), '') <> ''
   AND (p.permission_code = ni.permission OR p.permission_id = ni.permission);

-- ─── 2) Assert every non-empty foundation nav permission resolves in catalog
DO $$
DECLARE
  bad_count integer;
BEGIN
  SELECT count(*) INTO bad_count
    FROM dos.ui_module_nav_item ni
   WHERE ni.module_code = 'foundation'
     AND COALESCE(btrim(ni.permission), '') <> ''
     AND NOT EXISTS (
           SELECT 1
             FROM platform_dauth.permissions p
            WHERE p.permission_id = ni.permission
         );

  IF bad_count <> 0 THEN
    RAISE EXCEPTION 'P0-1 assertion: % foundation nav items still lack a matching permissions.permission_id (catalog gap; do not invent codes here)', bad_count;
  END IF;
END $$;

-- ─── 3) Merge foundation nav permission_ids into platform_admin ─────────────
DO $$
DECLARE
  nav_perm_ids text[];
BEGIN
  SELECT coalesce(array_agg(perm ORDER BY perm), ARRAY[]::text[])
    INTO nav_perm_ids
    FROM (
           SELECT DISTINCT ni.permission AS perm
             FROM dos.ui_module_nav_item ni
            WHERE ni.module_code = 'foundation'
              AND COALESCE(btrim(ni.permission), '') <> ''
         ) q;

  IF cardinality(nav_perm_ids) = 0 THEN
    RAISE EXCEPTION 'P0-1 assertion: zero foundation nav permissions after mapping';
  END IF;

  IF EXISTS (SELECT 1 FROM platform_dauth.functional_roles WHERE role_code = 'platform_admin') THEN
    UPDATE platform_dauth.functional_roles fr
       SET permissions = (
               SELECT ARRAY(SELECT DISTINCT u ORDER BY u)
                 FROM unnest(coalesce(fr.permissions, ARRAY[]::text[]) || nav_perm_ids) AS u
             ),
           updated_at = now()
     WHERE fr.role_code = 'platform_admin';
  ELSE
    RAISE NOTICE 'P0-1: platform_admin functional_role missing — skip merge';
  END IF;
END $$;

-- ─── 4) Sanity notices (counts only) ────────────────────────────────────────
DO $$
DECLARE
  n_items integer;
  n_distinct_perm integer;
BEGIN
  SELECT count(*) INTO n_items
    FROM dos.ui_module_nav_item
   WHERE module_code = 'foundation';

  SELECT count(DISTINCT permission) INTO n_distinct_perm
    FROM dos.ui_module_nav_item
   WHERE module_code = 'foundation'
     AND COALESCE(btrim(permission), '') <> '';

  RAISE NOTICE 'P0-1 complete: foundation nav items=%, distinct non-null permissions=%', n_items, n_distinct_perm;
END $$;

COMMIT;
