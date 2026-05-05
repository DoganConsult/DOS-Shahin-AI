-- =============================================================================
-- Migration: 20260505_1900_tenant_product_activation_drift_purge
-- Purpose:   Wave-4 product-overlay closure — purge legacy product_key drift
--            from dos.tenant_product_activation so the
--            tenant-completeness CI guard discovers a clean
--            requiredProducts[] set (only `foundation` + `shahin-ai`).
--
--            The guard reads `SELECT DISTINCT product_key FROM
--            dos.tenant_product_activation LIMIT 100` (no status filter)
--            to derive `requiredProducts`, then asserts every active
--            tenant has an active row for each. Stale legacy rows for
--            retired keys (agrc, platform) and orphan test fixtures
--            (module.foundation on tenant_test_foundation) cause the
--            guard to fail across all 36 active tenants.
--
-- Audit (2026-05-05):
--   product_key         status     count
--   ─────────────────   ────────   ─────
--   agrc                inactive   22    ← legacy retired product, 0 active
--   platform            inactive   21    ← legacy retired product, 0 active
--   module.foundation   active      1    ← orphan on non-existent tenant
--   foundation          active     38    ← canonical (36 active + 2 stale)
--   shahin-ai           active     37    ← canonical (36 active + 1 stale)
--
-- Strategy:  Forward-only, additive-by-deletion (no schema changes):
--   1. Drop ALL `agrc` and `platform` activation rows (zero active rows ⇒
--      the keys are dead).
--   2. Drop the lone `module.foundation` row pointing at non-existent
--      tenant `tenant_test_foundation` (test fixture orphan).
--   3. Drop any activation row whose tenant_id has no row in `dos.tenants`
--      (defensive — sweeps any further FK-less orphans introduced by the
--      same test-fixture lineage).
--
-- Idempotent: YES. Re-running deletes zero additional rows.
-- =============================================================================

BEGIN;

-- 1. Retired product keys (no active rows; safe to fully purge).
DELETE FROM dos.tenant_product_activation
 WHERE product_key IN ('agrc', 'platform');

-- 2. Test-fixture orphan: 'module.foundation' on tenant_test_foundation.
DELETE FROM dos.tenant_product_activation
 WHERE product_key = 'module.foundation';

-- 3. Defensive orphan sweep — any activation row whose tenant_id
--    is not present in dos.tenants is unreachable and breaks the
--    completeness guard's product_key discovery.
DELETE FROM dos.tenant_product_activation tpa
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.tenants t WHERE t.tenant_id = tpa.tenant_id
 );

-- Self-assertion: distinct product_key set is exactly {foundation, shahin-ai}.
DO $$
DECLARE
  bad_keys text;
BEGIN
  SELECT string_agg(product_key, ',' ORDER BY product_key)
    INTO bad_keys
    FROM (SELECT DISTINCT product_key
            FROM dos.tenant_product_activation
           WHERE product_key NOT IN ('foundation', 'shahin-ai')) s;
  IF bad_keys IS NOT NULL THEN
    RAISE EXCEPTION 'tenant_product_activation still has drift product_keys: %', bad_keys;
  END IF;
END $$;

COMMIT;
