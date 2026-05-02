-- 20260425_0010_consolidate_decision_logs.sql
-- Phase E of the 5-brain cleanup
-- (plan: /root/.claude/plans/need-to-clean-the-swift-trinket.md)
--
-- The DAuth design freeze (table-classification.ts §6.6) flags four
-- decision-log tables and names `authz_decision_log` as the canonical
-- Law-1 target. Three legacy tables — authorization_decision_log,
-- guard_decision_log, policy_decision_log — were ear-marked for merge.
--
-- Audit on 2026-04-25 confirmed that NONE of the legacy tables physically
-- exist in the repo's CREATE TABLE migrations or in the live `shahin_grc`
-- DB. The canonical `dos.authz_decision_log` and `__TENANT_SCHEMA__.authz_decision_log`
-- are the only physical decision logs.
--
-- This migration therefore:
--   (1) Ensures the canonical `__TENANT_SCHEMA__.authz_decision_log`
--       exists in every tenant schema with the full shape from
--       009_dauth_missing_tables.sql (per-tenant copy).
--   (2) Adds a `source` column so that any future ingest from a legacy
--       writer can preserve provenance without table proliferation.
--   (3) Creates VIEWs with the legacy names (authorization_decision_log,
--       guard_decision_log, policy_decision_log) that SELECT from the
--       canonical, filtered by `source`. These views satisfy any code
--       that still references the legacy names without re-introducing
--       physical drift.
--
-- Idempotent. Safe to re-run. Up-only — no destructive operations because
-- there is no data to drop.

-- ── 1. Canonical per-tenant table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "__TENANT_SCHEMA__".authz_decision_log (
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
  -- Phase 3A audit-grade columns (mirrors 002_expand_authz_decision_log.sql)
  request_path        TEXT,
  request_method      VARCHAR(10),
  ip_address          VARCHAR(45),
  user_agent          TEXT,
  session_id          VARCHAR(128),
  delegation_chain    JSONB DEFAULT '[]'::jsonb,
  sod_check_result    JSONB DEFAULT '{}'::jsonb,
  -- Phase E provenance column — identifies which engine/path produced the row.
  -- Default 'native' = the dauth-core 14-step pipeline. Future writes from
  -- legacy paths (if they reappear) carry 'authorization' | 'guard' | 'policy'.
  source              VARCHAR(20) NOT NULL DEFAULT 'native'
);

ALTER TABLE "__TENANT_SCHEMA__".authz_decision_log
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'native';
ALTER TABLE "__TENANT_SCHEMA__".authz_decision_log
  ADD COLUMN IF NOT EXISTS request_path     TEXT;
ALTER TABLE "__TENANT_SCHEMA__".authz_decision_log
  ADD COLUMN IF NOT EXISTS request_method   VARCHAR(10);
ALTER TABLE "__TENANT_SCHEMA__".authz_decision_log
  ADD COLUMN IF NOT EXISTS ip_address       VARCHAR(45);
ALTER TABLE "__TENANT_SCHEMA__".authz_decision_log
  ADD COLUMN IF NOT EXISTS user_agent       TEXT;
ALTER TABLE "__TENANT_SCHEMA__".authz_decision_log
  ADD COLUMN IF NOT EXISTS session_id       VARCHAR(128);
ALTER TABLE "__TENANT_SCHEMA__".authz_decision_log
  ADD COLUMN IF NOT EXISTS delegation_chain JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "__TENANT_SCHEMA__".authz_decision_log
  ADD COLUMN IF NOT EXISTS sod_check_result JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_authz_decision_log_tenant
  ON "__TENANT_SCHEMA__".authz_decision_log (tenant_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_authz_decision_log_user
  ON "__TENANT_SCHEMA__".authz_decision_log (user_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_authz_decision_log_action
  ON "__TENANT_SCHEMA__".authz_decision_log (action);
CREATE INDEX IF NOT EXISTS idx_authz_decision_log_source
  ON "__TENANT_SCHEMA__".authz_decision_log (source, decided_at DESC);

-- ── 2. Backfill source for any existing rows ─────────────────────────
UPDATE "__TENANT_SCHEMA__".authz_decision_log
   SET source = 'native'
 WHERE source IS NULL OR source = '';

-- ── 3. Legacy-name compatibility views ───────────────────────────────
-- Any code that still imports authorization_decision_log / guard_decision_log /
-- policy_decision_log resolves through these views to the canonical table.
-- The audit on 2026-04-25 found ZERO live writers; views are kept as a
-- forward-compat hook so the consolidation is enforced rather than
-- merely documented.
CREATE OR REPLACE VIEW "__TENANT_SCHEMA__".authorization_decision_log AS
SELECT id, tenant_id, user_id, action AS permission_code, allowed AS granted,
       reason, decided_at AS recorded_at
  FROM "__TENANT_SCHEMA__".authz_decision_log
 WHERE source IN ('authorization', 'native');

CREATE OR REPLACE VIEW "__TENANT_SCHEMA__".guard_decision_log AS
SELECT id, tenant_id, user_id,
       COALESCE(event_type, action) AS guard_name,
       allowed AS result,
       duration_ms,
       detail AS details,
       decided_at AS recorded_at
  FROM "__TENANT_SCHEMA__".authz_decision_log
 WHERE source IN ('guard', 'native');

CREATE OR REPLACE VIEW "__TENANT_SCHEMA__".policy_decision_log AS
SELECT id, tenant_id, user_id,
       action AS action_code,
       entity_type, entity_id,
       allowed,
       reason,
       authority,
       decided_at
  FROM "__TENANT_SCHEMA__".authz_decision_log
 WHERE source IN ('policy', 'native');

-- ── 4. Defensive guard: warn if a legacy physical table appears ───────
-- (cannot ALTER inside a function-less script; deliberately just a NOTICE.
-- A drift-detection job runs periodically — see ops/scripts/drift-monitor.sh)
DO $$
DECLARE
  legacy TEXT[] := ARRAY['authorization_decision_log_phys',
                         'guard_decision_log_phys',
                         'policy_decision_log_phys'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY legacy LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables
       WHERE schemaname = '__TENANT_SCHEMA__' AND tablename = t
    ) THEN
      RAISE NOTICE
        'Phase E drift: physical table __TENANT_SCHEMA__.% should not exist; consolidate into authz_decision_log',
        t;
    END IF;
  END LOOP;
END$$;
