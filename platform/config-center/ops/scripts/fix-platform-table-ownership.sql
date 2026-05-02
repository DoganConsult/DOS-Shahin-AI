-- ============================================================================
-- Phase 10J — Platform table-ownership repair (one-time, run as postgres)
-- ============================================================================
-- Context:
--   validate:migrations (fresh + upgrade) failed against the live shahin_grc
--   database with "must be owner of table tenant_module_entitlements" because
--   23 tables in the public schema ended up owned by `postgres` instead of
--   `dos_user`. Every other table in public is correctly owned by dos_user;
--   only this subset drifted, most likely because the tables were first
--   created by an out-of-band bootstrap script running as the Postgres
--   superuser rather than by the dos_user migration path.
--
--   Subsequent migrations (005_missing_platform_tables.sql and siblings)
--   attempt idempotent ALTER TABLE ... ADD CONSTRAINT and CREATE INDEX IF
--   NOT EXISTS calls. Those statements require ownership of the target
--   table; the dos_user migration runner cannot satisfy that requirement
--   while these tables remain postgres-owned.
--
-- Fix (durable):
--   This script runs ONCE as a Postgres superuser (typically `postgres`)
--   against the target database. It transfers ownership of every drifted
--   table to dos_user so that future validate:migrations and runtime
--   migration runs can complete without privilege errors. The script is
--   idempotent — subsequent runs are no-ops.
--
-- Invocation:
--   sudo -u postgres psql -d <database_name> -f ops/scripts/fix-platform-table-ownership.sql
--
-- Companion hardening: ops/migrations/005_missing_platform_tables.sql now
-- tolerates `insufficient_privilege` in the constraint/index DO blocks
-- (commit alongside this script). That defence-in-depth prevents a
-- recurrence from blocking a future validate:migrations run even if the
-- ops step is missed.
-- ============================================================================

-- Every table that appeared in `SELECT tablename FROM pg_tables WHERE
-- schemaname = 'public' AND tableowner = 'postgres'` on shahin_grc as of
-- Phase 10J diagnosis. Extend this list if additional drift is discovered.
DO $$
DECLARE
  t text;
  drifted_tables text[] := ARRAY[
    'csrf_failures',
    'csrf_security_policies',
    'invitations',
    'jwt_signing_keys',
    'onboarding_handoff_agent_findings',
    'onboarding_handoff_agent_runs',
    'onboarding_handoff_evidence_requests',
    'onboarding_handoff_invitations',
    'onboarding_inference_bundles',
    'onboarding_inference_feedback',
    'onboarding_inference_items',
    'onboarding_workspace_handoff_cycles',
    'platform_outbox',
    'platform_outbox_archive',
    'processed_events',
    'provisioning_step_runs',
    'refresh_token_families',
    'refresh_tokens',
    'register_idempotency',
    'scim_api_tokens',
    'session_security_events',
    'tenant_module_entitlements',
    'user_view_preferences'
  ];
BEGIN
  FOREACH t IN ARRAY drifted_tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename = t
         AND tableowner <> 'dos_user'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I OWNER TO dos_user', t);
      RAISE NOTICE '[fix-ownership] public.% re-owned to dos_user', t;
    END IF;
  END LOOP;
END $$;

-- Sequences and indexes are co-owned by their table after the ALTER TABLE
-- above, but a defensive sweep over sequences in public schema ensures no
-- sequence lingers as postgres-owned and blocks a future DEFAULT/nextval
-- refresh.
DO $$
DECLARE
  s record;
BEGIN
  FOR s IN
    SELECT c.relname AS seqname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_authid a  ON a.oid = c.relowner
     WHERE n.nspname = 'public'
       AND c.relkind = 'S'
       AND a.rolname <> 'dos_user'
  LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO dos_user', s.seqname);
    RAISE NOTICE '[fix-ownership] sequence public.% re-owned to dos_user', s.seqname;
  END LOOP;
END $$;

-- Schema-level ownership. `tenant_validate_migrations` and any tenant_*
-- schema that ends up owned by a non-dos_user role blocks the migration
-- validator from creating per-tenant objects. Re-own to dos_user.
DO $$
DECLARE
  s record;
