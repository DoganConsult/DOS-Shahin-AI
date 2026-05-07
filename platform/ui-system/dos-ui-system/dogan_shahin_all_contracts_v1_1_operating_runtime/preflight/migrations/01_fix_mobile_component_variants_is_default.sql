-- =====================================================================
-- v1.1 Operating Runtime Pack — Preflight Blocker B1
-- mobile_component_variants.is_default schema/query mismatch
-- ---------------------------------------------------------------------
-- Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / DB-as-source.
-- This migration is shipped as ready-for-review SQL inside the v1.1
-- contract pack. It MUST NOT be auto-executed by the migrator pipeline.
-- Execution is gated on human review + lockstep CI guard.
--
-- Defect:
--   services/ui-os-service/src/routes/mobile.routes.ts queries
--   dos.mobile_component_variants.is_default but the canonical DDL
--   in 20260515_0300_mobile_component_variants.sql does not declare
--   the column. Result at runtime: 42703 column does not exist.
--
-- Fix mode:
--   Add is_default boolean default false (idempotent, non-destructive).
--   Add tenant-scoped partial unique index keyed on
--     (coalesce(tenant_id, '__global__'), component_key, breakpoint)
--     WHERE is_default = true.
--   variant_name is intentionally NOT in the uniqueness key — the rule
--   is "one default variant per (tenant, component, breakpoint)", not
--   per name. tenant_id NULL is treated as the global tenant via
--   coalesce so that a single global default is also enforced.
--
-- Idempotent:  yes (IF NOT EXISTS on column + index)
-- Destructive: no
-- Review required: no
-- =====================================================================

BEGIN;

ALTER TABLE dos.mobile_component_variants
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mobile_component_variants_default
  ON dos.mobile_component_variants
     ( coalesce(tenant_id, '__global__'), component_key, breakpoint )
  WHERE is_default = true;

DO $$
DECLARE
  has_column boolean;
  has_index  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'dos'
       AND table_name   = 'mobile_component_variants'
       AND column_name  = 'is_default'
  ) INTO has_column;
  IF NOT has_column THEN
    RAISE EXCEPTION 'B1 post-condition failed: dos.mobile_component_variants.is_default must exist';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM pg_indexes
     WHERE schemaname = 'dos'
       AND tablename  = 'mobile_component_variants'
       AND indexname  = 'uq_mobile_component_variants_default'
  ) INTO has_index;
  IF NOT has_index THEN
    RAISE EXCEPTION 'B1 post-condition failed: uq_mobile_component_variants_default must exist';
  END IF;

  RAISE NOTICE 'B1 OK: dos.mobile_component_variants.is_default present, tenant-scoped partial unique index in place.';
END $$;

COMMIT;
