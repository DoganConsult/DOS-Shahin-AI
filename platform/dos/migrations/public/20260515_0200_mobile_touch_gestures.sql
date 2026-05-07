-- =====================================================================
-- Mobile touch gesture configuration (20260515_0200)
--
-- Phase 1.2 — Mobile Experience Enhancement
-- Creates dos.mobile_touch_gestures table for DB-driven touch gesture
-- configuration (swipe, pinch, long-press, double-tap).
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── Mobile touch gesture configuration ──────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.mobile_touch_gestures (
  gesture_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(64),
  gesture_type   VARCHAR(50) NOT NULL, -- swipe, pinch, long-press, double-tap
  component_key  VARCHAR(150),
  action_config  JSONB NOT NULL,
  haptic_feedback BOOLEAN DEFAULT false,
  is_active      BOOLEAN DEFAULT true
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_gesture_tenant ON dos.mobile_touch_gestures (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_gesture_component ON dos.mobile_touch_gestures (component_key);

COMMIT;
