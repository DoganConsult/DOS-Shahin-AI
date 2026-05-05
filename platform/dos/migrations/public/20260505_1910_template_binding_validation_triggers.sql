-- =============================================================================
-- Migration: 20260505_1910_template_binding_validation_triggers
-- Purpose:   Add trigger-based validation to prevent template binding gaps.
--            Alternative to FK constraints when ALTER TABLE permissions are not available.
--
-- Issue:     Template bindings could reference components not in the registry,
--            causing runtime resolution failures. FK constraints require elevated
--            permissions to add.
--
-- Fix:       Add validation triggers that check template_export references exist
--            in registry and carbon_keys reference valid IBM Carbon components
--            before allowing INSERT/UPDATE operations.
--
-- Idempotent: YES — DROP TRIGGER IF EXISTS pattern.
-- =============================================================================

BEGIN;

-- ─── 1. Validation function for template_export references ─────────────────
CREATE OR REPLACE FUNCTION dos.validate_template_export_registry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.template_export IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM dos.dynamic_ui_component_registry
      WHERE component_key = NEW.template_export
      AND approval_status = 'approved'
    ) THEN
      RAISE EXCEPTION 'template_export "%" does not exist in dynamic_ui_component_registry or is not approved',
        NEW.template_export;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 2. Validation function for carbon_key references ───────────────────────
CREATE OR REPLACE FUNCTION dos.validate_carbon_key_exists()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.carbon_key IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM dos.ui_carbon_components
      WHERE carbon_key = NEW.carbon_key
    ) THEN
      RAISE EXCEPTION 'carbon_key "%" does not exist in ui_carbon_components',
        NEW.carbon_key;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 3. Apply triggers to ui_route_template_binding ────────────────────────
DROP TRIGGER IF EXISTS trg_validate_template_export ON dos.ui_route_template_binding;
CREATE TRIGGER trg_validate_template_export
BEFORE INSERT OR UPDATE OF template_export ON dos.ui_route_template_binding
FOR EACH ROW
EXECUTE FUNCTION dos.validate_template_export_registry();

-- ─── 4. Apply triggers to dynamic_ui_component_registry ───────────────────
DROP TRIGGER IF EXISTS trg_validate_carbon_key ON dos.dynamic_ui_component_registry;
CREATE TRIGGER trg_validate_carbon_key
BEFORE INSERT OR UPDATE OF carbon_key ON dos.dynamic_ui_component_registry
FOR EACH ROW
EXECUTE FUNCTION dos.validate_carbon_key_exists();

-- ─── 5. Self-assertion: validate triggers are in place ─────────────────────
DO $$
DECLARE
  template_trigger_count INTEGER;
  carbon_trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_trigger_count
  FROM pg_trigger
  WHERE tgname = 'trg_validate_template_export'
  AND tgrelid = 'dos.ui_route_template_binding'::regclass;
  
  IF template_trigger_count <> 1 THEN
    RAISE EXCEPTION 'template_export validation trigger not found on ui_route_template_binding';
  END IF;

  SELECT COUNT(*) INTO carbon_trigger_count
  FROM pg_trigger
  WHERE tgname = 'trg_validate_carbon_key'
  AND tgrelid = 'dos.dynamic_ui_component_registry'::regclass;
  
  IF carbon_trigger_count <> 1 THEN
    RAISE EXCEPTION 'carbon_key validation trigger not found on dynamic_ui_component_registry';
  END IF;
END $$;

COMMIT;
