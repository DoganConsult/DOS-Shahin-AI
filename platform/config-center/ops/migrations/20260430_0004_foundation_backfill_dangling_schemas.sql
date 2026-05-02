-- ============================================================================
-- Foundation Reconciliation Phase 2B — RECONCILED — CLEARED FOR APPLY (Foundation Gate 2A.1 verdict signed)
-- File: 20260430_0004_foundation_backfill_dangling_schemas.sql
-- Source gate: DOS-AIO-Specs/audit/modules/_phase1-foundation-gate-2a-1.md §4
-- Companion review: docs/db/foundation-gate-2b-review.md
--
-- INTENT
--   Back-fill platform_dos.tenants_registry rows for 4 of the 5 dangling
--   physical tenant_* schemas, using identity already present in
--   dos.tenants and/or public.tenants. Mark each row with the
--   reconciliation status agreed in Gate 2A.1.
--
--   IN-SCOPE (4):
--     tenant_a7f7b3f6f0df         → schema_status='dangling_schema_backfilled_test'
--     tenant_douhan_consult       → schema_status='legacy_dev_sandbox'
--     tenant_f2a45bc25f31         → schema_status='manual_review_poc'
--     tenant_validate_migrations  → schema_status='validation_schema'
--
--   EXPLICITLY EXCLUDED:
--     tenant_51f36271df62ea3d
--       — "Info Dogan Consult workspace"; possible real customer.
--         Requires manual owner review before any registry write.
--
--   ALSO EXCLUDED (out of scope for this file):
--     - 27 onboarding-spam dos.tenants rows
--     - dos.users / dos.tenant_memberships rows linked to spam
--     - 2c71cc2d-… and 2ba4b532-… (Dpgan canonical decision)
--     - public.login_attempts; users; tenants; invitations; sod_rules; feature_flags
--     - RLS
--
-- SAFETY CONTRACT
--   - Pure INSERT … ON CONFLICT DO NOTHING — never overwrites an
--     existing registry row. If a backfill row already exists (from a
--     prior run or from manual intervention), this migration leaves it
--     alone.
--   - Tenant_id values are hard-coded literals; no dynamic discovery.
--   - Aborts if any of the 4 source physical schemas is missing.
--   - Aborts if a tenant_id collision with an existing non-dangling row
--     is detected.
--   - Idempotent: re-runs are no-ops.
--   - Requires 20260430_0001 (schema_status column).
--
-- APPROVAL STATUS
--   Approved after Foundation Gate 2A.1 reconciliation (orphan count converged to 48 baseline).
-- ============================================================================

BEGIN;

-- 0. Pre-flight: column must exist + 4 schemas present ----------------------
DO $$
DECLARE
  v_missing int;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='platform_dos' AND table_name='tenants_registry' AND column_name='schema_status'
  ) THEN
    RAISE EXCEPTION 'GATE_2B_ABORT: schema_status column missing. Apply 0001 first.';
  END IF;

  SELECT count(*) INTO v_missing
  FROM (VALUES
    ('tenant_a7f7b3f6f0df'),
    ('tenant_douhan_consult'),
    ('tenant_f2a45bc25f31'),
    ('tenant_validate_migrations')
  ) v(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = v.name
  );
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'GATE_2B_ABORT: % expected dangling schemas missing. '
      'Re-run Gate 2A.1 before applying.', v_missing;
  END IF;
END$$;

-- 1. Reject any pre-existing collision against tenant_id we are about to write
DO $$
DECLARE
  v_collide int;
BEGIN
  SELECT count(*) INTO v_collide
  FROM platform_dos.tenants_registry
  WHERE tenant_id IN (
    'a7f7b3f6f0df','douhan_consult','f2a45bc25f31','validate_migrations'
  )
  AND COALESCE(schema_status,'active') NOT IN (
    'active',
    'dangling_schema_backfilled_test',
    'legacy_dev_sandbox',
    'manual_review_poc',
    'validation_schema'
  );
  IF v_collide > 0 THEN
    RAISE EXCEPTION 'GATE_2B_ABORT: % registry rows already carry an unexpected schema_status. '
      'Manual review required before backfill.', v_collide;
  END IF;
