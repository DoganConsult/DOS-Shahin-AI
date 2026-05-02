-- 20260422_0002_keycloak_bootstrap_align.sql
-- Aligns public.users / public.tenants / public.tenant_user_memberships /
-- public.iam_identities with the columns and types the auth-service
-- Keycloak callback bootstrap and login mirror queries depend on.
-- Forward-only, additive, idempotent (IF NOT EXISTS / safe ALTERs).

-- ── public.tenants ───────────────────────────────────────────────────
-- Widen tenant_id from VARCHAR(16) so it can store a full 36-char UUID.
ALTER TABLE public.tenants
  ALTER COLUMN tenant_id TYPE VARCHAR(64);

-- Allow the bootstrap status the keycloak-bootstrap service writes.
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

-- ── public.users — add columns auth-service reads / inserts ──────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id            VARCHAR(64);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role                 VARCHAR(100) DEFAULT 'owner';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name                 VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name            VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_complete  BOOLEAN      DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS member_onboarded     BOOLEAN      DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN      DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified       BOOLEAN      DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified_at    TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS locked_until         TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS platform_role        VARCHAR(100) DEFAULT NULL;
-- Forward-only correction: self-registered users must NEVER receive
-- platform_role='admin' by default. Drop the legacy default so DAuth /
-- Keycloak bootstrap inserts NULL when not explicitly elevated.
ALTER TABLE public.users ALTER COLUMN platform_role DROP DEFAULT;

CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON public.users (tenant_id);

-- ── public.tenant_user_memberships — add columns bootstrap inserts ───
ALTER TABLE public.tenant_user_memberships
  ADD COLUMN IF NOT EXISTS membership_type VARCHAR(20) DEFAULT 'internal';
ALTER TABLE public.tenant_user_memberships
  ADD COLUMN IF NOT EXISTS is_tenant_owner BOOLEAN     DEFAULT FALSE;

-- Widen tenant_id to match the new tenants.tenant_id width.
ALTER TABLE public.tenant_user_memberships
  ALTER COLUMN tenant_id TYPE VARCHAR(64);

-- ── public.iam_identities — align user_id with public.users.user_id ──
-- The canonical 059 migration declared user_id VARCHAR(64) REFERENCES
-- public.users(user_id). The live DB drifted to UUID; convert it back so
-- the auth-service code can JOIN against public.users without an
-- "operator does not exist: character varying = uuid" error.
DO $$
DECLARE
  current_type TEXT;
BEGIN
  SELECT data_type INTO current_type
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'iam_identities'
     AND column_name  = 'user_id';

  IF current_type = 'uuid' THEN
    ALTER TABLE public.iam_identities
      ALTER COLUMN user_id TYPE VARCHAR(64) USING user_id::text;
  END IF;
END $$;

-- ── public.onboarding_sessions — already VARCHAR(64), no ALTER needed.
-- (tenant_id and started_by_user_id are referenced by v_onboarding_funnel
--  view, and the existing types already match the width we need.)

-- ── grants ───────────────────────────────────────────────────────────
DO $grant$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_auth') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO dos_auth';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO dos_auth';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_user_memberships TO dos_auth';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.iam_identities TO dos_auth';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_sessions TO dos_auth';
  END IF;
END
$grant$;
