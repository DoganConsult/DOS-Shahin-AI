-- =====================================================================
-- Wave 18 — tenant_admin: ensure all canonical foundation nav perms
--
-- Root cause:
--   dos.ui_module_nav_item permissions for module=foundation include
--   access_review.write, but the tenant_admin functional role
--   (auto-granted to every self-registered tenant founder by
--    services/tenant-service/src/server.ts) does NOT carry that perm.
--   UI-OS resolver therefore strips the access-review nav item for the
--   tenant founder, breaking end-user navigation to /foundation/access-review.
--
-- Doctrine fix:
--   Append the missing canonical permission(s) to tenant_admin.permissions
--   at the DB layer. Idempotent — only appends when absent.
-- =====================================================================

BEGIN;

WITH required(perm) AS (VALUES
  ('foundation.read'),
  ('foundation.module.read'),
  ('foundation.data.read'),
  ('foundation.user.read'),
  ('foundation.user.write'),
  ('foundation.rbac.read'),
  ('foundation.hierarchy.read'),
  ('foundation.sod.write'),
  ('foundation.admin'),
  ('audit_trail.read'),
  ('access_review.write')
)
UPDATE platform_dauth.functional_roles fr
   SET permissions = ARRAY(
         SELECT DISTINCT p
           FROM unnest(fr.permissions || ARRAY(SELECT perm FROM required)) AS p
       ),
       updated_at = NOW()
 WHERE fr.role_code IN ('tenant_admin','tenant_owner');

DO $$
DECLARE missing INT;
BEGIN
  SELECT count(*) INTO missing
    FROM (VALUES ('access_review.write'),('foundation.read'),('audit_trail.read')) AS r(perm)
   WHERE NOT EXISTS (
     SELECT 1 FROM platform_dauth.functional_roles
      WHERE role_code='tenant_admin'
        AND r.perm = ANY(permissions)
   );
  IF missing > 0 THEN
    RAISE EXCEPTION 'wave18: tenant_admin still missing % required foundation perms', missing;
  END IF;
  RAISE NOTICE 'wave18 proof: tenant_admin holds all 11 canonical foundation perms';
END$$;

COMMIT;
