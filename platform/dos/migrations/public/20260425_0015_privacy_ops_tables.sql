-- =====================================================================
-- Privacy-ops register tables (20260425_0015)
--
-- Backs services/privacy-service/src/routes/privacy-ops.routes.ts:
--   GET  /ropa       → public.privacy_processing_activities
--   GET  /dsr        → public.privacy_dsr_requests (fallback: data_subject_requests)
--   POST /dsr        → INSERT into public.privacy_dsr_requests
--   GET  /consent    → public.privacy_consent_log
--   GET  /breaches   → public.privacy_breaches
--   POST /breaches   → INSERT into public.privacy_breaches
--   GET  /retention  → public.privacy_retention_policies
--
-- Living in `public` (cross-tenant register) rather than `dos` because
-- privacy registers are queried by both platform reporting (DPO-level)
-- and tenant operators; the `tenant_id` column scopes per-tenant access.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

-- RoPA / Records of Processing Activities — feeds /ropa.
CREATE TABLE IF NOT EXISTS public.privacy_processing_activities (
  activity_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  name               TEXT NOT NULL,
  purpose            TEXT,
  lawful_basis       TEXT,
  data_categories    TEXT[] NOT NULL DEFAULT '{}',
  retention_period   TEXT,
  controller         TEXT,
  processor          TEXT,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_privacy_processing_activities_tenant
  ON public.privacy_processing_activities(tenant_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.privacy_dsr_requests (
  request_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  subject_id         VARCHAR(128) NOT NULL,
  type               TEXT NOT NULL DEFAULT 'access',
  status             TEXT NOT NULL DEFAULT 'submitted',
  submitted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at             TIMESTAMPTZ,
  closed_at          TIMESTAMPTZ,
  assignee_id        VARCHAR(64),
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_public_privacy_dsr_requests_tenant_status
  ON public.privacy_dsr_requests(tenant_id, status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS public.privacy_consent_log (
  consent_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  subject_id         VARCHAR(128) NOT NULL,
  purpose            TEXT,
  lawful_basis       TEXT,
  granted            BOOLEAN NOT NULL DEFAULT TRUE,
  granted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at       TIMESTAMPTZ,
  channel            TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_privacy_consent_log_tenant_subject
  ON public.privacy_consent_log(tenant_id, subject_id, granted_at DESC);

CREATE TABLE IF NOT EXISTS public.privacy_breaches (
  breach_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  title              TEXT,
  description        TEXT NOT NULL,
  severity           TEXT NOT NULL DEFAULT 'medium',
  status             TEXT NOT NULL DEFAULT 'reported',
  detected_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reported_at        TIMESTAMPTZ,
  affected_subjects  INTEGER,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_privacy_breaches_tenant_detected
  ON public.privacy_breaches(tenant_id, detected_at DESC);

CREATE TABLE IF NOT EXISTS public.privacy_retention_policies (
  policy_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          VARCHAR(64) NOT NULL,
  name               TEXT NOT NULL,
  category           TEXT,
  retention_period   TEXT,
  legal_basis        TEXT,
  status             TEXT NOT NULL DEFAULT 'active',
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_privacy_retention_policies_tenant
  ON public.privacy_retention_policies(tenant_id, updated_at DESC);

-- public schema is open by default (USAGE granted to PUBLIC), but tables
-- need explicit privileges to non-owner roles. Grant SIUD to every active
-- service role; IF EXISTS guard makes this idempotent across deployments.
DO $grants$
DECLARE
  service_role TEXT;
  tbl TEXT;
  -- Real roles in shahin_grc.
  write_roles TEXT[] := ARRAY[
    'dos_user', 'dos_ai', 'dos_workflow', 'dos_audit', 'dos_tenant',
    'dos_notification', 'dos_auth', 'dos_migrator'
  ];
  tables TEXT[] := ARRAY[
    'privacy_processing_activities', 'privacy_dsr_requests',
    'privacy_consent_log', 'privacy_breaches', 'privacy_retention_policies'
  ];
BEGIN
  FOREACH service_role IN ARRAY write_roles LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = service_role) THEN
      FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format(
          'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO %I',
          tbl, service_role
        );
      END LOOP;
    END IF;
  END LOOP;
END $grants$;

COMMIT;