BEGIN
  FOR s IN
    SELECT nspname
      FROM pg_namespace
     WHERE (nspname IN ('public', 'dos') OR nspname LIKE 'tenant\_%')
       AND pg_get_userbyid(nspowner) <> 'dos_user'
       AND nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
  LOOP
    EXECUTE format('ALTER SCHEMA %I OWNER TO dos_user', s.nspname);
    RAISE NOTICE '[fix-ownership] schema % re-owned to dos_user', s.nspname;
  END LOOP;
END $$;

-- Generic sweep: every table/view/sequence/function/mat-view in the
-- `public` or `dos` schemas that is currently owned by something other
-- than `dos_user` and is NOT owned by a Postgres extension. Catches
-- schema-scoped drift for tables we haven't enumerated explicitly above
-- (e.g. dos.compliance_requirements, dos.workflow_scheduled_jobs landed
-- under the `shahin` role from an earlier bootstrap).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,
           c.relname AS obj_name,
           c.relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname IN ('public', 'dos')
       AND c.relkind IN ('r', 'v', 'm', 'S')
       AND pg_get_userbyid(c.relowner) <> 'dos_user'
       AND NOT EXISTS (
         SELECT 1 FROM pg_depend d
          WHERE d.objid = c.oid AND d.deptype = 'e'
       )
       -- Skip throwaway test-idempotency tables created by prior CI
       -- runs; they are data-only cruft that sits outside the migration
       -- set, and a forward migration never touches them.
       AND c.relname NOT LIKE '\_test\_%'
  LOOP
    IF r.relkind = 'r' THEN
      EXECUTE format('ALTER TABLE %I.%I OWNER TO dos_user', r.schema_name, r.obj_name);
    ELSIF r.relkind = 'v' THEN
      EXECUTE format('ALTER VIEW %I.%I OWNER TO dos_user', r.schema_name, r.obj_name);
    ELSIF r.relkind = 'm' THEN
      EXECUTE format('ALTER MATERIALIZED VIEW %I.%I OWNER TO dos_user', r.schema_name, r.obj_name);
    ELSIF r.relkind = 'S' THEN
      EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO dos_user', r.schema_name, r.obj_name);
    END IF;
    RAISE NOTICE '[fix-ownership] %.% (%-kind) re-owned to dos_user', r.schema_name, r.obj_name, r.relkind;
  END LOOP;
END $$;

-- Functions + routines that are application-managed (not part of a
-- Postgres extension like pgcrypto / uuid-ossp). Only user-defined
-- helpers in the migration set need re-ownership; extension-owned
-- functions must stay with their extension owner (postgres).
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid AS fn_oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND pg_get_userbyid(p.proowner) <> 'dos_user'
       AND NOT EXISTS (
         SELECT 1 FROM pg_depend d
          WHERE d.objid = p.oid AND d.deptype = 'e'
       )
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) OWNER TO dos_user', f.proname, f.args);
    RAISE NOTICE '[fix-ownership] function public.%(%) re-owned to dos_user', f.proname, f.args;
  END LOOP;
END $$;

-- Views and materialized views in public schema that migrations need to
-- CREATE OR REPLACE. These have the same ownership-drift symptom as
-- tables: if the view was first created as postgres, dos_user's CREATE
-- OR REPLACE VIEW call fails with "must be owner of view".
DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT c.relname AS viewname, c.relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('v', 'm')           -- v = view, m = matview
       AND pg_get_userbyid(c.relowner) <> 'dos_user'
       AND NOT EXISTS (
         SELECT 1 FROM pg_depend d
          WHERE d.objid = c.oid AND d.deptype = 'e'
       )
  LOOP
    IF v.relkind = 'v' THEN
      EXECUTE format('ALTER VIEW public.%I OWNER TO dos_user', v.viewname);
    ELSE
      EXECUTE format('ALTER MATERIALIZED VIEW public.%I OWNER TO dos_user', v.viewname);
    END IF;
    RAISE NOTICE '[fix-ownership] view public.% re-owned to dos_user', v.viewname;
  END LOOP;
END $$;

-- Report final state so operators see the repair result in one place.
SELECT tableowner, COUNT(*) AS tables
  FROM pg_tables
 WHERE schemaname = 'public'
 GROUP BY tableowner
 ORDER BY tableowner;
