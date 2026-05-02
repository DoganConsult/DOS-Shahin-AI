-- Rollback for 011_dauth_enterprise_ledger.sql
--
-- Drops the append-only trigger + function, drops the DAuth-ECP indexes,
-- clears the decision_id DEFAULT, and drops the additive columns.
--
-- The legacy columns created by 009_dauth_missing_tables.sql / 002_expand
-- are preserved. Existing rows in dos.authz_decision_log are preserved.

BEGIN;

DO $outer$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'dos' AND table_name = 'authz_decision_log'
  ) THEN
    RETURN;
  END IF;

  DROP TRIGGER IF EXISTS trg_authz_decision_log_append_only
    ON dos.authz_decision_log;
  DROP FUNCTION IF EXISTS dos.reject_mutation_authz_decision_log();

  DROP INDEX IF EXISTS dos.ux_authz_decision_log_decision_id;
  DROP INDEX IF EXISTS dos.idx_authz_decision_log_correlation;
  DROP INDEX IF EXISTS dos.idx_authz_decision_log_reason_code;
  DROP INDEX IF EXISTS dos.idx_authz_decision_log_reason_codes;
  DROP INDEX IF EXISTS dos.idx_authz_decision_log_policy_version;
  DROP INDEX IF EXISTS dos.idx_authz_decision_log_model_version;
  DROP INDEX IF EXISTS dos.idx_authz_decision_log_engine_results;

  ALTER TABLE dos.authz_decision_log
    ALTER COLUMN decision_id DROP DEFAULT,
    ALTER COLUMN decision_id DROP NOT NULL;

  ALTER TABLE dos.authz_decision_log DROP COLUMN IF EXISTS decision_id;
  ALTER TABLE dos.authz_decision_log DROP COLUMN IF EXISTS correlation_id;
  ALTER TABLE dos.authz_decision_log DROP COLUMN IF EXISTS reason_code;
  ALTER TABLE dos.authz_decision_log DROP COLUMN IF EXISTS reason_codes;
  ALTER TABLE dos.authz_decision_log DROP COLUMN IF EXISTS policy_version;
  ALTER TABLE dos.authz_decision_log DROP COLUMN IF EXISTS model_version;
  ALTER TABLE dos.authz_decision_log DROP COLUMN IF EXISTS engine_results;
  ALTER TABLE dos.authz_decision_log DROP COLUMN IF EXISTS obligations;
END
$outer$;

COMMIT;
