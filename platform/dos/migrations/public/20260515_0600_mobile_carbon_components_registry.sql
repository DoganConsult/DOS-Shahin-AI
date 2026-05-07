-- =====================================================================
-- Register mobile Carbon components (20260515_0600)
--
-- Phase 2.2 — Mobile Experience Enhancement
-- Registers mobile-specific Carbon components in dos.dynamic_ui_component_registry
-- with mobile_variant_props metadata for mobile configuration.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── Register mobile Carbon components in dynamic_ui_component_registry ───────
DO $$
BEGIN
  -- Only proceed if mobile_variant_props column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dos' AND table_name = 'dynamic_ui_component_registry' AND column_name = 'mobile_variant_props'
  ) THEN
    INSERT INTO dos.dynamic_ui_component_registry
      (component_key, bundle_url, schema_version, vendor, approval_status, carbon_key, metadata, mobile_variant_props, mobile_touch_enabled, mobile_density)
    VALUES
      ('workspace.mobile.button', '/ws/mobile/button.js', 1, 'ibm-carbon', 'approved', 'button', '{"band":"mobile","position":1}'::jsonb, '{"touchTargetSize":44,"hapticFeedback":true,"density":"comfortable"}'::jsonb, true, 'comfortable'),
      ('workspace.mobile.input', '/ws/mobile/input.js', 1, 'ibm-carbon', 'approved', 'text_input', '{"band":"mobile","position":2}'::jsonb, '{"touchTargetSize":44,"fontSize":16,"autoFocus":true}'::jsonb, true, 'normal'),
      ('workspace.mobile.dropdown', '/ws/mobile/dropdown.js', 1, 'ibm-carbon', 'approved', 'dropdown', '{"band":"mobile","position":3}'::jsonb, '{"touchTargetSize":44,"fullWidth":true,"nativePicker":true}'::jsonb, true, 'normal'),
      ('workspace.mobile.data-table', '/ws/mobile/data-table.js', 1, 'ibm-carbon', 'approved', 'data_table', '{"band":"mobile","position":4}'::jsonb, '{"stackedRows":true,"horizontalScroll":true,"swipeActions":true}'::jsonb, true, 'normal'),
      ('workspace.mobile.tabs', '/ws/mobile/tabs.js', 1, 'ibm-carbon', 'approved', 'tabs', '{"band":"mobile","position":5}'::jsonb, '{"scrollable":true,"swipeNav":true,"touchTargetSize":44}'::jsonb, true, 'normal'),
      ('workspace.mobile.modal', '/ws/mobile/modal.js', 1, 'ibm-carbon', 'approved', 'modal', '{"band":"mobile","position":6}'::jsonb, '{"bottomSheet":true,"swipeDismiss":true,"backdropBlur":true}'::jsonb, true, 'normal'),
      ('workspace.mobile.card', '/ws/mobile/card.js', 1, 'ibm-carbon', 'approved', 'tile', '{"band":"mobile","position":7}'::jsonb, '{"swipeActions":true,"longPressMenu":true,"hapticFeedback":true}'::jsonb, true, 'normal')
    ON CONFLICT (component_key) DO UPDATE SET
      bundle_url = EXCLUDED.bundle_url,
      schema_version = EXCLUDED.schema_version,
      vendor = EXCLUDED.vendor,
      approval_status = EXCLUDED.approval_status,
      carbon_key = EXCLUDED.carbon_key,
      metadata = EXCLUDED.metadata,
      mobile_variant_props = EXCLUDED.mobile_variant_props,
      mobile_touch_enabled = EXCLUDED.mobile_touch_enabled,
      mobile_density = EXCLUDED.mobile_density,
      approved_at = COALESCE(dos.dynamic_ui_component_registry.approved_at, now());
  END IF;
END $$;

COMMIT;
