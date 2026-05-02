BEGIN;
-- ═══════════════════════════════════════════════════════════════════
-- DOS Platform — Expand authz_decision_log for audit-grade logging
--
-- Adds structured columns for full DAuth decision context:
--   request_path, request_method, ip_address, user_agent, session_id,
--   delegation_chain, sod_check_result, evaluation_steps
--
-- Previously these were partially stored in record_context JSONB.
-- Dedicated columns enable efficient indexing and compliance queries.
--
-- Phase 3A: dos.authz_decision_log is created by auth-service migration
-- 009_dauth_missing_tables.sql which runs AFTER this file in sort order.
-- We guard every ALTER/INDEX behind an IF EXISTS check so we no-op on
-- first pass (fresh DB) and then apply cleanly on a second run after
-- 009 has created the table. To make a single-pass run succeed, we also
-- invoke the expansion inline at the end of 009 via ALTER IF NOT EXISTS
-- — see 009_dauth_missing_tables.sql.
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'dos' AND table_name = 'authz_decision_log'
  ) THEN
    RAISE NOTICE 'skip 002_expand_authz_decision_log: dos.authz_decision_log does not exist yet';
    RETURN;
  END IF;

  -- Request context
  ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS request_path TEXT;
  ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS request_method VARCHAR(10);
  ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
  ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS user_agent TEXT;
  ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS session_id VARCHAR(128);

  -- DAuth evaluation chain
  ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS delegation_chain JSONB DEFAULT '[]';
  ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS sod_check_result  JSONB DEFAULT '{}';
  ALTER TABLE dos.authz_decision_log ADD COLUMN IF NOT EXISTS evaluation_steps  JSONB DEFAULT '[]';

  -- Indexes for compliance queries
  CREATE INDEX IF NOT EXISTS idx_authz_decision_log_ip      ON dos.authz_decision_log (ip_address)    WHERE ip_address   IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_authz_decision_log_session ON dos.authz_decision_log (session_id)    WHERE session_id   IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_authz_decision_log_path    ON dos.authz_decision_log (request_path)  WHERE request_path IS NOT NULL;
END $$;

COMMIT;
