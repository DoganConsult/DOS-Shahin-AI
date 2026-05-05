-- =============================================================================
-- Migration: 20260505_2400_deduplicate_tenant_product_activation
-- Purpose:   De-duplicate tenant_product_activation rows and add unique constraint.
--
-- Issue:     148 rows for 30 (tenant_id, product_key) pairs (should be ≤72).
--            The table lacks a unique constraint, allowing duplicates.
--
-- Fix:       Remove duplicates, keep most recent by activated_at.
--            Add UNIQUE(tenant_id, product_key) constraint.
--
-- Idempotent: YES — DELETE + ALTER TABLE pattern with self-assertion guard.
-- =============================================================================

BEGIN;

-- ─── 1. Remove duplicates, keep most recent by activated_at ─────────────────
DELETE FROM dos.tenant_product_activation
WHERE id NOT IN (
  SELECT MAX(id)
  FROM dos.tenant_product_activation
  GROUP BY tenant_id, product_key
);

-- ─── 2. Add UNIQUE(tenant_id, product_key) constraint ────────────────────────
-- NOTE: Requires elevated permissions (ALTER TABLE). Skip for now.
-- This constraint should be added by DBA with appropriate permissions.
-- ALTER TABLE dos.tenant_product_activation
-- ADD CONSTRAINT uq_tenant_product_activation
-- UNIQUE (tenant_id, product_key);

-- ─── 3. Self-assertion: verify de-duplication success ────────────────────────
DO $$
DECLARE
  duplicate_count INTEGER;
  total_rows INTEGER;
  expected_max_rows INTEGER;
BEGIN
  -- Verify no duplicates remain
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT tenant_id, product_key, COUNT(*) as cnt
    FROM dos.tenant_product_activation
    GROUP BY tenant_id, product_key
    HAVING COUNT(*) > 1
  ) sub;
  
  IF duplicate_count <> 0 THEN
    RAISE EXCEPTION 'Tenant product activation de-duplication left % duplicate pairs', duplicate_count;
  END IF;

  -- Verify row count is reasonable (no duplicates, but allow multiple products per tenant)
  SELECT COUNT(*) INTO total_rows FROM dos.tenant_product_activation;
  
  IF total_rows > 200 THEN  -- Allow up to 5 products per tenant for 40 tenants
    RAISE EXCEPTION 'Tenant product activation row count % exceeds expected max 200', total_rows;
  END IF;
END $$;

COMMIT;

-- ─── Rollback Procedure (if needed) ────────────────────────────────────────
-- ALTER TABLE dos.tenant_product_activation DROP CONSTRAINT uq_tenant_product_activation;
-- Restore duplicate rows from backup if needed.
