-- =============================================================================
-- Migration: 20260507_0200_sync_functional_roles_permissions_from_role_permissions
-- Purpose:   Backfill deprecated functional_roles.permissions[] from canonical
--            platform_dauth.role_permissions (ordered permission_id), dedupe RP,
--            and fix sync trigger so AFTER INSERT does not reference OLD.
--
-- Context:   rbac-role-permissions-sync-check.mjs compares string_agg(RP) vs
--            DISTINCT-sorted legacy array; drift was breaking CI for platform_super_admin,
--            fnd_role_user, fnd_role_tenant_admin.
--
-- Idempotent: YES.
-- =============================================================================

BEGIN;

-- ─── 1) Remove duplicate role_permission rows (same role_id + permission_id) ──
WITH ranked AS (
  SELECT ctid,
         ROW_NUMBER() OVER (
           PARTITION BY role_id, permission_id
           ORDER BY ctid
         ) AS rn
  FROM platform_dauth.role_permissions
)
DELETE FROM platform_dauth.role_permissions rp
USING ranked r
WHERE rp.ctid = r.ctid
  AND r.rn > 1;

-- ─── 2) Backfill legacy array from canonical role_permissions (sorted) ───────
UPDATE platform_dauth.functional_roles fr
SET permissions = agg.perm_arr
FROM (
  SELECT rp.role_id,
         array_agg(rp.permission_id ORDER BY rp.permission_id) AS perm_arr
  FROM platform_dauth.role_permissions rp
  GROUP BY rp.role_id
) agg
WHERE fr.role_id = agg.role_id;

-- ─── 3) Replace sync function in platform_dauth (dos_auth cannot CREATE on public)
DROP TRIGGER IF EXISTS trg_sync_role_permissions ON platform_dauth.functional_roles;
DROP TRIGGER IF EXISTS trg_sync_role_permissions_insert ON platform_dauth.functional_roles;

DROP FUNCTION IF EXISTS platform_dauth.sync_role_permissions_on_functional_roles_update();
DROP FUNCTION IF EXISTS public.sync_role_permissions_on_functional_roles_update();

CREATE OR REPLACE FUNCTION platform_dauth.sync_role_permissions_on_functional_roles_update()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.permissions IS NOT NULL AND cardinality(NEW.permissions) > 0 THEN
      DELETE FROM platform_dauth.role_permissions
      WHERE role_id = NEW.role_id;

      INSERT INTO platform_dauth.role_permissions (role_id, permission_id)
      SELECT NEW.role_id, unnest(NEW.permissions);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.permissions IS DISTINCT FROM NEW.permissions THEN
      DELETE FROM platform_dauth.role_permissions
      WHERE role_id = NEW.role_id;

      INSERT INTO platform_dauth.role_permissions (role_id, permission_id)
      SELECT NEW.role_id, unnest(NEW.permissions)
      WHERE NEW.permissions IS NOT NULL
        AND cardinality(NEW.permissions) > 0;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_role_permissions
  AFTER UPDATE OF permissions ON platform_dauth.functional_roles
  FOR EACH ROW
  EXECUTE FUNCTION platform_dauth.sync_role_permissions_on_functional_roles_update();

CREATE TRIGGER trg_sync_role_permissions_insert
  AFTER INSERT ON platform_dauth.functional_roles
  FOR EACH ROW
  EXECUTE FUNCTION platform_dauth.sync_role_permissions_on_functional_roles_update();

COMMIT;
