-- =====================================================================
-- Mobile component variant registry (20260515_0300)
--
-- Phase 1.2 — Mobile Experience Enhancement
-- Creates dos.mobile_component_variants table for mobile-specific
-- component variant configurations (props_override, layout_override).
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── Mobile component variant registry ─────────────────────────────────
CREATE TABLE IF NOT EXISTS dos.mobile_component_variants (
  variant_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       VARCHAR(64),
  component_key   VARCHAR(150) NOT NULL,
  variant_name    VARCHAR(100) NOT NULL,
  breakpoint      VARCHAR(20) NOT NULL, -- mobile, tablet, desktop
  props_override  JSONB NOT NULL DEFAULT '{}'::jsonb,
  layout_override JSONB,
  UNIQUE(component_key, variant_name, breakpoint)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_variant_tenant ON dos.mobile_component_variants (tenant_id);
CREATE INDEX IF NOT EXISTS idx_variant_component ON dos.mobile_component_variants (component_key, breakpoint);

COMMIT;
