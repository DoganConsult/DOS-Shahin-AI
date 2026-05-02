-- ============================================================================
-- Foundation Reconciliation Phase 2B — RECONCILED — CLEARED FOR APPLY (Foundation Gate 2A.1 verdict signed)
-- File: 20260430_0003_foundation_mark_orphan_registry_rows.sql
-- Source gate: DOS-AIO-Specs/audit/modules/_phase1-foundation-gate-2a-1.md §2 + §6
-- Companion review: docs/db/foundation-gate-2b-review.md
--
-- INTENT
--   Set platform_dos.tenants_registry.schema_status for the 48 orphan
--   registry rows identified by Gate 2A:
--     - 45 hex stubs (single-batch 2026-04-23 06:06:04→07Z)
--     - 3 named stubs: rimtest1776461709, tenta, tentb
--
-- SAFETY CONTRACT
--   - Pure UPDATE on a column added by 20260430_0001 (no schema change).
--   - Touches ONLY rows whose tenant_id is in the explicit allow-list.
--   - Never touches: dogan, the 8 matched-with-schema tenants, or any
--     dangling-schema row, or any row not in the allow-list.
--   - Hard-aborts if the allow-list does not match exactly 48 rows in
--     the registry, OR if any allow-listed row has a physical schema.
--   - Does NOT delete tenants_registry rows.
--   - Does NOT delete tenant_products rows.
--   - Idempotent: a second run finds the rows already at the target
--     status and updates 0 additional rows.
--   - Requires 20260430_0001 to have been applied (schema_status column
--     must exist).
--
-- APPROVAL STATUS
--   Approved after Foundation Gate 2A.1 reconciliation (orphan count converged to 48 baseline) AND the phantom-tpm
--   archive (20260430_0002) has succeeded.
-- ============================================================================

BEGIN;

-- 0. Pre-flight: column must exist -------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='platform_dos'
      AND table_name='tenants_registry'
      AND column_name='schema_status'
  ) THEN
    RAISE EXCEPTION 'GATE_2B_ABORT: schema_status column missing. '
      'Apply 20260430_0001_foundation_tenant_schema_status.sql first.';
  END IF;
END$$;

