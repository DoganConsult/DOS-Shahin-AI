-- =====================================================================
-- v1.1 Operating Runtime Pack — Preflight Blocker B3
-- product_registry tier seed/DDL drift
-- ---------------------------------------------------------------------
-- Doctrine: ZERO STATIC / ZERO LEGACY / ZERO FALLBACK / DB-as-source.
-- This migration is shipped as ready-for-review SQL inside the v1.1
-- contract pack. It MUST NOT be auto-executed by the migrator pipeline.
-- Execution is gated on human review + lockstep CI guard.
--
-- Defect:
--   platform/config-center/ops/scripts/seed-platform-complete.ts
--   inserts a 'tier' column into dos.product_registry, but the
--   canonical DDL does not declare a tier column. Result at seed
--   time: 42703 column does not exist.
--
-- Fix mode (CORRECTED per plan):
--   ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS is NOT portable
--   across Postgres versions. Constraint addition MUST use a DO
--   block guarded by a pg_constraint lookup.
--   Allowed tiers: free, starter, professional, enterprise, custom.
--   tier is nullable so existing rows are not invalidated; check
--   constraint allows NULL.
--
-- Idempotent:  yes (IF NOT EXISTS on column + pg_constraint guard)
-- Destructive: no
-- Review required: no
-- =====================================================================

BEGIN;

ALTER TABLE dos.product_registry
  ADD COLUMN IF NOT EXISTS tier text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'product_registry_tier_chk'
       AND conrelid = 'dos.product_registry'::regclass
  ) THEN
    ALTER TABLE dos.product_registry
      ADD CONSTRAINT product_registry_tier_chk
      CHECK (
        tier IS NULL
        OR tier IN ('free','starter','professional','enterprise','custom')
      );
  END IF;
END $$;

DO $$
DECLARE
  has_column      boolean;
  has_constraint  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'dos'
       AND table_name   = 'product_registry'
       AND column_name  = 'tier'
  ) INTO has_column;
  IF NOT has_column THEN
    RAISE EXCEPTION 'B3 post-condition failed: dos.product_registry.tier must exist';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'product_registry_tier_chk'
       AND conrelid = 'dos.product_registry'::regclass
  ) INTO has_constraint;
  IF NOT has_constraint THEN
    RAISE EXCEPTION 'B3 post-condition failed: product_registry_tier_chk must exist';
  END IF;

  RAISE NOTICE 'B3 OK: dos.product_registry.tier column + pg_constraint guarded check installed.';
END $$;

COMMIT;
