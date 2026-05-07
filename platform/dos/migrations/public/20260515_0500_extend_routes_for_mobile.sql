-- =====================================================================
-- Extend dos.dynamic_ui_routes for mobile (20260515_0500)
--
-- Phase 1.3 — Mobile Experience Enhancement
-- Adds mobile-specific columns to dos.dynamic_ui_routes
-- to support mobile layout, touch, and gesture configurations.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── Add mobile-specific columns to dynamic_ui_routes ─────────────────────
DO $$
BEGIN
  -- Add mobile_layout_config column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'dynamic_ui_routes' AND column_name = 'mobile_layout_config'
  ) THEN
    ALTER TABLE dos.dynamic_ui_routes
      ADD COLUMN IF NOT EXISTS mobile_layout_config JSONB;
  END IF;

  -- Add mobile_touch_config column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'dynamic_ui_routes' AND column_name = 'mobile_touch_config'
  ) THEN
    ALTER TABLE dos.dynamic_ui_routes
      ADD COLUMN IF NOT EXISTS mobile_touch_config JSONB;
  END IF;

  -- Add mobile_density_preference column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'dynamic_ui_routes' AND column_name = 'mobile_density_preference'
  ) THEN
    ALTER TABLE dos.dynamic_ui_routes
      ADD COLUMN IF NOT EXISTS mobile_density_preference VARCHAR(20) DEFAULT 'normal';
  END IF;

  -- Add mobile_gestures_enabled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'dynamic_ui_routes' AND column_name = 'mobile_gestures_enabled'
  ) THEN
    ALTER TABLE dos.dynamic_ui_routes
      ADD COLUMN IF NOT EXISTS mobile_gestures_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ── Add CHECK constraint for mobile_density_preference values (if column exists) ────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'dynamic_ui_routes' AND column_name = 'mobile_density_preference'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_mobile_density_preference_values'
  ) THEN
    ALTER TABLE dos.dynamic_ui_routes
      ADD CONSTRAINT chk_mobile_density_preference_values
      CHECK (mobile_density_preference IN ('compact', 'normal', 'comfortable'));
  END IF;
END $$;

COMMIT;
