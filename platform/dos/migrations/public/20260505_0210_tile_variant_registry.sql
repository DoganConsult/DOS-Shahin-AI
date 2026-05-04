-- Phase WS-9 — Tile Variant Component Registry.
-- Owner: ui-os-service.
--
-- Registers the 4 Carbon tile variants in dos.dynamic_ui_component_registry
-- with appropriate component keys for use in workspace shell UX enhancements:
--   1. workspace.selectable-tile
--   2. workspace.clickable-tile
--   3. workspace.expandable-tile
--   4. workspace.ai-tile
--
-- These can be used for favorites, recent-items, saved-views with enhanced
-- interactivity (selection, click navigation, expand/collapse, AI styling).
--
-- Carbon-only: every row carries vendor='ibm-carbon' so the
-- trg_carbon_only_runtime trigger accepts it.
--
-- Forward-only and idempotent (ON CONFLICT DO UPDATE / IF NOT EXISTS).

BEGIN;

-- Register the 4 tile variant component keys
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, bundle_url, schema_version, vendor, approval_status, carbon_key, metadata)
VALUES
  ('workspace.selectable-tile', '/shell/selectable-tile.bundle.js', 1, 'ibm-carbon', 'approved', 'selectable-tile',
     jsonb_build_object('selector','dos-selectable-tile','family','workspace-shell','variant','selectable','permission_aware',true,'source_table','dos.ui_favorites')),
  ('workspace.clickable-tile', '/shell/clickable-tile.bundle.js', 1, 'ibm-carbon', 'approved', 'clickable-tile',
     jsonb_build_object('selector','dos-clickable-tile','family','workspace-shell','variant','clickable','permission_aware',true,'navigation',true)),
  ('workspace.expandable-tile', '/shell/expandable-tile.bundle.js', 1, 'ibm-carbon', 'approved', 'expandable-tile',
     jsonb_build_object('selector','dos-expandable-tile','family','workspace-shell','variant','expandable','permission_aware',true,'collapsible',true)),
  ('workspace.ai-tile', '/shell/ai-tile.bundle.js', 1, 'ibm-carbon', 'approved', 'ai-tile',
     jsonb_build_object('selector','dos-ai-tile','family','workspace-shell','variant','ai','permission_aware',true,'ai_label',true,'experimental',true))
ON CONFLICT (component_key) DO UPDATE SET
  bundle_url      = EXCLUDED.bundle_url,
  schema_version  = EXCLUDED.schema_version,
  vendor          = EXCLUDED.vendor,
  approval_status = EXCLUDED.approval_status,
  carbon_key      = EXCLUDED.carbon_key,
  metadata        = EXCLUDED.metadata,
  approved_at     = COALESCE(dos.dynamic_ui_component_registry.approved_at, now());

COMMIT;
