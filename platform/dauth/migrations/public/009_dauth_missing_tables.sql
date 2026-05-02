-- 009_dauth_missing_tables.sql
-- Creates the 10 tables referenced by dauth services that lack migrations.
-- All operations are idempotent (CREATE TABLE IF NOT EXISTS).

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- PUBLIC SCHEMA TABLES (3)
-- ═══════════════════════════════════════════════════════════════

-- ── active_sessions — lightweight session presence table ──────
-- Used by: scim/user-anonymization.service.ts (DELETE on GDPR wipe)
--
-- Phase 3A: ops/migrations/005_missing_platform_tables.sql created a
-- placeholder VIEW at public.active_sessions (backed by public.sessions).
-- That view must be replaced by the real table below, otherwise this
-- file's CREATE TABLE IF NOT EXISTS no-ops and the subsequent CREATE
-- INDEX fails with "cannot create index on relation active_sessions".
--
-- Phase 10J: `DROP VIEW IF EXISTS` raises "is not a view" (42809) when
-- the object is already the real TABLE form (upgrade DBs that already
-- ran 009). Guard the drop so the migration is idempotent across fresh
-- and upgrade DBs.
DO $$
DECLARE
  kind char;
BEGIN
  SELECT c.relkind INTO kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'active_sessions';

  IF kind = 'v' THEN
    EXECUTE 'DROP VIEW public.active_sessions CASCADE';
  END IF;
  -- If kind IS NULL (no object yet) or 'r' (already a table), skip the
  -- drop and let the CREATE TABLE IF NOT EXISTS below land cleanly.
END $$;

