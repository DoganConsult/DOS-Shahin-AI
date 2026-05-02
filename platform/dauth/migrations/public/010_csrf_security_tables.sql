-- 010_csrf_security_tables.sql
-- Enterprise CSRF & session security tables.
-- All operations are idempotent (CREATE TABLE IF NOT EXISTS).

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. CSRF FAILURES — persistent audit trail of every validation failure
-- ═══════════════════════════════════════════════════════════════
-- Used by: csrf-audit.service.ts, csrf-diagnostics.service.ts
-- Purpose: attack pattern detection, rate limiting, compliance audit

CREATE TABLE IF NOT EXISTS public.csrf_failures (
  failure_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           VARCHAR(16),
  session_id          VARCHAR(64),
  user_id             VARCHAR(64),
  ip_address          INET,
  user_agent          TEXT,
  path                VARCHAR(512) NOT NULL,
  method              VARCHAR(10) NOT NULL,
  reason              VARCHAR(100) NOT NULL,
  hint_returned       VARCHAR(50),
  correlation_id      VARCHAR(64),
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csrf_failures_ip
  ON public.csrf_failures (ip_address, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_csrf_failures_tenant
  ON public.csrf_failures (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_csrf_failures_session
  ON public.csrf_failures (session_id, occurred_at DESC)
  WHERE session_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 2. CSRF SECURITY POLICIES — per-tenant configurable CSRF behavior
-- ═══════════════════════════════════════════════════════════════
-- Used by: csrf-policy.service.ts, csrf.middleware.ts
-- Purpose: tenant-specific token lifecycle, rotation, enforcement

CREATE TABLE IF NOT EXISTS public.csrf_security_policies (
  policy_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                VARCHAR(16) NOT NULL UNIQUE,
  token_max_age_ms         INTEGER NOT NULL DEFAULT 14400000,
  rotation_interval_ms     INTEGER NOT NULL DEFAULT 60000,
  grace_window_ms          INTEGER NOT NULL DEFAULT 5000,
  enforcement_mode         VARCHAR(20) NOT NULL DEFAULT 'block',
  same_ip_required         BOOLEAN NOT NULL DEFAULT FALSE,
  same_ua_required         BOOLEAN NOT NULL DEFAULT TRUE,
  max_failures_per_window  INTEGER NOT NULL DEFAULT 10,
  failure_window_ms        INTEGER NOT NULL DEFAULT 300000,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  created_by               VARCHAR(64),
  updated_by               VARCHAR(64),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csrf_policies_tenant
  ON public.csrf_security_policies (tenant_id)
  WHERE is_active = TRUE;

-- ═══════════════════════════════════════════════════════════════
-- 3. SESSION SECURITY EVENTS — server-side anomaly tracking
-- ═══════════════════════════════════════════════════════════════
-- Used by: session-security.service.ts, csrf-diagnostics.service.ts
-- Purpose: IP changes, UA changes, CSRF bursts, concurrent session limits

CREATE TABLE IF NOT EXISTS public.session_security_events (
  event_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          VARCHAR(64) NOT NULL,
  tenant_id           VARCHAR(16) NOT NULL,
  user_id             VARCHAR(64) NOT NULL,
  event_type          VARCHAR(50) NOT NULL,
  risk_level          VARCHAR(20) NOT NULL DEFAULT 'low',
  metadata            JSONB DEFAULT '{}',
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_sec_events_session
  ON public.session_security_events (session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_sec_events_tenant
  ON public.session_security_events (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_sec_events_type
  ON public.session_security_events (event_type, occurred_at DESC);

COMMIT;
