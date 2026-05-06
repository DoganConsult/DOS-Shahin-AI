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
--   A) Preflight: duplicate guards on permissions catalog; preview counts;
--      STOP before any UPDATE if any non-empty nav permission is unmatched.
--   B) Rewrites foundation nav item permissions: permission_code → permission_id
--      via join on platform_dauth.permissions (no invented permissions).
--   C) Merges every distinct foundation nav permission_id into platform_admin.
--
-- Idempotent forward-only after preflight passes once.
--
-- Apply via canonical migration runner only.

BEGIN;

-- ─── Schema preflight: ensure functional_roles.updated_at exists ────────────
-- Required by the merge UPDATE below. Idempotent: ADD COLUMN IF NOT EXISTS.
ALTER TABLE platform_dauth.functional_roles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
DECLARE
  dup_code_cnt integer;
  dup_id_cnt   integer;

  cnt_total       integer;
  cnt_empty_perm  integer;
  cnt_nonempty    integer;
  cnt_via_code    integer;
  cnt_via_id      integer;
  cnt_unmatched   integer;

  unmatched_report text;

  plat_admin_exists boolean;
BEGIN
  -- ─── Duplicate guards (catalog integrity; ambiguous UPDATE forbidden) ───
  SELECT count(*) INTO dup_code_cnt
    FROM (
           SELECT permission_code AS k
             FROM platform_dauth.permissions
            WHERE COALESCE(btrim(permission_code), '') <> ''
            GROUP BY permission_code
           HAVING count(*) > 1
         ) d;

  IF dup_code_cnt <> 0 THEN
    RAISE EXCEPTION 'P0-1 preflight failed: duplicate non-empty platform_dauth.permissions.permission_code (% groups); fix catalog before aligning nav', dup_code_cnt;
  END IF;

  SELECT count(*) INTO dup_id_cnt
    FROM (
           SELECT permission_id AS k
             FROM platform_dauth.permissions
            WHERE COALESCE(btrim(permission_id), '') <> ''
            GROUP BY permission_id
           HAVING count(*) > 1
         ) d;

  IF dup_id_cnt <> 0 THEN
    RAISE EXCEPTION 'P0-1 preflight failed: duplicate platform_dauth.permissions.permission_id (% groups); fix catalog before aligning nav', dup_id_cnt;
  END IF;

  -- ─── Preview counts (before UPDATE) ───────────────────────────────────────
  SELECT count(*) INTO cnt_total
    FROM dos.ui_module_nav_item
   WHERE module_code = 'foundation';

  SELECT count(*) INTO cnt_empty_perm
    FROM dos.ui_module_nav_item ni
   WHERE ni.module_code = 'foundation'
     AND COALESCE(btrim(ni.permission), '') = '';

  SELECT count(*) INTO cnt_nonempty FROM (
    SELECT 1 FROM dos.ui_module_nav_item ni
    WHERE ni.module_code = 'foundation'
      AND COALESCE(btrim(ni.permission), '') <> ''
  ) q;

  SELECT count(*) INTO cnt_via_code FROM (
    SELECT 1 FROM dos.ui_module_nav_item ni
    WHERE ni.module_code = 'foundation'
      AND COALESCE(btrim(ni.permission), '') <> ''
      AND EXISTS (
            SELECT 1 FROM platform_dauth.permissions p
             WHERE p.permission_code = btrim(ni.permission)
          )
  ) q;

  SELECT count(*) INTO cnt_via_id FROM (
    SELECT 1 FROM dos.ui_module_nav_item ni
    WHERE ni.module_code = 'foundation'
      AND COALESCE(btrim(ni.permission), '') <> ''
      AND EXISTS (
            SELECT 1 FROM platform_dauth.permissions p
             WHERE p.permission_id = btrim(ni.permission)
          )
  ) q;

  SELECT count(*) INTO cnt_unmatched FROM (
    SELECT 1 FROM dos.ui_module_nav_item ni
    WHERE ni.module_code = 'foundation'
      AND COALESCE(btrim(ni.permission), '') <> ''
      AND NOT EXISTS (
            SELECT 1 FROM platform_dauth.permissions p
             WHERE p.permission_code = btrim(ni.permission)
                OR p.permission_id = btrim(ni.permission)
          )
  ) q;

  SELECT EXISTS (
           SELECT 1 FROM platform_dauth.functional_roles
            WHERE role_code = 'platform_admin'
         )
    INTO plat_admin_exists;

  RAISE NOTICE '[P0-1 preflight] permission catalog: duplicate_permission_code_groups=0 duplicate_permission_id_groups=0 (enforced)';
  RAISE NOTICE '[P0-1 preflight] foundation nav: total_rows=% empty_permission=% nonempty_permission=% rows_matching_permission_code=% rows_matching_permission_id=% rows_unmatched=%',
      cnt_total, cnt_empty_perm, cnt_nonempty, cnt_via_code, cnt_via_id, cnt_unmatched;
  RAISE NOTICE '[P0-1 preflight] platform_admin functional_roles row exists=%', plat_admin_exists;

  IF cnt_unmatched <> 0 THEN
    SELECT string_agg(
             format('%s.%s route=%s permission=%s', ni.module_code, ni.item_id, ni.route, btrim(ni.permission)),
             E'\n' ORDER BY ni.module_code, ni.item_id
           )
      INTO unmatched_report
      FROM dos.ui_module_nav_item ni
     WHERE ni.module_code = 'foundation'
       AND COALESCE(btrim(ni.permission), '') <> ''
       AND NOT EXISTS (
             SELECT 1 FROM platform_dauth.permissions p
              WHERE p.permission_code = btrim(ni.permission)
                 OR p.permission_id = btrim(ni.permission)
           );

    RAISE EXCEPTION 'P0-1 preflight FAILED: % foundation nav row(s) have permission not found in platform_dauth.permissions (code or permission_id). Do not invent permissions. Rows:%',
        cnt_unmatched, chr(10) || coalesce(unmatched_report, '');
  END IF;
