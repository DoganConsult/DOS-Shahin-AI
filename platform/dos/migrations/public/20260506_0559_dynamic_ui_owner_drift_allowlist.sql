-- 20260506_0559_dynamic_ui_owner_drift_allowlist.sql
-- MIGRATION_OWNER_DRIFT_BUNDLE — explicit allowlist.
--
-- Context:
--   The pending migration 20260506_0560_dynamic_ui_route_metadata.sql
--   performs CREATE INDEX IF NOT EXISTS and INSERT ... ON CONFLICT
--   DO UPDATE on dos.dynamic_ui_route_metadata. On this database that
--   table exists but is owned by dos_auth, so when the runner connects
--   as dos_migrator the operation fails with SQLSTATE 42501
--   (must be owner of table dynamic_ui_route_metadata).
--
-- Allowlist (proven required by pending migration SQL):
--   1) dos.dynamic_ui_route_metadata     dos_auth -> dos_migrator
--
-- Doctrine:
--   - Allowlist is closed; objects are added ONLY when a pending
--     migration's SQL proves the object is required.
--   - No schema-wide ownership sweep.
--   - No name-pattern matching (no LIKE 'dynamic_%', no regex).
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
--   created dos.dynamic_ui_route_metadata is tracked separately so
--   future fresh databases produce dos_migrator ownership
--   deterministically.

BEGIN;

-- ---------------------------------------------------------------------
-- Allowlist entry 1/1: dos.dynamic_ui_route_metadata
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
     AND c.relname = 'dynamic_ui_route_metadata'
     AND c.relkind = 'r';

  IF current_owner IS NULL THEN
    RAISE EXCEPTION
      'dos.dynamic_ui_route_metadata is missing; the migration that '
      'creates this table has not been applied. Refusing to silently '
      'create or skip.';
  ELSIF current_owner = 'dos_migrator' THEN
    RAISE NOTICE
      'dos.dynamic_ui_route_metadata already owned by dos_migrator; no-op.';
  ELSE
    EXECUTE 'ALTER TABLE dos.dynamic_ui_route_metadata OWNER TO dos_migrator';
    RAISE NOTICE
      'dos.dynamic_ui_route_metadata owner % -> dos_migrator', current_owner;
  END IF;
END
$$;

COMMIT;
