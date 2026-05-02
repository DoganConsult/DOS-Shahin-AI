-- Step 3B — Ownership normalization for tenant_f2a45bc25f31
-- Run as postgres superuser:
--   sudo -u postgres psql -d shahin_grc -v ON_ERROR_STOP=1 \
--     -f ops/scripts/superuser/3B_normalize_ownership_tenant_f2a45bc25f31.sql
--
-- Pre-state (verified 2026-04-30):
--   1827 tables owned by dos_user
--      7 tables owned by postgres
--      1 table  owned by shahin
--      3 functions owned by dos_user
-- Post-state: every table + function in tenant_f2a45bc25f31 owned by dos_auth.

\set ON_ERROR_STOP on
\timing on
BEGIN;

-- 1) Tables → dos_auth
DO $$
DECLARE
  r record;
  altered int := 0;
BEGIN
  FOR r IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_roles    o ON o.oid = c.relowner
     WHERE n.nspname = 'tenant_f2a45bc25f31'
       AND c.relkind = 'r'
       AND o.rolname <> 'dos_auth'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I OWNER TO dos_auth', 'tenant_f2a45bc25f31', r.relname);
    altered := altered + 1;
  END LOOP;
  RAISE NOTICE 'tables re-owned: %', altered;
END $$;

-- 2) Sequences (FKs/PKs depend on them being grant-compatible)
DO $$
DECLARE
  r record;
  altered int := 0;
BEGIN
  FOR r IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_roles    o ON o.oid = c.relowner
     WHERE n.nspname = 'tenant_f2a45bc25f31'
       AND c.relkind = 'S'
       AND o.rolname <> 'dos_auth'
  LOOP
    EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO dos_auth', 'tenant_f2a45bc25f31', r.relname);
    altered := altered + 1;
  END LOOP;
  RAISE NOTICE 'sequences re-owned: %', altered;
END $$;

-- 3) Views (some module migrations create views)
DO $$
DECLARE
  r record;
  altered int := 0;
BEGIN
  FOR r IN
    SELECT c.relname, c.relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_roles    o ON o.oid = c.relowner
     WHERE n.nspname = 'tenant_f2a45bc25f31'
       AND c.relkind IN ('v','m')   -- regular + materialized views
       AND o.rolname <> 'dos_auth'
  LOOP
    IF r.relkind = 'v' THEN
      EXECUTE format('ALTER VIEW %I.%I OWNER TO dos_auth', 'tenant_f2a45bc25f31', r.relname);
    ELSE
      EXECUTE format('ALTER MATERIALIZED VIEW %I.%I OWNER TO dos_auth', 'tenant_f2a45bc25f31', r.relname);
    END IF;
    altered := altered + 1;
  END LOOP;
  RAISE NOTICE 'views re-owned: %', altered;
END $$;

-- 4) Functions
DO $$
DECLARE
  r record;
  altered int := 0;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_roles    o ON o.oid = p.proowner
     WHERE n.nspname = 'tenant_f2a45bc25f31'
       AND o.rolname <> 'dos_auth'
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) OWNER TO dos_auth',
                   'tenant_f2a45bc25f31', r.proname, r.args);
    altered := altered + 1;
  END LOOP;
  RAISE NOTICE 'functions re-owned: %', altered;
END $$;

-- 5) Pre-fix the missing UNIQUE constraint that incident/117 depends on.
--    incidents has only PK on (id); migration 117 adds FKs against
--    incidents(incident_id). Table is empty (verified 2026-04-30) so adding
--    UNIQUE is a no-op data-wise.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname='tenant_f2a45bc25f31'
       AND tablename='incidents'
       AND indexdef ILIKE '%UNIQUE%(incident_id)%'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS ux_incidents_incident_id ON tenant_f2a45bc25f31.incidents (incident_id)';
    RAISE NOTICE 'created ux_incidents_incident_id';
  ELSE
    RAISE NOTICE 'ux_incidents_incident_id already present, skipping';
  END IF;
END $$;

-- Verification gates inside the same TX
DO $$
DECLARE
  bad_tables int;
  bad_funcs  int;
BEGIN
  SELECT count(*) INTO bad_tables
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_roles    o ON o.oid=c.relowner
   WHERE n.nspname='tenant_f2a45bc25f31'
     AND c.relkind IN ('r','S','v','m')
     AND o.rolname <> 'dos_auth';
  SELECT count(*) INTO bad_funcs
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_roles    o ON o.oid=p.proowner
   WHERE n.nspname='tenant_f2a45bc25f31' AND o.rolname <> 'dos_auth';
  IF bad_tables > 0 OR bad_funcs > 0 THEN
    RAISE EXCEPTION 'ownership normalization incomplete: tables=% funcs=%', bad_tables, bad_funcs;
  END IF;
  RAISE NOTICE 'verification PASS — every relation+function owned by dos_auth';
END $$;

COMMIT;
