-- Step 3B-2 — Finalize ownership: schemas + a second tenant (shahin_visitors)
-- Run as postgres superuser:
--   sudo -u postgres psql -d shahin_grc -v ON_ERROR_STOP=1 \
--     -f ops/scripts/superuser/3B2_finalize_ownership.sql

\set ON_ERROR_STOP on
\timing on
BEGIN;

-- 1) tenant_f2a45bc25f31 schema itself
ALTER SCHEMA tenant_f2a45bc25f31 OWNER TO dos_auth;

-- 2) Sweep ownership for tenant_shahin_visitors (same pattern as 3B)
DO $$
DECLARE
  r record;
  altered_t int := 0;
  altered_s int := 0;
  altered_v int := 0;
  altered_f int := 0;
BEGIN
  FOR r IN
    SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_roles    o ON o.oid=c.relowner
     WHERE n.nspname='tenant_shahin_visitors' AND c.relkind='r'
       AND o.rolname<>'dos_auth'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I OWNER TO dos_auth', 'tenant_shahin_visitors', r.relname);
    altered_t := altered_t + 1;
  END LOOP;
  FOR r IN
    SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_roles    o ON o.oid=c.relowner
     WHERE n.nspname='tenant_shahin_visitors' AND c.relkind='S'
       AND o.rolname<>'dos_auth'
  LOOP
    EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO dos_auth', 'tenant_shahin_visitors', r.relname);
    altered_s := altered_s + 1;
  END LOOP;
  FOR r IN
    SELECT c.relname, c.relkind FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_roles    o ON o.oid=c.relowner
     WHERE n.nspname='tenant_shahin_visitors' AND c.relkind IN ('v','m')
       AND o.rolname<>'dos_auth'
  LOOP
    IF r.relkind='v' THEN
      EXECUTE format('ALTER VIEW %I.%I OWNER TO dos_auth', 'tenant_shahin_visitors', r.relname);
    ELSE
      EXECUTE format('ALTER MATERIALIZED VIEW %I.%I OWNER TO dos_auth', 'tenant_shahin_visitors', r.relname);
    END IF;
    altered_v := altered_v + 1;
  END LOOP;
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace
      JOIN pg_roles    o ON o.oid=p.proowner
     WHERE n.nspname='tenant_shahin_visitors' AND o.rolname<>'dos_auth'
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) OWNER TO dos_auth',
                   'tenant_shahin_visitors', r.proname, r.args);
    altered_f := altered_f + 1;
  END LOOP;
  RAISE NOTICE 'shahin_visitors re-owned: tables=% sequences=% views=% functions=%',
               altered_t, altered_s, altered_v, altered_f;
END $$;

-- 3) Verification: every relation+function in both tenants must be owned by dos_auth
DO $$
DECLARE
  bad int;
BEGIN
  SELECT count(*) INTO bad
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_roles    o ON o.oid=c.relowner
   WHERE n.nspname IN ('tenant_f2a45bc25f31','tenant_shahin_visitors')
     AND c.relkind IN ('r','S','v','m')
     AND o.rolname <> 'dos_auth';
  IF bad > 0 THEN RAISE EXCEPTION 'still % non-dos_auth relations', bad; END IF;
  RAISE NOTICE 'PASS — both schemas fully owned by dos_auth';
END $$;

COMMIT;
