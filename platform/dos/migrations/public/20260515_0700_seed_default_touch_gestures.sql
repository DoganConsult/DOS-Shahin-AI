-- =====================================================================
-- Seed default touch gestures (20260515_0700)
--
-- Phase 3.3 — Mobile Experience Enhancement
-- Seeds default touch gesture configurations in dos.mobile_touch_gestures
-- for common mobile interactions (swipe, pinch, long-press, etc.).
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── Seed default touch gesture configurations (platform defaults) ─────────────
INSERT INTO dos.mobile_touch_gestures
  (gesture_type, component_key, action_config, haptic_feedback, is_active)
VALUES
  ('swipe-left', 'workspace.mobile.card', '{"kind":"navigate","path":"/detail"}'::jsonb, true, true),
  ('swipe-right', 'workspace.mobile.card', '{"kind":"dispatch_event","eventName":"delete"}'::jsonb, true, true),
  ('long-press', 'workspace.mobile.card', '{"kind":"open_context_tab","tab":"menu"}'::jsonb, true, true),
  ('pull-to-refresh', 'workspace.mobile.data-table', '{"kind":"dispatch_event","eventName":"refresh"}'::jsonb, true, true),
  ('infinite-scroll', 'workspace.mobile.data-table', '{"kind":"dispatch_event","eventName":"loadMore"}'::jsonb, false, true),
  ('swipe-delete', 'workspace.mobile.data-table', '{"kind":"delete"}'::jsonb, true, true)
ON CONFLICT DO NOTHING;

COMMIT;
