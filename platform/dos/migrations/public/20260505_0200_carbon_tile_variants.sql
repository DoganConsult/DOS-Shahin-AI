-- Phase WS-8 — Carbon Tile Variants Registration.
-- Owner: ui-os-service.
--
-- Registers IBM Carbon tile variants that are available in Carbon Design System
-- but not yet in dos.ui_carbon_components:
--   1. selectable-tile
--   2. clickable-tile
--   3. expandable-tile
--   4. ai-tile
--
-- These tile variants provide enhanced functionality for workspace shell UX
-- enhancements (favorites, recent-items, saved-views) beyond the basic tiles
-- component already registered.
--
-- Carbon-only: every row carries vendor='ibm-carbon' so the
-- trg_carbon_only_runtime trigger accepts it.
--
-- Forward-only and idempotent (ON CONFLICT DO UPDATE / IF NOT EXISTS).

BEGIN;

-- Register the 4 new Carbon tile variants
INSERT INTO dos.ui_carbon_components
  (carbon_key, package_name, package_version, category, is_experimental,
   is_active, runtime_status, angular_native, wrapper_required, stability,
   dynamic_ui_allowed, vendor, integration_mode)
VALUES
  ('selectable-tile', 'carbon-components-angular', '5.69.0', 'component', false,
   true, 'active', true, true, 'stable', true, 'ibm-carbon', 'native-angular'),
  ('clickable-tile', 'carbon-components-angular', '5.69.0', 'component', false,
   true, 'active', true, true, 'stable', true, 'ibm-carbon', 'native-angular'),
  ('expandable-tile', 'carbon-components-angular', '5.69.0', 'component', false,
   true, 'active', true, true, 'stable', true, 'ibm-carbon', 'native-angular'),
  ('ai-tile', 'carbon-components-angular', '5.69.0', 'component', true,
   true, 'active', true, true, 'experimental', true, 'ibm-carbon', 'native-angular')
ON CONFLICT (carbon_key) DO UPDATE SET
  package_name      = EXCLUDED.package_name,
  package_version  = EXCLUDED.package_version,
  category         = EXCLUDED.category,
  is_experimental  = EXCLUDED.is_experimental,
  is_active        = EXCLUDED.is_active,
  runtime_status   = EXCLUDED.runtime_status,
  angular_native   = EXCLUDED.angular_native,
  wrapper_required = EXCLUDED.wrapper_required,
  stability        = EXCLUDED.stability,
  dynamic_ui_allowed = EXCLUDED.dynamic_ui_allowed,
  vendor           = EXCLUDED.vendor,
  integration_mode = EXCLUDED.integration_mode;

COMMIT;
