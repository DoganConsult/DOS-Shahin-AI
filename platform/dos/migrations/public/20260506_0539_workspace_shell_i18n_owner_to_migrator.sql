-- 20260506_0539_workspace_shell_i18n_owner_to_migrator.sql
-- REMEDIATION (single-object, allowlisted).
--
-- Context:
--   dos.workspace_shell_i18n was created by an earlier migration that
--   did not emit an explicit ALTER TABLE ... OWNER TO dos_migrator.
--   On this database the row landed under dos_auth instead of the
--   canonical dos_migrator role, blocking
--   20260506_0540_workspace_home_i18n_keys.sql with SQLSTATE 42501
--   (permission denied for table workspace_shell_i18n) when run as
--   dos_migrator.
--
-- Scope (intentionally narrow):
--   Schema  : dos
--   Object  : workspace_shell_i18n (table, relkind 'r')
--   From    : dos_auth (observed)
--   To      : dos_migrator (canonical)
--
-- Doctrine:
--   - Single object only. No schema-wide ownership sweep.
--   - No name-pattern matching. No mass ALTER OWNER.
--   - No manual writes to dos.platform_migrations.
--   - No skip / fake-green behavior.
--   - Idempotent: no-op if already owned by dos_migrator.
--   - Loud failure if the table does not exist (missing prerequisite).
--
-- Execution:
--   This migration must be executed by a role that is a member of the
--   current owner (dos_auth) or a superuser. Running solely as
--   dos_migrator without inherited dos_auth membership will fail with
--   42501 and MUST be reported, not auto-skipped.
--
-- Follow-up (NOT part of this migration):
--   Root-cause baseline rewrite (4b) of the migration that originally
--   created dos.workspace_shell_i18n is tracked separately so future
--   fresh databases produce dos_migrator ownership deterministically.

BEGIN;

DO $$
DECLARE
  current_owner text;
BEGIN
  SELECT pg_get_userbyid(c.relowner)
    INTO current_owner
    FROM pg_class      c
    JOIN pg_namespace  n ON n.oid = c.relnamespace
   WHERE n.nspname = 'dos'
     AND c.relname = 'workspace_shell_i18n'
     AND c.relkind = 'r';

  IF current_owner IS NULL THEN
    RAISE EXCEPTION
      'dos.workspace_shell_i18n is missing; the migration that creates '
      'this table has not been applied. Refusing to silently create or skip.';
  ELSIF current_owner = 'dos_migrator' THEN
    RAISE NOTICE
      'dos.workspace_shell_i18n already owned by dos_migrator; no-op.';
  ELSE
    EXECUTE 'ALTER TABLE dos.workspace_shell_i18n OWNER TO dos_migrator';
    RAISE NOTICE
      'dos.workspace_shell_i18n owner % -> dos_migrator', current_owner;
  END IF;
END
$$;

COMMIT;
