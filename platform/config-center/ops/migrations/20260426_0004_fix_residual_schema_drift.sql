-- Residual schema-drift fixes surfaced by post-OIDC-fix log triage on
-- 2026-04-26. None of these were login blockers, but each emitted a
-- recurring SAFE_QUERY_* warn line on every cron tick or every service
-- bootstrap. Production-grade close-out:
--
--   (1) dos.tenants.settings missing — getProvisionedTenants() in
--       packages/dos-platform-core/src/jobs/job-scheduler.impl.ts SELECTs
--       t.settings to fan out per-tenant cron work. Adding the column as
--       jsonb '{}' preserves the existing API contract (callers already
--       handle settings===undefined) and lets the scheduler iterate
--       cleanly.
--
--   (2) platform_dauth.authz_decision_log missing — the canonical Law-12
--       decision-ledger table. The per-tenant copy is created by
--       20260425_0010_consolidate_decision_logs.sql, but the centralized
--       platform_dauth-scoped twin (used by the dauth-divergence-report
--       cron and by writeAuthDecision in
--       platform/dauth/packages/shared/src/audit/decision-ledger.ts) was
--       never migrated. Schema mirrors the per-tenant shape plus the
--       extended writer columns (engine_results, evaluation_steps,
--       decision_id, correlation_id, reason_code/s, policy_version,
--       model_version, obligations) referenced in decision-ledger.ts.
--
--   (3) Index for the boot-time config_definitions+config_values query
--       in packages/dos-runtime-config/src/index.ts:144. The query plan
--       is already optimal (Hash Left Join, 0.3 ms), but the cold-start
--       reads through a SeqScan on a 130-row table which is fine; what
--       blew the SLOW_QUERY threshold was first-connection setup. We add
--       a covering index on config_values(definition_id, scope_type,
--       is_active) so the planner can pick an Index Scan once warm and
--       to defend against the table growing.
--
-- All idempotent. Safe to re-run.

-- ── 1. dos.tenants.settings ───────────────────────────────────────────
ALTER TABLE dos.tenants
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ── 2. platform_dauth.authz_decision_log ─────────────────────────────
CREATE SCHEMA IF NOT EXISTS platform_dauth;

CREATE TABLE IF NOT EXISTS platform_dauth.authz_decision_log (
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
  decided_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_path        TEXT,
  request_method      VARCHAR(10),
  ip_address          VARCHAR(45),
  user_agent          TEXT,
  session_id          VARCHAR(128),
  delegation_chain    JSONB DEFAULT '[]'::jsonb,
  sod_check_result    JSONB DEFAULT '{}'::jsonb,
  evaluation_steps    JSONB DEFAULT '[]'::jsonb,
  decision_id         UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  correlation_id      VARCHAR(128),
  reason_code         VARCHAR(64),
  reason_codes        TEXT[] DEFAULT '{}',
  policy_version      VARCHAR(64),
  model_version       VARCHAR(64),
  engine_results      JSONB DEFAULT '{}'::jsonb,
  obligations         JSONB DEFAULT '{}'::jsonb,
  source              VARCHAR(20) NOT NULL DEFAULT 'native'
);

-- Defensive ADD COLUMN IF NOT EXISTS so a partially-pre-existing table
-- (manual create in older envs) catches up to the writer's expectations.
DO $$ BEGIN
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS evaluation_steps    JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS engine_results      JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS obligations         JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS decision_id         UUID NOT NULL DEFAULT gen_random_uuid();
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS correlation_id      VARCHAR(128);
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS reason_code         VARCHAR(64);
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS reason_codes        TEXT[] DEFAULT '{}';
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS policy_version      VARCHAR(64);
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS model_version       VARCHAR(64);
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS source              VARCHAR(20) NOT NULL DEFAULT 'native';
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS request_path        TEXT;
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS request_method      VARCHAR(10);
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS ip_address          VARCHAR(45);
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS user_agent          TEXT;
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS session_id          VARCHAR(128);
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS delegation_chain    JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE platform_dauth.authz_decision_log ADD COLUMN IF NOT EXISTS sod_check_result    JSONB DEFAULT '{}'::jsonb;
END $$;

-- Hot read path: divergence-report scans by decided_at window.
CREATE INDEX IF NOT EXISTS authz_decision_log_decided_at_idx
  ON platform_dauth.authz_decision_log (decided_at DESC);

-- Tenant-scoped queries.
CREATE INDEX IF NOT EXISTS authz_decision_log_tenant_decided_at_idx
  ON platform_dauth.authz_decision_log (tenant_id, decided_at DESC);

-- Decision lookup by uuid (replay/explain).
CREATE UNIQUE INDEX IF NOT EXISTS authz_decision_log_decision_id_uq
  ON platform_dauth.authz_decision_log (decision_id);

GRANT USAGE ON SCHEMA platform_dauth TO
  dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway, dos_notification, dos_tenant, dos_ai;

GRANT SELECT, INSERT, UPDATE, DELETE ON platform_dauth.authz_decision_log TO
  dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway, dos_notification, dos_tenant, dos_ai;

-- ── 3. config_values covering index ──────────────────────────────────
CREATE INDEX IF NOT EXISTS config_values_definition_scope_active_idx
  ON dos.config_values (definition_id, scope_type, is_active);