END$$;

-- 2. Backfill rows ----------------------------------------------------------
--    tenant_id is the canonical key written into platform_dos.tenants_registry.
--    display_name / product_code mirror what dos.tenants/public.tenants holds.
--    All rows are inserted as status='active' (the legacy registry status)
--    with the new schema_status field carrying the reconciliation tag.

INSERT INTO platform_dos.tenants_registry
  (tenant_id, product_code, status, display_name, registered_at,
   status_changed_at, attributes,
   schema_status, schema_status_reason, schema_checked_at)
VALUES
  (
    'a7f7b3f6f0df',
    'shahin-ai',
    'active',
    'AcceptanceCo1777152936e77976',  -- public.tenants.tenant_name_en
    now(),
    now(),
    jsonb_build_object(
      'backfill_source', 'gate-2b',
      'physical_schema', 'tenant_a7f7b3f6f0df',
      'echo_in_dos_tenants', true,
      'echo_in_public_tenants', true
    ),
    'dangling_schema_backfilled_test',
    'backfilled_from_dos_tenants_and_public_tenants_gate2b',
    now()
  ),
  (
    'douhan_consult',
    'shahin',
    'active',
    'Douhan Consult (dev)',          -- dos.tenants.tenant_name
    now(),
    now(),
    jsonb_build_object(
      'backfill_source', 'gate-2b',
      'physical_schema', 'tenant_douhan_consult',
      'echo_in_dos_tenants', true,
      'echo_in_public_tenants', true,
      'note', 'dev_twin_of_tenant_dogan'
    ),
    'legacy_dev_sandbox',
    'dev_twin_of_canonical_tenant_dogan_kept_active',
    now()
  ),
  (
    'f2a45bc25f31',
    'shahin-ai',
    'active',
    'stc-mofg3saq',                  -- public.tenants.tenant_name_en
    now(),
    now(),
    jsonb_build_object(
      'backfill_source', 'gate-2b',
      'physical_schema', 'tenant_f2a45bc25f31',
      'echo_in_dos_tenants', true,
      'echo_in_public_tenants', true,
      'data_volume_note', 'has_seeded_controls_and_incident_taxonomy_see_gate2a1'
    ),
    'manual_review_poc',
    'stc_poc_tenant_pending_owner_review',
    now()
  ),
  (
    'validate_migrations',
    'shahin',
    'active',
    'Migration Validation Sentinel',
    now(),
    now(),
    jsonb_build_object(
      'backfill_source', 'gate-2b',
      'physical_schema', 'tenant_validate_migrations',
      'purpose', 'migration_runner_sentinel_DO_NOT_DROP'
    ),
    'validation_schema',
    'sentinel_for_migration_runner_keep',
    now()
  )
ON CONFLICT (tenant_id) DO NOTHING;

-- 3. Postflight: each of the 4 must now exist and carry the expected status
DO $$
DECLARE r RECORD; v_bad int := 0;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('a7f7b3f6f0df',         'dangling_schema_backfilled_test'),
      ('douhan_consult',       'legacy_dev_sandbox'),
      ('f2a45bc25f31',         'manual_review_poc'),
      ('validate_migrations',  'validation_schema')
    ) v(tenant_id, expected)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM platform_dos.tenants_registry
      WHERE tenant_id = r.tenant_id AND schema_status = r.expected
    ) THEN
      v_bad := v_bad + 1;
      RAISE NOTICE 'GATE_2B_BACKFILL_MISSING: tenant_id=% expected=%', r.tenant_id, r.expected;
    END IF;
  END LOOP;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'GATE_2B_ABORT: % backfill rows missing or wrong status', v_bad;
  END IF;
END$$;

COMMIT;

-- ----------------------------------------------------------------------------
-- ROLLBACK (only safe if NO downstream system has begun reading these rows):
--   DELETE FROM platform_dos.tenants_registry
--   WHERE tenant_id IN ('a7f7b3f6f0df','douhan_consult','f2a45bc25f31','validate_migrations')
--     AND (attributes->>'backfill_source') = 'gate-2b';
-- ----------------------------------------------------------------------------
