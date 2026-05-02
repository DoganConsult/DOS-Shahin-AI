-- 20260425_0006_tenants_country_of_incorporation.sql
-- Add public.tenants.country_of_incorporation. The registration handler in
-- services/onboarding-service/src/application/register-tenant-user.ts
-- INSERTs this column from the registration form's `country` field, but
-- the live schema didn't have it — every register call returned
-- "Registration failed: column "country_of_incorporation" of relation
-- "tenants" does not exist".
--
-- ISO 3166-1 alpha-2 country code (e.g. 'SA', 'AE', 'US'). Nullable because
-- some legacy/admin tenants were created without one.
--
-- Forward-only, idempotent.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS country_of_incorporation VARCHAR(5);

COMMENT ON COLUMN public.tenants.country_of_incorporation IS
  'ISO 3166-1 alpha-2 (or alpha-3) country code captured at registration. Source: register-tenant-user.ts ${country} input.';
