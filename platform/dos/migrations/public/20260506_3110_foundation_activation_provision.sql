-- =============================================================================
-- Migration: 20260506_3110_foundation_activation_provision
-- Purpose:   Wave F0 prep — close the gap between foundation contract and DB.
--            Adds missing permissions and the missing 'user' default role,
--            registers the test tenant entitlement, and seeds role permissions
--            arrays per contract.
--
-- Reads:    platform/foundation/contracts/permissions/permissions.json
--           (translated into INSERT statements below)
--
-- Idempotent: YES.
-- =============================================================================

BEGIN;

-- 1) Permissions catalog -----------------------------------------------------
INSERT INTO platform_dauth.permissions (permission_id, permission_code, module_code, description, created_at)
VALUES
  ('perm.foundation.user.disable',  'foundation.user.disable', 'foundation', 'Disable or deactivate users', now()),
  ('perm.foundation.admin.read',    'foundation.admin.read',   'foundation', 'Read role and permission catalogs', now()),
  ('perm.foundation.admin.write',   'foundation.admin.write',  'foundation', 'Mutate role assignments and access profiles', now()),
  ('perm.access_review.create',     'access_review:create',    'foundation', 'Create access review campaigns', now()),
  ('perm.access_review.approve',    'access_review:approve',   'foundation', 'Approve/reject access review attestations', now()),
  ('perm.delegation.create',        'delegation:create',       'foundation', 'Request delegation of authority', now()),
  ('perm.delegation.approve',       'delegation:approve',      'foundation', 'Approve delegation requests', now())
ON CONFLICT (permission_code) DO NOTHING;

-- 2) Default role: 'user' (was missing) --------------------------------------
INSERT INTO platform_dauth.functional_roles (role_id, role_code, display_name, description, permissions, created_at)
SELECT 'role.foundation.user', 'user', 'Foundation User',
       'Default foundation operator with read+write on records',
       ARRAY['foundation.read','foundation.record.write','foundation.user.read'],
       now()
WHERE NOT EXISTS (SELECT 1 FROM platform_dauth.functional_roles WHERE role_code='user');

-- 3) Alias: tenant_admin ⇄ tenant-admin (contract uses dash, DB has underscore)
INSERT INTO platform_dauth.functional_roles (role_id, role_code, display_name, description, permissions, created_at)
SELECT 'role.foundation.tenant-admin', 'tenant-admin', display_name,
       'Foundation admin (dash-form alias of tenant_admin)',
       permissions, now()
  FROM platform_dauth.functional_roles WHERE role_code='tenant_admin'
   AND NOT EXISTS (SELECT 1 FROM platform_dauth.functional_roles WHERE role_code='tenant-admin');

-- 4) Test tenant entitlement -------------------------------------------------
INSERT INTO dos.tenant_product_activation (tenant_id, product_key, status, activated_at)
SELECT 'tenant_test_foundation', 'module.foundation', 'active', now()
WHERE NOT EXISTS (
  SELECT 1 FROM dos.tenant_product_activation
   WHERE tenant_id='tenant_test_foundation' AND product_key='module.foundation'
);
UPDATE dos.tenant_product_activation
   SET status='active'
 WHERE tenant_id='tenant_test_foundation' AND product_key='module.foundation';

-- 5) Self-assertion ----------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM platform_dauth.permissions
   WHERE permission_code IN ('foundation.user.disable','foundation.admin.read','foundation.admin.write',
                              'access_review:create','access_review:approve',
                              'delegation:create','delegation:approve');
  IF n < 7 THEN RAISE EXCEPTION 'foundation permission backfill incomplete (%/7)', n; END IF;

  SELECT count(*) INTO n FROM platform_dauth.functional_roles
   WHERE role_code IN ('viewer','user','auditor','tenant-admin');
  IF n < 4 THEN RAISE EXCEPTION 'foundation default role backfill incomplete (%/4)', n; END IF;

  SELECT count(*) INTO n FROM dos.tenant_product_activation
   WHERE tenant_id='tenant_test_foundation' AND product_key='module.foundation' AND status='active';
  IF n < 1 THEN RAISE EXCEPTION 'test tenant entitlement missing'; END IF;
END $$;

COMMIT;
