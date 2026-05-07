-- =====================================================================
-- Wave 22 — audit_trail module entitlement (platform DNA, like foundation)
--
-- Root cause:
--   dauth.deriveModuleCode('audit_trail.read') = 'audit_trail'. Tenants
--   carry the foundation entitlement (Wave 15) but NOT 'audit_trail',
--   so /api/audit-trail responds with DAUTH_DENY_PRODUCT_NOT_ENTITLED.
--   Audit trail is part of foundation's canonical surface (Wave 18 added
--   audit_trail.read to tenant_admin), so the entitlement must follow.
--
-- Doctrine fix (DB only, no code patch):
--   1) Backfill 'audit_trail' entitlement for every existing tenant that
--      already has foundation entitlement (active).
--   2) Trigger: every future tenant with foundation entitlement also
--      receives audit_trail.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

-- 1. Backfill --------------------------------------------------------------
INSERT INTO dos.tenant_module_entitlements
  (entitlement_id, tenant_id, product_code, module_code, entitlement_status, source, starts_at, metadata)
SELECT
  substr(replace(gen_random_uuid()::text,'-',''),1,28),
  t.tenant_id::text,
  'shahin-ai',
  'audit_trail',
  'active',
  'platform_dna',
  NOW(),
  '{"reason":"wave22-platform-dna-backfill"}'::jsonb
  FROM dos.tenants t
 WHERE EXISTS (
   SELECT 1 FROM dos.tenant_module_entitlements e
    WHERE e.tenant_id::text = t.tenant_id::text
      AND e.module_code = 'foundation'
      AND e.entitlement_status = 'active'
 )
   AND NOT EXISTS (
     SELECT 1 FROM dos.tenant_module_entitlements e
      WHERE e.tenant_id::text = t.tenant_id::text
        AND e.module_code = 'audit_trail'
        AND e.entitlement_status = 'active'
   );

-- 2. Trigger: chain off existing foundation entitlement trigger ----------
CREATE OR REPLACE FUNCTION dos.fn_audit_trail_entitlement_on_tenant()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO dos.tenant_module_entitlements
    (entitlement_id, tenant_id, product_code, module_code, entitlement_status, source, starts_at, metadata)
  VALUES
    (substr(replace(gen_random_uuid()::text,'-',''),1,28), NEW.tenant_id::text,
     'shahin-ai', 'audit_trail', 'active',
     'platform_dna', NOW(), '{"reason":"trigger-platform-dna"}'::jsonb)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_trail_entitlement_on_tenant ON dos.tenants;
CREATE TRIGGER trg_audit_trail_entitlement_on_tenant
  AFTER INSERT ON dos.tenants
  FOR EACH ROW EXECUTE FUNCTION dos.fn_audit_trail_entitlement_on_tenant();

-- 3. Self-test ------------------------------------------------------------
DO $$
DECLARE missing INT; total INT;
BEGIN
  SELECT count(*) INTO missing
    FROM dos.tenants t
   WHERE EXISTS (SELECT 1 FROM dos.tenant_module_entitlements e
                  WHERE e.tenant_id::text=t.tenant_id::text AND e.module_code='foundation' AND e.entitlement_status='active')
     AND NOT EXISTS (SELECT 1 FROM dos.tenant_module_entitlements e
                      WHERE e.tenant_id::text=t.tenant_id::text AND e.module_code='audit_trail' AND e.entitlement_status='active');
  SELECT count(*) INTO total FROM dos.tenant_module_entitlements
   WHERE module_code='audit_trail' AND entitlement_status='active';
  IF missing > 0 THEN
    RAISE EXCEPTION 'wave22: % foundation-entitled tenants still missing audit_trail entitlement', missing;
  END IF;
  RAISE NOTICE 'wave22 proof: audit_trail entitlements active=%', total;
END$$;

COMMIT;
