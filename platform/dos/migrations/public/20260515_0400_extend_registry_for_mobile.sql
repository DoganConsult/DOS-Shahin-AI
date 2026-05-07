-- =====================================================================
-- Extend dos.dynamic_ui_component_registry for mobile (20260515_0400)
--
-- Phase 1.1 — Mobile Experience Enhancement
-- Adds mobile-specific columns to dos.dynamic_ui_component_registry
-- to support mobile component variants and touch configurations.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── Add mobile-specific columns to dynamic_ui_component_registry ─────────
DO $$
BEGIN
  -- Add mobile_variant_props column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'dynamic_ui_component_registry' AND column_name = 'mobile_variant_props'
  ) THEN
    ALTER TABLE dos.dynamic_ui_component_registry
      ADD COLUMN IF NOT EXISTS mobile_variant_props JSONB;
  END IF;

  -- Add mobile_touch_enabled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'dynamic_ui_component_registry' AND column_name = 'mobile_touch_enabled'
  ) THEN
    ALTER TABLE dos.dynamic_ui_component_registry
      ADD COLUMN IF NOT EXISTS mobile_touch_enabled BOOLEAN DEFAULT false;
  END IF;

  -- Add mobile_density column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'dynamic_ui_component_registry' AND column_name = 'mobile_density'
  ) THEN
    ALTER TABLE dos.dynamic_ui_component_registry
      ADD COLUMN IF NOT EXISTS mobile_density VARCHAR(20) DEFAULT 'normal';
  END IF;
END $$;

-- ── Add CHECK constraint for mobile_density values (if columns exist) ──────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'dynamic_ui_component_registry' AND column_name = 'mobile_density'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mobile_density_values'
  ) THEN
    ALTER TABLE dos.dynamic_ui_component_registry
      ADD CONSTRAINT chk_mobile_density_values
      CHECK (mobile_density IN ('compact', 'normal', 'comfortable'));
  END IF;
END $$;

COMMIT;