CREATE TABLE IF NOT EXISTS public.active_sessions (
  session_id          VARCHAR(64) PRIMARY KEY,
  user_id             VARCHAR(64) NOT NULL,
  tenant_id           VARCHAR(16) NOT NULL,
  ip_address          INET,
  user_agent          TEXT,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON public.active_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_tenant ON public.active_sessions (tenant_id);

-- ── invitations — tenant user invitation lifecycle ────────────
-- Used by: identity/invitation-control.service.ts, diagnostics/, jobs/
CREATE TABLE IF NOT EXISTS public.invitations (
  invitation_id       VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id           VARCHAR(16) NOT NULL,
  email               VARCHAR(255) NOT NULL,
  role_code           VARCHAR(100) NOT NULL,
  invited_by          VARCHAR(64) NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
  token               VARCHAR(128) NOT NULL UNIQUE,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invitations_tenant_status ON public.invitations (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations (token) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON public.invitations (expires_at) WHERE status = 'pending';

-- ── security_events — security audit event log ────────────────
-- Used by: audit/security-event.service.ts
CREATE TABLE IF NOT EXISTS public.security_events (
  event_id            VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id           VARCHAR(16) NOT NULL,
  user_id             VARCHAR(64) NOT NULL,
  event_type          VARCHAR(50) NOT NULL,
  ip                  VARCHAR(45),
  user_agent          TEXT,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_tenant ON public.security_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON public.security_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events (event_type, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- TENANT-SCHEMA TABLES (7)
-- These use dos schema as canonical; tenant provisioning copies
-- them per-tenant via __TENANT_SCHEMA__ substitution.
-- ═══════════════════════════════════════════════════════════════

-- ── authz_decision_log — authorization decision audit trail ───
-- Used by: access/authorization-matrix.service.ts, delegation/delegation-automation.service.ts,
--          scim/user-anonymization.service.ts
CREATE TABLE IF NOT EXISTS dos.authz_decision_log (
  id                  VARCHAR(64) PRIMARY KEY,
  tenant_id           VARCHAR(16) NOT NULL,
  user_id             VARCHAR(64) NOT NULL,
  action              VARCHAR(100) NOT NULL,
  entity_type         VARCHAR(50),
  entity_id           VARCHAR(64),
  scope_type          VARCHAR(50),
  scope_id            VARCHAR(64),
  allowed             BOOLEAN NOT NULL,
  reason              TEXT,
  authority           VARCHAR(50),
  delegated           BOOLEAN DEFAULT FALSE,
  duration_ms         INTEGER,
  event_type          VARCHAR(50),
  actor_id            VARCHAR(64),
  target_id           VARCHAR(64),
  detail              TEXT,
  decided_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authz_decision_log_tenant ON dos.authz_decision_log (tenant_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_authz_decision_log_user ON dos.authz_decision_log (user_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_authz_decision_log_action ON dos.authz_decision_log (action);

-- Phase 3A: co-locate the expansion columns from migration 002 so a
-- single-pass run produces the same final shape as the historical
-- 002 → 009 upgrade path. Migration 002 itself remains idempotent.
ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS request_path     TEXT;
ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS request_method   VARCHAR(10);
ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS ip_address       VARCHAR(45);
ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS user_agent       TEXT;
ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS session_id       VARCHAR(128);
ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS delegation_chain JSONB DEFAULT '[]';
ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS sod_check_result JSONB DEFAULT '{}';
ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS evaluation_steps JSONB DEFAULT '[]';
CREATE INDEX IF NOT EXISTS idx_authz_decision_log_ip      ON dos.authz_decision_log (ip_address)   WHERE ip_address   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_authz_decision_log_session ON dos.authz_decision_log (session_id)   WHERE session_id   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_authz_decision_log_path    ON dos.authz_decision_log (request_path) WHERE request_path IS NOT NULL;

-- ── decision_authorities — authority grants per role/entity ───
-- Used by: access/authorization-matrix.service.ts
CREATE TABLE IF NOT EXISTS dos.decision_authorities (
  id                  VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  role_id             VARCHAR(64) NOT NULL,
  entity_type         VARCHAR(50) NOT NULL,
  action_code         VARCHAR(100) NOT NULL,
  authority_level     VARCHAR(50) NOT NULL,
  decision_type       VARCHAR(30) NOT NULL DEFAULT 'approve',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decision_authorities_role ON dos.decision_authorities (role_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_decision_authorities_entity ON dos.decision_authorities (entity_type, action_code);

-- ── authority_scope_bindings — scope limits on authorities ────
-- Used by: access/authorization-matrix.service.ts
CREATE TABLE IF NOT EXISTS dos.authority_scope_bindings (
  id                  VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  authority_id        VARCHAR(64) NOT NULL REFERENCES dos.decision_authorities(id),
  scope_type          VARCHAR(50) NOT NULL,
  scope_id            VARCHAR(64) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authority_scope_bindings_auth ON dos.authority_scope_bindings (authority_id);

-- ── delegation_chains — active delegation relationships ───────
-- Used by: delegation/delegation-automation.service.ts, access/authorization-matrix.service.ts
CREATE TABLE IF NOT EXISTS dos.delegation_chains (
  id                  VARCHAR(64) PRIMARY KEY,
  from_user_id        VARCHAR(64) NOT NULL,
  to_user_id          VARCHAR(64) NOT NULL,
  role_id             VARCHAR(64) NOT NULL,
  scope_type          VARCHAR(50) DEFAULT 'tenant',
  scope_id            VARCHAR(64),
  delegation_type     VARCHAR(30) NOT NULL DEFAULT 'acting',
  status              VARCHAR(20) NOT NULL DEFAULT 'active',
  valid_from          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delegation_chains_to ON dos.delegation_chains (to_user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_delegation_chains_from ON dos.delegation_chains (from_user_id, status);
CREATE INDEX IF NOT EXISTS idx_delegation_chains_valid ON dos.delegation_chains (valid_until) WHERE status = 'active' AND valid_until IS NOT NULL;

-- ── delegation_policies — auto-delegation rules ───────────────
-- Used by: delegation/delegation-automation.service.ts
CREATE TABLE IF NOT EXISTS dos.delegation_policies (
  id                  VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  role_id             VARCHAR(64) NOT NULL,
  policy_type         VARCHAR(30) NOT NULL DEFAULT 'ooo_auto',
  scope_type          VARCHAR(50),
  scope_id            VARCHAR(64),
  max_duration_hours  INTEGER,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delegation_policies_active ON dos.delegation_policies (policy_type) WHERE is_active = TRUE;

-- ── user_availability — OOO status and delegate preferences ───
-- Used by: delegation/delegation-automation.service.ts
CREATE TABLE IF NOT EXISTS dos.user_availability (
  id                  VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id             VARCHAR(64) NOT NULL UNIQUE,
  status              VARCHAR(20) NOT NULL DEFAULT 'available',
  ooo_until           TIMESTAMPTZ,
  available_from      TIMESTAMPTZ,
  delegate_to_user_id VARCHAR(64),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_availability_ooo ON dos.user_availability (status) WHERE status = 'ooo';

-- ── user_competencies — user competency attestations ──────────
-- Used by: delegation/delegation-automation.service.ts
CREATE TABLE IF NOT EXISTS dos.user_competencies (
  id                  VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id             VARCHAR(64) NOT NULL,
  competency_code     VARCHAR(100) NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  attested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_competencies_user ON dos.user_competencies (user_id) WHERE is_active = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_competencies_unique ON dos.user_competencies (user_id, competency_code) WHERE is_active = TRUE;

COMMIT;
