-- =============================================================================
-- Migration: 20260507_0100_tenant_product_activation_unique
-- Purpose:   Add UNIQUE(tenant_id, product_key) after 2400 dedupe (idempotent).
--
-- Requires:  dos_auth or runner role must own dos.tenant_product_activation or
--            hold ALTER privilege. If this fails in dev, run as table owner / DBA.
--
-- Idempotent: YES — uses pg_catalog check for constraint name.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'dos'
      AND t.relname = 'tenant_product_activation'
      AND c.conname = 'uq_tenant_product_activation'
  ) THEN
    ALTER TABLE dos.tenant_product_activation
      ADD CONSTRAINT uq_tenant_product_activation UNIQUE (tenant_id, product_key);
  END IF;
END $$;

COMMIT;
