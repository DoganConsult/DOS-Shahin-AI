-- ═══════════════════════════════════════════════════════════════════════
-- 011_dauth_enterprise_ledger.sql
--
-- DAuth Enterprise decision-ledger reconcile (closes P1-13).
--
-- Extends the existing dos.authz_decision_log (created by
-- 009_dauth_missing_tables.sql with column shape: id, tenant_id, user_id,
-- action, entity_type/id, scope_type/id, allowed, reason, authority,
-- delegated, duration_ms, event_type, actor_id, target_id, detail,
-- decided_at, request_path, request_method, ip_address, user_agent,
-- session_id, delegation_chain, sod_check_result, evaluation_steps) with
-- the Part 1–6 enterprise columns:
--   decision_id  uuid  — uuidv7 when available, gen_random_uuid() fallback
--   correlation_id text
--   reason_code  text
--   reason_codes text[]
--   policy_version text
--   model_version text
--   engine_results jsonb
--   obligations    jsonb
-- Adds indexes for replay/audit queries and an append-only trigger that
-- rejects UPDATE/DELETE from any role except the dedicated maintenance
-- role `dauth_ledger_maintainer`.
--
-- Additive only. No DROP. No data loss. Idempotent (IF NOT EXISTS + DO
-- blocks that guard triggers/functions).
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

DO $outer$
DECLARE
  has_uuidv7 boolean;
  default_expr text;
BEGIN
  ---------------------------------------------------------------------------
  -- 0. Target table must exist (created by 009_dauth_missing_tables.sql).
  ---------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'dos' AND table_name = 'authz_decision_log'
  ) THEN
    RAISE NOTICE 'skip 011: dos.authz_decision_log does not exist yet (009 must run first)';
    RETURN;
  END IF;

  ---------------------------------------------------------------------------
  -- 1. Additive columns. Safe defaults so INSERTs that omit them still work.
  ---------------------------------------------------------------------------
  -- decision_id is a secondary, uuidv7-ordered identifier used by the DAuth
  -- port layer's explainDecision/replayDecision services. Nullable so
  -- historical rows don't need a retroactive value; Phase-2+ writers always
  -- populate it.
  ALTER TABLE dos.authz_decision_log
    ADD COLUMN IF NOT EXISTS decision_id    uuid;
  ALTER TABLE dos.authz_decision_log
    ADD COLUMN IF NOT EXISTS correlation_id text;
  ALTER TABLE dos.authz_decision_log
    ADD COLUMN IF NOT EXISTS reason_code    text;
  ALTER TABLE dos.authz_decision_log
    ADD COLUMN IF NOT EXISTS reason_codes   text[] NOT NULL DEFAULT '{}';
  ALTER TABLE dos.authz_decision_log
    ADD COLUMN IF NOT EXISTS policy_version text;
  ALTER TABLE dos.authz_decision_log
    ADD COLUMN IF NOT EXISTS model_version  text;
  ALTER TABLE dos.authz_decision_log
    ADD COLUMN IF NOT EXISTS engine_results jsonb  NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE dos.authz_decision_log
    ADD COLUMN IF NOT EXISTS obligations    jsonb  NOT NULL DEFAULT '{}'::jsonb;

  ---------------------------------------------------------------------------
  -- 2. Set DEFAULT on decision_id to uuidv7() when available, else fallback
  --    to gen_random_uuid(). The validator DB may be on PG < 18 where uuidv7
  --    doesn't exist; the migration must not fail in that case.
  ---------------------------------------------------------------------------
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'uuidv7' AND n.nspname = 'pg_catalog'
  ) INTO has_uuidv7;

  IF has_uuidv7 THEN
    default_expr := 'uuidv7()';
  ELSE
    default_expr := 'gen_random_uuid()';
  END IF;
  EXECUTE format(
    'ALTER TABLE dos.authz_decision_log ALTER COLUMN decision_id SET DEFAULT %s',
    default_expr
  );

  -- Backfill decision_id for any existing row where it is still NULL.
  UPDATE dos.authz_decision_log
     SET decision_id = gen_random_uuid()
   WHERE decision_id IS NULL;

  -- Now enforce NOT NULL.
  ALTER TABLE dos.authz_decision_log
    ALTER COLUMN decision_id SET NOT NULL;

  ---------------------------------------------------------------------------
  -- 3. Indexes for replay/audit queries.
  ---------------------------------------------------------------------------
  CREATE UNIQUE INDEX IF NOT EXISTS ux_authz_decision_log_decision_id
    ON dos.authz_decision_log (decision_id);
  CREATE INDEX IF NOT EXISTS idx_authz_decision_log_correlation
    ON dos.authz_decision_log (correlation_id)
    WHERE correlation_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_authz_decision_log_reason_code
    ON dos.authz_decision_log (reason_code)
    WHERE reason_code IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_authz_decision_log_reason_codes
    ON dos.authz_decision_log USING GIN (reason_codes);
  CREATE INDEX IF NOT EXISTS idx_authz_decision_log_policy_version
    ON dos.authz_decision_log (policy_version)
    WHERE policy_version IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_authz_decision_log_model_version
    ON dos.authz_decision_log (model_version)
    WHERE model_version IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_authz_decision_log_engine_results
    ON dos.authz_decision_log USING GIN (engine_results);

  ---------------------------------------------------------------------------
  -- 4. Append-only trigger. Rejects UPDATE/DELETE unless the acting role is
  --    the dedicated maintenance role `dauth_ledger_maintainer`. The role
  --    is NOT created by this migration — it's created (and granted) by the
  --    retention runbook only when a retention job is scheduled. Until
  --    then, the ledger is strictly append-only from every role.
  ---------------------------------------------------------------------------
  CREATE OR REPLACE FUNCTION dos.reject_mutation_authz_decision_log()
  RETURNS trigger AS $fn$
  BEGIN
    IF current_user <> 'dauth_ledger_maintainer' THEN
      RAISE EXCEPTION 'authz_decision_log is append-only (attempted % by %)',
        TG_OP, current_user
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NULL;
  END
  $fn$ LANGUAGE plpgsql;

  -- Drop + recreate so the trigger picks up any function body change.
  DROP TRIGGER IF EXISTS trg_authz_decision_log_append_only
    ON dos.authz_decision_log;
  CREATE TRIGGER trg_authz_decision_log_append_only
    BEFORE UPDATE OR DELETE ON dos.authz_decision_log
    FOR EACH ROW EXECUTE FUNCTION dos.reject_mutation_authz_decision_log();

  RAISE NOTICE '011_dauth_enterprise_ledger: applied (uuidv7_available=%, default=%)',
    has_uuidv7, default_expr;
END
$outer$;

COMMIT;
