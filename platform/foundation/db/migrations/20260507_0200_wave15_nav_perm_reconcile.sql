-- =====================================================================
-- Wave 15 — Foundation nav permission code reconcile + entitlement seed
--
-- Root cause closed:
--   1. dos.ui_module_nav_item.permission for module_code='foundation'
--      uses 4 different non-canonical conventions (perm_foundation_read,
--      foundation_rbac_read, perm.foundation.admin.read, perm.access_review.create).
--      None match dos.functional_roles.permissions[] which stores canonical
--      dotted codes (foundation.read, audit_trail.read, ...). UI-OS resolver
--      filter therefore strips every nav item.
--   2. tenant_module_entitlements has no foundation rows for live tenants
--      → loadNav() entitlement gate strips every group/item.
--
-- Fix at DB layer per doctrine. Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

-- 1. Reconcile permission codes to canonical dotted form -----------------
WITH m(legacy, canonical) AS (VALUES
  ('perm_foundation_read',     'foundation.read'),
  ('perm_audit_trail_read',    'audit_trail.read'),
  ('perm_foundation_user_read','foundation.user.read'),
  ('perm_foundation_user_write','foundation.user.write'),
  ('perm.foundation.admin.read','foundation.admin'),
  ('perm.access_review.create','access_review.write'),
  ('foundation_rbac_read',     'foundation.rbac.read'),
  ('foundation_data_read',     'foundation.data.read'),
  ('foundation_sod_write',     'foundation.sod.write'),
  ('foundation_hierarchy_read','foundation.hierarchy.read'),
  ('foundation_module_read',   'foundation.module.read')
)
UPDATE dos.ui_module_nav_item i
   SET permission = m.canonical, updated_at = NOW(), version = i.version + 1
  FROM m
 WHERE i.module_code = 'foundation' AND i.permission = m.legacy;

-- Self-test: every foundation nav permission must be canonical or NULL.
DO $$
DECLARE bad INT;
BEGIN
  SELECT count(*) INTO bad FROM dos.ui_module_nav_item
   WHERE module_code='foundation'
     AND permission IS NOT NULL
     AND permission !~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]+)+$';
  IF bad > 0 THEN
    RAISE EXCEPTION 'wave15: % nav items still hold non-canonical permission codes', bad;
  END IF;
END$$;

-- 2. Ensure foundation entitlement for every existing tenant ------------
-- Foundation is platform DNA; every active tenant must see it.
INSERT INTO dos.tenant_module_entitlements
  (entitlement_id, tenant_id, product_code, module_code, entitlement_status, source, starts_at, metadata)
SELECT
  substr(replace(gen_random_uuid()::text,'-',''),1,28),
  t.tenant_id::text,
  'shahin-ai',
  'foundation',
  'active',
  'platform_dna',
  NOW(),
  '{"reason":"wave15-platform-dna-backfill"}'::jsonb
  FROM dos.tenants t
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.tenant_module_entitlements e
    WHERE e.tenant_id::text = t.tenant_id::text
      AND e.module_code = 'foundation'
      AND e.entitlement_status = 'active'
 );

-- 3. Trigger: future tenants get foundation entitlement automatically ---
CREATE OR REPLACE FUNCTION dos.fn_foundation_entitlement_on_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO dos.tenant_module_entitlements
    (entitlement_id, tenant_id, product_code, module_code, entitlement_status, source, starts_at, metadata)
  VALUES
    (substr(replace(gen_random_uuid()::text,'-',''),1,28), NEW.tenant_id::text, 'shahin-ai', 'foundation', 'active',
     'platform_dna', NOW(), '{"reason":"trigger-platform-dna"}'::jsonb)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_foundation_entitlement_on_tenant ON dos.tenants;
CREATE TRIGGER trg_foundation_entitlement_on_tenant
  AFTER INSERT ON dos.tenants
  FOR EACH ROW EXECUTE FUNCTION dos.fn_foundation_entitlement_on_tenant();

-- 4. Acceptance proof rows -----------------------------------------------
DO $$
DECLARE
  ent_count INT;
  nav_count INT;
BEGIN
  SELECT count(*) INTO ent_count FROM dos.tenant_module_entitlements
   WHERE module_code='foundation' AND entitlement_status='active';
  SELECT count(*) INTO nav_count FROM dos.ui_module_nav_item
   WHERE module_code='foundation';
  RAISE NOTICE 'wave15 proof: foundation entitlements=% nav_items=%', ent_count, nav_count;
  IF ent_count = 0 THEN
    RAISE EXCEPTION 'wave15: zero foundation entitlements after backfill';
  END IF;
END$$;

COMMIT;
