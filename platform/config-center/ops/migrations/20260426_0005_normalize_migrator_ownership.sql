-- Make dos_migrator the canonical owner of every schema and object that
-- the unified migration runner (ops/scripts/run-migrations.sh) is meant
-- to manage. Today's audit discovered organic ownership drift:
--
--   dos schema: owner=dos_user; 67 tables owned by dos_migrator,
--               1 by dos_user, 16 by postgres
--   platform_dauth: owner=postgres; 7 by dos_migrator, 28 by postgres,
--               1 by dos_auth, 1 by shahin
--
-- Result: ALTER TABLE / CREATE TABLE migrations submitted by
-- dos_migrator hit "permission denied for schema dos" / "must be owner
-- of relation X" and have to be applied via psql as the postgres
-- superuser, bypassing dos.schema_migrations tracking. That's a
-- production audit hole.
--
-- Fix: reassign schema + table ownership to dos_migrator. Sequences,
-- views, indexes, and constraints follow their parent table. The
-- runtime service roles (dos_auth, dos_user, …) keep DML privileges
-- via their existing GRANTs (re-applied below for safety).
--
-- Idempotent — uses information_schema lookups + IF NOT EXISTS GRANTs.
-- Up-only — ownership changes do not touch data.

DO $$
DECLARE
  r record;
BEGIN
  -- 1. Schemas
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'dos') THEN
    EXECUTE 'ALTER SCHEMA dos OWNER TO dos_migrator';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'platform_dauth') THEN
    EXECUTE 'ALTER SCHEMA platform_dauth OWNER TO dos_migrator';
  END IF;

  -- 2. Tables
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname IN ('dos','platform_dauth')
      AND tableowner <> 'dos_migrator'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I OWNER TO dos_migrator', r.schemaname, r.tablename);
  END LOOP;

  -- 3. Sequences (some pre-existing tables had sequences owned by other roles)
  FOR r IN
    SELECT n.nspname AS schemaname, c.relname AS seqname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles ro ON ro.oid = c.relowner
    WHERE c.relkind = 'S'
      AND n.nspname IN ('dos','platform_dauth')
      AND ro.rolname <> 'dos_migrator'
  LOOP
    EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO dos_migrator', r.schemaname, r.seqname);
  END LOOP;

  -- 4. Views
  FOR r IN
    SELECT schemaname, viewname
    FROM pg_views
    WHERE schemaname IN ('dos','platform_dauth')
      AND viewowner <> 'dos_migrator'
  LOOP
    EXECUTE format('ALTER VIEW %I.%I OWNER TO dos_migrator', r.schemaname, r.viewname);
  END LOOP;
END $$;

-- Re-apply runtime DML grants so service roles keep their working
-- access after the ownership change (PG strips object-level GRANTs
-- when ownership is transferred? No — GRANTs persist across ALTER OWNER.
-- These are belt-and-suspenders; idempotent.)
GRANT USAGE ON SCHEMA dos, platform_dauth TO
  dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway,
  dos_notification, dos_tenant, dos_ai;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA dos TO
  dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway,
  dos_notification, dos_tenant, dos_ai;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA platform_dauth TO
  dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway,
  dos_notification, dos_tenant, dos_ai;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA dos TO
  dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway,
  dos_notification, dos_tenant, dos_ai;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA platform_dauth TO
  dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway,
  dos_notification, dos_tenant, dos_ai;

-- Future tables created by dos_migrator: auto-grant DML to service roles.
ALTER DEFAULT PRIVILEGES FOR ROLE dos_migrator IN SCHEMA dos
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO
  dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway,
  dos_notification, dos_tenant, dos_ai;

ALTER DEFAULT PRIVILEGES FOR ROLE dos_migrator IN SCHEMA platform_dauth
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO
  dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway,
  dos_notification, dos_tenant, dos_ai;

ALTER DEFAULT PRIVILEGES FOR ROLE dos_migrator IN SCHEMA dos
  GRANT USAGE, SELECT ON SEQUENCES TO
  dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway,
  dos_notification, dos_tenant, dos_ai;

ALTER DEFAULT PRIVILEGES FOR ROLE dos_migrator IN SCHEMA platform_dauth
  GRANT USAGE, SELECT ON SEQUENCES TO
  dos_user, dos_workflow, dos_audit, dos_auth, dos_gateway,
  dos_notification, dos_tenant, dos_ai;
