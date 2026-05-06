-- 20260506_0531_ui_override_product_owner_to_migrator.sql
-- REMEDIATION (single-object, allowlisted).
--
-- Context:
--   dos.ui_override_product was created by
--   20260505_0400_ui_override_layers.sql without an explicit
--   ALTER TABLE ... OWNER TO dos_migrator. On this database the
--   row landed under dos_auth instead of the canonical dos_migrator
--   role, blocking 20260506_0530_workspace_home_strip_demo_props.sql
--   with SQLSTATE 42501 (permission denied for table ui_override_product).
--
-- Scope (intentionally narrow):
--   Schema  : dos
--   Object  : ui_override_product (table, relkind 'r')
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
--   This migration must be executed by a role that is a member of
--   the current owner (dos_auth) or a superuser. Running solely as
--   dos_migrator without inherited dos_auth membership will fail
--   with 42501 and MUST be reported, not auto-skipped.
--
-- Follow-up (NOT part of this migration):
--   Root-cause patch of 20260505_0400_ui_override_layers.sql is tracked
--   separately as the "4b baseline follow-up" so future fresh databases
--   create dos.ui_override_product owned by dos_migrator deterministically.

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
     AND c.relname = 'ui_override_product'
     AND c.relkind = 'r';

  IF current_owner IS NULL THEN
    RAISE EXCEPTION
      'dos.ui_override_product is missing; prerequisite migration '
      '20260505_0400_ui_override_layers.sql has not been applied. '
      'Refusing to silently create or skip.';
  ELSIF current_owner = 'dos_migrator' THEN
    RAISE NOTICE
      'dos.ui_override_product already owned by dos_migrator; no-op.';
  ELSE
    EXECUTE 'ALTER TABLE dos.ui_override_product OWNER TO dos_migrator';
    RAISE NOTICE
      'dos.ui_override_product owner % -> dos_migrator', current_owner;
  END IF;
END
$$;

COMMIT;
