-- =====================================================================
-- Phase H — DOS Master Doctrine guard table grants for dos_auth.
--
-- Background:
--   Three CI guards (ppd-ring-required, audit-event-on-write,
--   publish-revision-atomic) connect as `dos_auth` and read directly
--   from `dos.*` master tables that were created with default ownership
--   limited to `dos_master`. With no SELECT grant for `dos_auth`, each
--   guard reports `ERROR permission denied for table …`.
--
--   Doctrine (rls-policy-present + master-table-isolation): only
--   privileged service identities (dos_master, postgres) may MUTATE
--   these tables; READING for guard/observability purposes is safe.
--
-- This migration:
--   1. Idempotently grants `SELECT` to `dos_auth` on the master tables
--      the four guards read from.
--   2. Sets default-privileges so future objects in the `dos` schema
--      under `dos_master` ownership inherit the grant.
--   3. Documents the bridge so a future `dos_observer` role can be
--      created without losing the audit trail.
--
-- Idempotent. Non-destructive. No data mutation.
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dos_auth') THEN
    RAISE NOTICE 'Phase H: dos_auth role missing, skipping grants (will reapply once provisioned).';
    RETURN;
  END IF;
END $$;

-- Tables read by ppd-ring-required.mjs
GRANT SELECT ON TABLE dos.rollout_plan        TO dos_auth;
GRANT SELECT ON TABLE dos.rollout_ring        TO dos_auth;
GRANT SELECT ON TABLE dos.rollout_health_gate TO dos_auth;
GRANT SELECT ON TABLE dos.rollout_cohort      TO dos_auth;

-- Tables read by audit-event-on-write.mjs
GRANT SELECT ON TABLE dos.dos_master_writer_audit TO dos_auth;

-- Tables read by publish-revision-atomic.mjs
GRANT SELECT ON TABLE dos.publish_revision TO dos_auth;
GRANT SELECT ON TABLE dos.publish_rollback TO dos_auth;

-- Table read by slo-row-per-active-service.mjs (was SKIPping due to perm)
GRANT SELECT ON TABLE dos.platform_slo TO dos_auth;

-- Future objects created by dos_master in schema `dos` inherit SELECT
-- for dos_auth — keeps guards green when new master tables land.
ALTER DEFAULT PRIVILEGES FOR ROLE dos_master IN SCHEMA dos
  GRANT SELECT ON TABLES TO dos_auth;

-- Optional sanity proof: ensure SELECT visible on every target table.
DO $$
DECLARE
  miss text[];
BEGIN
  SELECT array_agg(t)
    INTO miss
  FROM unnest(ARRAY[
    'dos.rollout_plan',
    'dos.rollout_ring',
    'dos.rollout_health_gate',
    'dos.rollout_cohort',
    'dos.dos_master_writer_audit',
    'dos.publish_revision',
    'dos.publish_rollback',
    'dos.platform_slo'
  ]) AS t
  WHERE NOT has_table_privilege('dos_auth', t, 'SELECT');

  IF miss IS NOT NULL AND array_length(miss, 1) > 0 THEN
    RAISE EXCEPTION 'Phase H grant verification failed: %', miss;
  END IF;
  RAISE NOTICE 'Phase H grants OK — dos_auth has SELECT on 8 master tables.';
END $$;

COMMIT;
