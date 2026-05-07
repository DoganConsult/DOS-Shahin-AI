-- =====================================================================
-- Backfill mobile_variant for all routes (20260515_0800)
--
-- Phase 5.3 — Mobile Experience Enhancement
-- Generates mobile_variant JSONB for all existing routes in dos.dynamic_ui_routes
-- that don't have it set, using sensible defaults based on page_type.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── Backfill mobile_variant for routes missing it ─────────────────────────────
DO $$
BEGIN
  -- Only proceed if mobile_density_preference column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'dynamic_ui_routes' AND column_name = 'mobile_density_preference'
  ) THEN
    UPDATE dos.dynamic_ui_routes
    SET mobile_variant = CASE page_type
      WHEN 'overview' THEN '{"layout":"stacked","density":"comfortable","touchEnabled":true,"gestures":["swipe"],"bottomNav":{"enabled":true,"maxItems":5},"drawer":{"enabled":true,"position":"left"}}'::jsonb
      WHEN 'list' THEN '{"layout":"stacked","density":"normal","touchEnabled":true,"gestures":["pull-to-refresh","infinite-scroll"],"bottomNav":{"enabled":true,"maxItems":5},"drawer":{"enabled":true,"position":"left"}}'::jsonb
      WHEN 'detail' THEN '{"layout":"stacked","density":"normal","touchEnabled":true,"gestures":["swipe"],"bottomNav":{"enabled":false,"maxItems":5},"drawer":{"enabled":true,"position":"left"}}'::jsonb
      WHEN 'form' THEN '{"layout":"stacked","density":"comfortable","touchEnabled":true,"gestures":[],"bottomNav":{"enabled":false,"maxItems":5},"drawer":{"enabled":true,"position":"left"}}'::jsonb
      WHEN 'dashboard' THEN '{"layout":"stacked","density":"normal","touchEnabled":true,"gestures":["pull-to-refresh"],"bottomNav":{"enabled":true,"maxItems":5},"drawer":{"enabled":true,"position":"left"}}'::jsonb
      WHEN 'report' THEN '{"layout":"stacked","density":"normal","touchEnabled":true,"gestures":["pull-to-refresh"],"bottomNav":{"enabled":true,"maxItems":5},"drawer":{"enabled":true,"position":"left"}}'::jsonb
      WHEN 'audit' THEN '{"layout":"stacked","density":"normal","touchEnabled":true,"gestures":["pull-to-refresh"],"bottomNav":{"enabled":true,"maxItems":5},"drawer":{"enabled":true,"position":"left"}}'::jsonb
      ELSE '{"layout":"stacked","density":"normal","touchEnabled":true,"gestures":[],"bottomNav":{"enabled":true,"maxItems":5},"drawer":{"enabled":true,"position":"left"}}'::jsonb
    END,
    mobile_density_preference = CASE page_type
      WHEN 'overview' THEN 'comfortable'
      WHEN 'form' THEN 'comfortable'
      ELSE 'normal'
    END
    WHERE mobile_variant IS NULL
      OR mobile_variant = '{}'::jsonb;
  END IF;
END $$;

COMMIT;
