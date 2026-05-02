-- ============================================================================
-- 123: Defence-in-depth — FORCE ROW LEVEL SECURITY on every ENABLED table
-- ============================================================================
-- Phase 2 (Wave 1) tenant-safety gate.
--
-- Context:
--   - Migration 020 enables RLS + FORCE RLS on ~40 domain tables.
--   - Migration 024 enables RLS + FORCE RLS on vector-store tables.
--   - Migration 122 enables RLS on risk_reviews and risk_approval_requests but
--     does NOT apply FORCE ROW LEVEL SECURITY, so a table owner or superuser
--     could bypass the policy.
--   - Future migrations may add ENABLE ROW LEVEL SECURITY without remembering
--     to pair it with FORCE.
--
-- This migration sweeps every table in the per-tenant schema that already has
-- ROW LEVEL SECURITY enabled and applies FORCE to it if not already forced.
-- Idempotent; safe to re-run on every tenant schema.
--
-- Policy semantics are unchanged — only FORCE is added. No new policies.
--
-- NOTE: Run per-tenant schema. The per-tenant migration runner substitutes
-- __TENANT_SCHEMA__ with the real schema name.
-- ============================================================================

SET search_path TO "__TENANT_SCHEMA__";

-- Explicit fix for the two tables known to be missing FORCE (migration 122).
ALTER TABLE IF EXISTS __TENANT_SCHEMA__.risk_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS __TENANT_SCHEMA__.risk_approval_requests FORCE ROW LEVEL SECURITY;

-- General sweep: every table in this schema that has ENABLE ROW LEVEL
-- SECURITY but is NOT yet FORCE RLS gets FORCE applied. Uses pg_class
-- metadata so it catches tables added by future migrations too.
DO $$
DECLARE
  rec RECORD;
  fixed_count INT := 0;
BEGIN
  FOR rec IN
    SELECT c.oid, c.relname
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = current_schema()
      AND  c.relkind = 'r'           -- ordinary tables only
      AND  c.relrowsecurity = TRUE    -- ENABLE ROW LEVEL SECURITY is on
      AND  c.relforcerowsecurity = FALSE  -- FORCE is off
  LOOP
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', rec.relname);
    fixed_count := fixed_count + 1;
    RAISE NOTICE 'RLS 123: FORCE applied on %.%', current_schema(), rec.relname;
  END LOOP;

  IF fixed_count = 0 THEN
    RAISE NOTICE 'RLS 123: no tables needed FORCE (all ENABLED tables already FORCED) in %', current_schema();
  ELSE
    RAISE NOTICE 'RLS 123: FORCE applied on % tables in %', fixed_count, current_schema();
  END IF;
END;
$$;
