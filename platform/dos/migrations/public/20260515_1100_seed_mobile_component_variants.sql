-- =====================================================================
-- Seed mobile component variants (20260515_1100)
--
-- Phase 5.3 — Mobile Experience Enhancement
-- Seeds default mobile component variants in dos.mobile_component_variants
-- for the 8 mobile Carbon components.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dos;

-- ── Seed default mobile component variants ───────────────────────────────────────
DO $$
BEGIN
  -- Only proceed if mobile_component_variants table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'dos' AND table_name = 'mobile_component_variants'
  ) THEN
    INSERT INTO dos.mobile_component_variants
      (component_key, variant_name, breakpoint, props_override, layout_override)
    VALUES
      ('workspace.mobile.button', 'default-mobile', 'mobile', '{"touchTargetSize":44,"hapticFeedback":true,"density":"comfortable"}'::jsonb, NULL),
      ('workspace.mobile.input', 'default-mobile', 'mobile', '{"touchTargetSize":44,"fontSize":16,"autoFocus":true}'::jsonb, NULL),
      ('workspace.mobile.dropdown', 'default-mobile', 'mobile', '{"touchTargetSize":44,"fullWidth":true,"nativePicker":true}'::jsonb, NULL),
      ('workspace.mobile.data-table', 'default-mobile', 'mobile', '{"stackedRows":true,"horizontalScroll":true,"swipeActions":true}'::jsonb, NULL),
      ('workspace.mobile.tabs', 'default-mobile', 'mobile', '{"scrollable":true,"swipeNav":true,"touchTargetSize":44}'::jsonb, NULL),
      ('workspace.mobile.modal', 'default-mobile', 'mobile', '{"bottomSheet":true,"swipeDismiss":true,"backdropBlur":true}'::jsonb, NULL),
      ('workspace.mobile.card', 'default-mobile', 'mobile', '{"swipeActions":true,"longPressMenu":true,"hapticFeedback":true}'::jsonb, NULL),
      ('workspace.mobile.form', 'default-mobile', 'mobile', '{"stackedLayout":true,"largerInputs":true,"autoScrollErrors":true}'::jsonb, NULL)
    ON CONFLICT (component_key, variant_name, breakpoint) DO NOTHING;
  END IF;
END $$;

COMMIT;
