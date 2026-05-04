-- Migration: 20260504_0400_marketing_gap_registry.sql
-- Registers 4 missing marketing component_keys identified in the visual gap audit.
-- All carbon_keys verified runtime_status='active', dynamic_ui_allowed=true.

BEGIN;

INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata)
VALUES
  -- marketing.platform.page — added in Wave 4 but missing from registry
  ('marketing.platform.page', 'ibm-carbon', 'approved', 'tabs', '1',
   '{"label": "Platform Overview", "archetype": "marketing-landing", "note": "tabs-driven platform feature overview"}'::jsonb),
  -- Section-level registry entries for gap components
  ('marketing.logos.section',   'ibm-carbon', 'approved', 'contained-list', '1',
   '{"label": "Customer Logos", "section": "logos", "kind": "on-page"}'::jsonb),
  ('marketing.trust.section',   'ibm-carbon', 'approved', 'notification', '1',
   '{"label": "Trust & Compliance Summary", "section": "trust-pills", "variant": "inline"}'::jsonb),
  ('marketing.agentic.section', 'ibm-carbon', 'approved', 'tiles', '1',
   '{"label": "Agentic Proof", "section": "agentic-proof", "uses": ["tiles", "toggletip", "progress-bar"]}'::jsonb)
ON CONFLICT (component_key) DO UPDATE
  SET carbon_key      = EXCLUDED.carbon_key,
      approval_status = EXCLUDED.approval_status,
      metadata        = EXCLUDED.metadata,
      approved_at     = now();

COMMIT;
