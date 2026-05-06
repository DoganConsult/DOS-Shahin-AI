-- 20260508_0199_platform_secrets_owner_drift_allowlist.sql
-- MIGRATION_OWNER_DRIFT_BUNDLE — explicit allowlist (platform_secrets wave).
--
-- Filename ordering:
--   '20260508_0199_' < '20260508_0200_'
--   guaranteeing this remediation runs immediately before 0200.
--
-- Context:
--   Pending migration 20260508_0200_platform_secrets.sql operates on
--   two pre-existing dos.* tables that are currently owned by dos_auth.
--   The runner connecting as dos_migrator failed at 0200 with
--   SQLSTATE 42501 (must be owner of table platform_secret_definition);
--   subsequent owner-required statements in the same migration also
--   target dos.platform_secret. Both are explicit, named, single-object
--   references in the SQL of 0200.
--
-- Allowlist (closed, derived literally from 0200):
--   1) dos.platform_secret_definition  dos_auth -> dos_migrator
--      Touched by:
--        - CREATE TABLE IF NOT EXISTS  (revalidates against existing relation)
--        - INSERT ... ON CONFLICT (secret_key) DO UPDATE SET ...
--      Status: runtime-proven blocked (42501).
--
--   2) dos.platform_secret             dos_auth -> dos_migrator
--      Touched by:
--        - CREATE TABLE IF NOT EXISTS  (with REFERENCES platform_secret_definition)
--        - CREATE UNIQUE INDEX IF NOT EXISTS ux_platform_secret_key_scope
--        - CREATE INDEX IF NOT EXISTS ix_platform_secret_tenant
--      Status: owner-required DDL (CREATE INDEX) on existing table.
--
-- Doctrine:
--   - Allowlist is closed; only the two objects literally named in 0200
--     are included.
--   - No schema-wide ownership sweep.
--   - No LIKE / regex / name-pattern matching (no `secret_%`, no
--     `platform_%`).
--   - No other auth/tenant objects.
--   - No manual writes to dos.platform_migrations.
--   - No skip / fake-green behavior.
--   - Each entry is independently idempotent: no-op if already owned
--     by dos_migrator.
--   - Loud failure if either listed table is missing (prerequisite drift).
--
-- Execution:
--   Must be executed by a role that is a member of each current owner
--   (dos_auth) or by a superuser. Running solely as dos_migrator
--   without inherited dos_auth membership will fail with 42501 and
--   MUST be reported, not auto-skipped.
--
-- Follow-up (NOT part of this migration):
--   Root-cause baseline rewrite (4b) of the migration that originally
--   created these tables is tracked separately so future fresh
--   databases produce dos_migrator ownership deterministically.

BEGIN;

-- ---------------------------------------------------------------------
-- Allowlist entry 1/2: dos.platform_secret_definition
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
     AND c.relname = 'platform_secret_definition'
     AND c.relkind = 'r';

  IF current_owner IS NULL THEN
    RAISE EXCEPTION
      'dos.platform_secret_definition is missing; the migration that '
      'creates this table has not been applied. Refusing to silently '
      'create or skip.';
  ELSIF current_owner = 'dos_migrator' THEN
    RAISE NOTICE
      'dos.platform_secret_definition already owned by dos_migrator; no-op.';
  ELSE
    EXECUTE 'ALTER TABLE dos.platform_secret_definition OWNER TO dos_migrator';
    RAISE NOTICE
      'dos.platform_secret_definition owner % -> dos_migrator', current_owner;
  END IF;
END
$$;

-- ---------------------------------------------------------------------
-- Allowlist entry 2/2: dos.platform_secret
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
     AND c.relname = 'platform_secret'
     AND c.relkind = 'r';

  IF current_owner IS NULL THEN
    RAISE EXCEPTION
      'dos.platform_secret is missing; the migration that creates this '
      'table has not been applied. Refusing to silently create or skip.';
  ELSIF current_owner = 'dos_migrator' THEN
    RAISE NOTICE
      'dos.platform_secret already owned by dos_migrator; no-op.';
  ELSE
    EXECUTE 'ALTER TABLE dos.platform_secret OWNER TO dos_migrator';
    RAISE NOTICE
      'dos.platform_secret owner % -> dos_migrator', current_owner;
  END IF;
END
$$;

COMMIT;
