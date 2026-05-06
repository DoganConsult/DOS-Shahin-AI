-- 20260508_0099b_tenant_security_policy_owner_drift_allowlist.sql
-- MIGRATION_OWNER_DRIFT_BUNDLE — explicit allowlist (auth/MFA wave, follow-up).
--
-- Filename ordering:
--   '20260508_0099_'  < '20260508_0099b_' < '20260508_0100_'
--   guaranteeing this remediation runs after 0099 and before 0100.
--
-- Context:
--   Pending migration 20260508_0100_auth_mfa_otp_table.sql emits
--   `CREATE TABLE IF NOT EXISTS dos.tenant_security_policy (...)`.
--   On this database the table already exists owned by dos_auth, so
--   even though the statement is a logical no-op the runner connecting
--   as dos_migrator fails at 0100 with SQLSTATE 42501
--   (must be owner of table tenant_security_policy). Runtime-proven by
--   the previous runner pass; not a speculative addition.
--
-- Allowlist (proven required by pending migration SQL + runtime):
--   1) dos.tenant_security_policy   dos_auth -> dos_migrator
--
-- Doctrine:
--   - Allowlist is closed; objects are added ONLY when a pending
--     migration's SQL proves the object is required.
--   - No schema-wide ownership sweep.
--   - No name-pattern matching.
--   - No manual writes to dos.platform_migrations.
--   - No skip / fake-green behavior.
--   - Idempotent: no-op if already owned by dos_migrator.
--   - Loud failure if the table is missing (prerequisite drift).
--
-- Execution:
--   Must be executed by a role that is a member of the current owner
--   (dos_auth) or by a superuser. Running solely as dos_migrator
--   without inherited dos_auth membership will fail with 42501 and
--   MUST be reported, not auto-skipped.
--
-- Follow-up (NOT part of this migration):
--   Root-cause baseline rewrite (4b) of the migration that originally
--   created dos.tenant_security_policy is tracked separately so future
--   fresh databases produce dos_migrator ownership deterministically.

BEGIN;

-- ---------------------------------------------------------------------
-- Allowlist entry 1/1: dos.tenant_security_policy
-- ---------------------------------------------------------------------
DO $$
DECLARE
  current_owner text;
BEGIN
  SELECT pg_get_userbyid(c.relowner)
    INTO current_owner
    FROM pg_class      c
    JOIN pg_namespace  n ON n.oid = c.relnamespace
   WHERE n.nspname = 'dos'
     AND c.relname = 'tenant_security_policy'
     AND c.relkind = 'r';

  IF current_owner IS NULL THEN
    RAISE EXCEPTION
      'dos.tenant_security_policy is missing; the migration that '
      'creates this table has not been applied. Refusing to silently '
      'create or skip.';
  ELSIF current_owner = 'dos_migrator' THEN
    RAISE NOTICE
      'dos.tenant_security_policy already owned by dos_migrator; no-op.';
  ELSE
    EXECUTE 'ALTER TABLE dos.tenant_security_policy OWNER TO dos_migrator';
    RAISE NOTICE
      'dos.tenant_security_policy owner % -> dos_migrator', current_owner;
  END IF;
END
$$;

COMMIT;
