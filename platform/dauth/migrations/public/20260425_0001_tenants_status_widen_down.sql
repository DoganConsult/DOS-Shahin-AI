-- 20260425_0001_tenants_status_widen_down.sql
-- Reverts the widening done in 20260425_0001_tenants_status_widen.sql.
-- Restores the prior narrower CHECK from 20260422_0002_keycloak_bootstrap_align.sql.
--
-- WARNING: any rows currently holding 'email_pending' / 'verified' /
-- 'provisioning' / 'onboarding_ready' / 'deleted' will violate the restored
-- constraint. Inspect/migrate them before running this down.

DO $$
DECLARE
  bad_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM public.tenants
  WHERE status NOT IN ('registered', 'onboarding', 'active', 'suspended', 'archived', 'pending');

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Cannot down-migrate: % tenants hold a status not in the narrower set. Resolve them first.', bad_count;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tenants'::regclass
      AND conname  = 'tenants_status_check'
  ) THEN
    ALTER TABLE public.tenants DROP CONSTRAINT tenants_status_check;
  END IF;
END $$;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_status_check
  CHECK (status IN ('registered', 'onboarding', 'active', 'suspended', 'archived', 'pending'));
