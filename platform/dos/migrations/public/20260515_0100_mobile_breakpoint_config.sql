-- =====================================================================
-- Mobile breakpoint configuration (20260515_0100)
--
-- Phase 1.2 — Mobile Experience Enhancement
-- Creates dos.mobile_breakpoint_config table to replace hardcoded @media queries
-- with DB-driven breakpoint configurations.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── Mobile breakpoint configuration (replaces hardcoded @media queries) ──
CREATE TABLE IF NOT EXISTS dos.mobile_breakpoint_config (
  tenant_id       VARCHAR(64),
  breakpoint_key  VARCHAR(50) PRIMARY KEY,
  min_px          INTEGER NOT NULL,
  max_px          INTEGER NOT NULL,
  default_behavior VARCHAR(100),
  is_active       BOOLEAN DEFAULT true
);

-- Index for tenant-scoped lookups
CREATE INDEX IF NOT EXISTS idx_breakpoint_tenant ON dos.mobile_breakpoint_config (tenant_id, is_active);

-- ── Seed default breakpoint configurations (platform defaults) ─────────
INSERT INTO dos.mobile_breakpoint_config (breakpoint_key, min_px, max_px, default_behavior, is_active)
VALUES
  ('mobile', 0, 480, 'stacked', true),
  ('tablet', 481, 1024, 'sidebar', true),
  ('desktop', 1025, 9999, 'sidebar', true)
ON CONFLICT (breakpoint_key) DO NOTHING;

COMMIT;
