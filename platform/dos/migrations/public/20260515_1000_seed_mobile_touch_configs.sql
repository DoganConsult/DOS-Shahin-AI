-- =====================================================================
-- Seed mobile touch configs (20260515_1000)
--
-- Phase 5.2 — Mobile Experience Enhancement
-- Seeds default mobile_touch_config by route type for dos.dynamic_ui_routes.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── Seed default mobile_touch_config by route type ─────────────────────────────
DO $$
BEGIN
  -- Only proceed if mobile_touch_config column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'dynamic_ui_routes' AND column_name = 'mobile_touch_config'
  ) THEN
    UPDATE dos.dynamic_ui_routes
    SET mobile_touch_config = CASE page_type
      WHEN 'list' THEN '{"swipeToNavigate":true,"pullToRefresh":true,"longPressMenu":true,"hapticFeedback":true}'::jsonb
      WHEN 'detail' THEN '{"swipeToNavigate":true,"pullToRefresh":false,"longPressMenu":true,"hapticFeedback":true}'::jsonb
      WHEN 'overview' THEN '{"swipeToNavigate":true,"pullToRefresh":true,"longPressMenu":false,"hapticFeedback":true}'::jsonb
      WHEN 'dashboard' THEN '{"swipeToNavigate":true,"pullToRefresh":true,"longPressMenu":false,"hapticFeedback":true}'::jsonb
      ELSE '{"swipeToNavigate":true,"pullToRefresh":false,"longPressMenu":false,"hapticFeedback":true}'::jsonb
    END
    WHERE mobile_touch_config IS NULL
      OR mobile_touch_config = '{}'::jsonb;
  END IF;
END $$;

COMMIT;