-- 1. Allow-lists (verbatim from Gate 2A) ------------------------------------
DROP TABLE IF EXISTS pg_temp.gate2b_hex_orphans;
CREATE TEMP TABLE gate2b_hex_orphans (tenant_id text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO gate2b_hex_orphans (tenant_id) VALUES
  ('003d6d1f266e'), ('084e492569fb'), ('088998ce759f'), ('0a1cdbfe41d5'),
  ('0aab56662691'), ('0b39d8d1a9a6'), ('0c9af04e4243'), ('13e91c72b4e4'),
  ('1eb4087dfdcc'), ('2856df9a8b63'), ('2963efa656f1'), ('2e6957b63d7b'),
  ('31b12d374efd'), ('323e23ad3e67'), ('45a199b1e41b'), ('46007594e959'),
  ('4f83bed8eb1d'), ('54163fe24f23'), ('5585ee20292f'), ('56b8b9370073'),
  ('64365928abfa'), ('67da4d9d260c'), ('762682747b1b'), ('7848c0325342'),
  ('78db092c8ad7'), ('8877128dc850'), ('909f6ca6988c'), ('9c8f47c64767'),
  ('a25de2b0871b'), ('a653f3c71896'), ('ad2b81baf07b'), ('af0e7d27ab67'),
  ('b1f0df8beac7'), ('b56613950751'), ('b9bcb9d0c75d'), ('c359c313958f'),
  ('c387757bf473'), ('d2d4f1869096'), ('dcbc20b03704'), ('de6e72d188fe'),
  ('e3b0e51dba13'), ('e87836841d17'), ('eae7368cc0f3'), ('eef2865f31c6'),
  ('ffdcba7e2a72');

DROP TABLE IF EXISTS pg_temp.gate2b_named_stubs;
CREATE TEMP TABLE gate2b_named_stubs (tenant_id text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO gate2b_named_stubs (tenant_id) VALUES
  ('rimtest1776461709'), ('tenta'), ('tentb');

-- 2. Invariants -------------------------------------------------------------
DO $$
DECLARE
  v_hex int; v_named int; v_with_schema int;
BEGIN
  SELECT count(*) INTO v_hex
  FROM platform_dos.tenants_registry r
  JOIN gate2b_hex_orphans o USING (tenant_id);
  IF v_hex <> 45 THEN
    RAISE EXCEPTION 'GATE_2B_ABORT: hex orphans matched=% (expected 45). '
      'Registry drifted; re-run gate.', v_hex;
  END IF;

  SELECT count(*) INTO v_named
  FROM platform_dos.tenants_registry r
  JOIN gate2b_named_stubs o USING (tenant_id);
  IF v_named <> 3 THEN
    RAISE EXCEPTION 'GATE_2B_ABORT: named stubs matched=% (expected 3). '
      'Registry drifted; re-run gate.', v_named;
  END IF;

  -- None of these tenants may have a physical schema.
  SELECT count(*) INTO v_with_schema
  FROM (
    SELECT tenant_id FROM gate2b_hex_orphans
    UNION ALL SELECT tenant_id FROM gate2b_named_stubs
  ) t
  WHERE EXISTS (
    SELECT 1 FROM information_schema.schemata s
    WHERE s.schema_name = 'tenant_' || lower(regexp_replace(t.tenant_id,'-','','g'))
  );
  IF v_with_schema <> 0 THEN
    RAISE EXCEPTION 'GATE_2B_ABORT: % allow-listed orphans now have a physical schema. '
      'Refusing to mark.', v_with_schema;
  END IF;
END$$;

-- 3. Mark the 45 hex stubs --------------------------------------------------
UPDATE platform_dos.tenants_registry r
SET schema_status        = 'orphan_provisioning_failed',
    schema_status_reason = 'bulk_seed_without_schema_2026_04_23',
    schema_checked_at    = now()
FROM gate2b_hex_orphans o
WHERE r.tenant_id = o.tenant_id
  AND r.schema_status IS DISTINCT FROM 'orphan_provisioning_failed';

-- 4. Mark the 3 named test stubs --------------------------------------------
UPDATE platform_dos.tenants_registry r
SET schema_status        = 'test_stub',
    schema_status_reason = 'named_test_stub_no_schema',
    schema_checked_at    = now()
FROM gate2b_named_stubs o
WHERE r.tenant_id = o.tenant_id
  AND r.schema_status IS DISTINCT FROM 'test_stub';

-- 5. Postflight verification -------------------------------------------------
DO $$
DECLARE
  v_orphan int; v_test int;
BEGIN
  SELECT count(*) INTO v_orphan
  FROM platform_dos.tenants_registry r
  JOIN gate2b_hex_orphans o USING (tenant_id)
  WHERE r.schema_status='orphan_provisioning_failed';
  IF v_orphan <> 45 THEN
    RAISE EXCEPTION 'GATE_2B_ABORT: postflight hex orphan count=% (expected 45)', v_orphan;
  END IF;

  SELECT count(*) INTO v_test
  FROM platform_dos.tenants_registry r
  JOIN gate2b_named_stubs o USING (tenant_id)
  WHERE r.schema_status='test_stub';
  IF v_test <> 3 THEN
    RAISE EXCEPTION 'GATE_2B_ABORT: postflight named stub count=% (expected 3)', v_test;
  END IF;
END$$;

COMMIT;

-- ----------------------------------------------------------------------------
-- ROLLBACK (sets all 48 rows back to default):
--   UPDATE platform_dos.tenants_registry
--   SET schema_status='active', schema_status_reason=NULL, schema_checked_at=NULL
--   WHERE tenant_id IN (... full 48-row list ...);
-- ----------------------------------------------------------------------------
