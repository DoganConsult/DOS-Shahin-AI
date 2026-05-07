-- =====================================================================
-- Seed mobile configs for all tenants (20260515_1300)
--
-- Mobile Experience Enhancement
-- Seeds mobile breakpoint configs (shared) and component variants (tenant-specific).
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── Seed mobile breakpoint configs (shared across all tenants) ───────────
-- These use NULL tenant_id to indicate shared configuration
INSERT INTO dos.mobile_breakpoint_config (tenant_id, breakpoint_key, min_px, max_px, default_behavior, is_active)
VALUES
  (NULL, 'mobile', 0, 480, 'stacked', true),
  (NULL, 'tablet', 481, 1024, 'sidebar', true),
  (NULL, 'desktop', 1025, 9999, 'sidebar', true)
ON CONFLICT (breakpoint_key) DO UPDATE SET
  min_px = EXCLUDED.min_px,
  max_px = EXCLUDED.max_px,
  default_behavior = EXCLUDED.default_behavior,
  is_active = EXCLUDED.is_active;

-- ── Seed mobile component variants for all tenants ────────────────────────────
-- These are tenant-specific so each tenant gets their own copy
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT tenant_id FROM dos.tenants LOOP
    -- Insert button variant
    INSERT INTO dos.mobile_component_variants (component_key, variant_name, breakpoint, props_override)
    VALUES ('workspace.mobile.button', 'default-mobile', 'mobile', '{"touchTargetSize":44,"hapticFeedback":true,"density":"comfortable"}'::jsonb)
    ON CONFLICT (component_key, variant_name, breakpoint) DO NOTHING;

    -- Insert input variant
    INSERT INTO dos.mobile_component_variants (component_key, variant_name, breakpoint, props_override)
    VALUES ('workspace.mobile.input', 'default-mobile', 'mobile', '{"touchTargetSize":44,"fontSize":16,"autoFocus":true}'::jsonb)
    ON CONFLICT (component_key, variant_name, breakpoint) DO NOTHING;

    -- Insert dropdown variant
    INSERT INTO dos.mobile_component_variants (component_key, variant_name, breakpoint, props_override)
    VALUES ('workspace.mobile.dropdown', 'default-mobile', 'mobile', '{"touchTargetSize":44,"fullWidth":true,"nativePicker":true}'::jsonb)
    ON CONFLICT (component_key, variant_name, breakpoint) DO NOTHING;

    -- Insert data-table variant
    INSERT INTO dos.mobile_component_variants (component_key, variant_name, breakpoint, props_override)
    VALUES ('workspace.mobile.data-table', 'default-mobile', 'mobile', '{"stackedRows":true,"horizontalScroll":true,"swipeActions":true}'::jsonb)
    ON CONFLICT (component_key, variant_name, breakpoint) DO NOTHING;

    -- Insert tabs variant
    INSERT INTO dos.mobile_component_variants (component_key, variant_name, breakpoint, props_override)
    VALUES ('workspace.mobile.tabs', 'default-mobile', 'mobile', '{"scrollable":true,"swipeNav":true,"touchTargetSize":44}'::jsonb)
    ON CONFLICT (component_key, variant_name, breakpoint) DO NOTHING;

    -- Insert modal variant
    INSERT INTO dos.mobile_component_variants (component_key, variant_name, breakpoint, props_override)
    VALUES ('workspace.mobile.modal', 'default-mobile', 'mobile', '{"bottomSheet":true,"swipeDismiss":true,"backdropBlur":true}'::jsonb)
    ON CONFLICT (component_key, variant_name, breakpoint) DO NOTHING;

    -- Insert card variant
    INSERT INTO dos.mobile_component_variants (component_key, variant_name, breakpoint, props_override)
    VALUES ('workspace.mobile.card', 'default-mobile', 'mobile', '{"swipeActions":true,"longPressMenu":true,"hapticFeedback":true}'::jsonb)
    ON CONFLICT (component_key, variant_name, breakpoint) DO NOTHING;
  END LOOP;
END $$;

COMMIT;
