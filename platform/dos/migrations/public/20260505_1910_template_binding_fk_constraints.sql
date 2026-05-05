-- =============================================================================
-- Migration: 20260505_1910_template_binding_fk_constraints
-- Purpose:   Add FK and check constraints to prevent template binding gaps.
--
-- Issue:     Template bindings could reference components not in the registry,
--            causing runtime resolution failures.
--
-- Fix:       Add FK constraint on template_export to ensure all references exist
--            in dynamic_ui_component_registry. Add check constraint to ensure
--            all carbon_keys reference valid IBM Carbon components.
--
-- Idempotent: YES — IF NOT EXISTS pattern for constraints.
-- =============================================================================

BEGIN;

-- Add FK constraint to ensure template_export references exist in registry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_template_export_registry'
  ) THEN
    ALTER TABLE dos.ui_route_template_binding
    ADD CONSTRAINT fk_template_export_registry
    FOREIGN KEY (template_export)
    REFERENCES dos.dynamic_ui_component_registry(component_key)
    ON DELETE RESTRICT;
  END IF;
END $$;

-- NOTE: A cross-table CHECK constraint (CHECK (carbon_key IN (SELECT …)))
-- is rejected by PostgreSQL because CHECK predicates cannot reference other
-- tables. Carbon-key existence is enforced by the
-- 20260505_1910_template_binding_validation_triggers migration via
-- trg_validate_carbon_key on dos.dynamic_ui_component_registry. We attempt
-- a real FOREIGN KEY here when ui_carbon_components carries a UNIQUE/PK
-- on (carbon_key); otherwise we skip silently and rely on the trigger.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_class t  ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'dos'
       AND t.relname = 'ui_carbon_components'
       AND c.contype IN ('p','u')
       AND (
         SELECT array_agg(a.attname ORDER BY a.attnum)
           FROM unnest(c.conkey) ck
           JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ck
       ) = ARRAY['carbon_key']::name[]
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='fk_carbon_key_registry'
  ) THEN
    ALTER TABLE dos.dynamic_ui_component_registry
    ADD CONSTRAINT fk_carbon_key_registry
    FOREIGN KEY (carbon_key)
    REFERENCES dos.ui_carbon_components(carbon_key)
    ON DELETE RESTRICT;
  END IF;
END $$;

COMMIT;