END $$;

-- ─── Apply: map nav.permission → permission_id (code or id resolves) ────────
UPDATE dos.ui_module_nav_item ni
   SET permission = p.permission_id,
       updated_at   = now()
  FROM platform_dauth.permissions p
 WHERE ni.module_code = 'foundation'
   AND COALESCE(btrim(ni.permission), '') <> ''
   AND (p.permission_code = ni.permission OR p.permission_id = ni.permission);

-- ─── Post-assert every non-empty value is a catalog permission_id ───────────
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
    RAISE EXCEPTION 'P0-1 post-UPDATE assertion: % foundation nav rows not equal to permissions.permission_id (ambiguous join or drift)', bad_count;
  END IF;
END $$;

-- ─── Merge foundation nav permission_ids into platform_admin ────────────────
DO $$
DECLARE
  nav_perm_ids text[];
BEGIN
  SELECT coalesce(array_agg(perm ORDER BY perm), ARRAY[]::text[])
    INTO nav_perm_ids
    FROM (
           SELECT DISTINCT btrim(ni.permission) AS perm
             FROM dos.ui_module_nav_item ni
            WHERE ni.module_code = 'foundation'
              AND COALESCE(btrim(ni.permission), '') <> ''
         ) q;

  IF cardinality(nav_perm_ids) = 0 THEN
    RAISE EXCEPTION 'P0-1 assertion: zero foundation nav permissions after alignment';
  END IF;

  IF EXISTS (SELECT 1 FROM platform_dauth.functional_roles WHERE role_code = 'platform_admin') THEN
    UPDATE platform_dauth.functional_roles fr
       SET permissions = ARRAY(
               SELECT DISTINCT u
                 FROM unnest(coalesce(fr.permissions, ARRAY[]::text[]) || nav_perm_ids) AS u
                ORDER BY u
             ),
           updated_at = now()
     WHERE fr.role_code = 'platform_admin';

    RAISE NOTICE '[P0-1 post-merge] merged % distinct foundation permission_id(s) into platform_admin.permissions', cardinality(nav_perm_ids);
  ELSE
    RAISE NOTICE '[P0-1 post-merge] platform_admin functional_role missing — skipped merge';
  END IF;
END $$;

COMMIT;
