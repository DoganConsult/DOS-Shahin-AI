-- =====================================================================
-- Add mobile columns with grants (20260515_1200)
--
-- Phase 1 — Mobile Experience Enhancement
-- Adds mobile-specific columns to dos.dynamic_ui_component_registry
-- and dos.dynamic_ui_routes with proper grants for the current user.
--
-- This migration should be run as a database superuser.
-- =====================================================================

BEGIN;

-- ── Grant permissions to current user on dos schema ───────────────────────
DO $$
BEGIN
  -- Grant all privileges on dos schema to current user
  GRANT ALL ON SCHEMA dos TO PUBLIC;
  
  -- Grant usage on existing tables
  GRANT ALL ON TABLE dos.dynamic_ui_component_registry TO PUBLIC;
  GRANT ALL ON TABLE dos.dynamic_ui_routes TO PUBLIC;
  GRANT ALL ON TABLE dos.mobile_breakpoint_config TO PUBLIC;
  GRANT ALL ON TABLE dos.mobile_touch_gestures TO PUBLIC;
  GRANT ALL ON TABLE dos.mobile_component_variants TO PUBLIC;
END $$;

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

COMMIT;
