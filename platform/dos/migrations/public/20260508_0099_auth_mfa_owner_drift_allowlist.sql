-- 20260508_0099_auth_mfa_owner_drift_allowlist.sql
-- MIGRATION_OWNER_DRIFT_BUNDLE — explicit allowlist (auth/MFA wave).
--
-- Context:
--   The pending migration 20260508_0100_auth_mfa_otp_table.sql emits
--   `CREATE INDEX IF NOT EXISTS ix_auth_mfa_otp_user_sent` and
--   `CREATE INDEX IF NOT EXISTS ix_auth_mfa_otp_active` on the
--   pre-existing dos.auth_mfa_otp table. CREATE INDEX on an existing
--   table requires table ownership; the table is currently owned by
--   dos_auth, so the runner connecting as dos_migrator fails with
--   SQLSTATE 42501 (must be owner of table auth_mfa_otp).
--
-- Allowlist (proven required by pending migration SQL):
--   1) dos.auth_mfa_otp           dos_auth -> dos_migrator
--
-- Explicitly EXCLUDED from this allowlist:
--   - dos.tenant_security_policy
--     0100 only emits `CREATE TABLE IF NOT EXISTS` against this table.
--     On the pre-existing table that statement is a silent no-op and
--     does not require ownership. Not proven blocked. If a later
--     migration mutates it and is blocked, a future single-object
--     allowlist entry will be opened — never preemptively.
--
-- Doctrine:
--   - Allowlist is closed; objects are added ONLY when a pending
--     migration's SQL proves the object is required.
--   - No schema-wide ownership sweep.
--   - No name-pattern matching (no LIKE 'auth_%', no regex).
--   - No manual writes to dos.platform_migrations.
--   - No skip / fake-green behavior.
--   - Each entry is independently idempotent: no-op if already owned
--     by dos_migrator.
--   - Loud failure if a listed table is missing (prerequisite drift).
--
-- Execution:
--   Must be executed by a role that is a member of each current owner
--   (dos_auth) or by a superuser. Running solely as dos_migrator
--   without inherited dos_auth membership will fail with 42501 and
--   MUST be reported, not auto-skipped.
--
-- Follow-up (NOT part of this migration):
--   Root-cause baseline rewrite (4b) of the migration that originally
--   created dos.auth_mfa_otp is tracked separately so future fresh
--   databases produce dos_migrator ownership deterministically.

BEGIN;

-- ---------------------------------------------------------------------
-- Allowlist entry 1/1: dos.auth_mfa_otp
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
     AND c.relname = 'auth_mfa_otp'
     AND c.relkind = 'r';

  IF current_owner IS NULL THEN
    RAISE EXCEPTION
      'dos.auth_mfa_otp is missing; the migration that creates this '
      'table has not been applied. Refusing to silently create or skip.';
  ELSIF current_owner = 'dos_migrator' THEN
    RAISE NOTICE
      'dos.auth_mfa_otp already owned by dos_migrator; no-op.';
  ELSE
    EXECUTE 'ALTER TABLE dos.auth_mfa_otp OWNER TO dos_migrator';
    RAISE NOTICE
      'dos.auth_mfa_otp owner % -> dos_migrator', current_owner;
  END IF;
END
$$;

COMMIT;
