-- =====================================================================
-- Seed mobile layout configs (20260515_0900)
--
-- Phase 5.2 — Mobile Experience Enhancement
-- Seeds default mobile_layout_config by module for dos.dynamic_ui_routes.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── Seed default mobile_layout_config by module ───────────────────────────────
DO $$
BEGIN
  -- Only proceed if mobile_layout_config column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'dynamic_ui_routes' AND column_name = 'mobile_layout_config'
  ) THEN
    UPDATE dos.dynamic_ui_routes
    SET mobile_layout_config = '{"header":{"sticky":true,"height":56},"main":{"padding":16,"scroll":true},"bottomNav":{"height":56,"safeArea":true},"drawer":{"enabled":true,"position":"left"}}'::jsonb
    WHERE mobile_layout_config IS NULL
      OR mobile_layout_config = '{}'::jsonb;
  END IF;
END $$;

COMMIT;
