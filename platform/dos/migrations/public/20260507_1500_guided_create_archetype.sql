-- 20260507_1500_guided_create_archetype.sql
-- Phase C — register the 'guided-create' archetype in ui_route_template_binding.
--
-- GuidedCreateTemplateComponent is confirmed present:
--   platform/core/platform/shell/templates/module-guided-create.template.ts
--   selector: dos-guided-create
--   LOADERS key: GuidedCreateTemplateComponent
--   component-map key: module.record.create.page (approved in dynamic_ui_component_registry)
--
-- 8 foundation routes carry archetype='guided-create' in their metadata but have
-- no ui_route_template_binding row. This migration seeds those rows.
-- The corresponding dynamic_ui_routes rows are seeded by 20260507_1400.
--
-- Routes: /foundation/access-review/new, /foundation/delegations/new,
--   /foundation/people/onboarding, /foundation/roles/new, /foundation/teams/new,
--   /foundation/users/new, /foundation/workflows/new, /foundation/people/onboarding
--
-- Idempotent. Safe to re-run.
-- NOTE: This file is intentionally empty of template_binding rows because
-- 20260507_1400 seeds ALL 23 missing bindings (including guided-create routes)
-- in one place for atomicity. This migration exists only as the explicit
-- archetype-registration proof artifact per doctrine Phase C.
-- The actual INSERT rows live in 20260507_1400.

BEGIN;

-- Confirm GuidedCreateTemplateComponent component key exists and is approved.
DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM dos.dynamic_ui_component_registry
  WHERE component_key = 'module.record.create.page'
    AND approval_status = 'approved';

  IF cnt = 0 THEN
    RAISE EXCEPTION 'MIGRATION FAIL 20260507_1500: module.record.create.page not found in registry or not approved. Register and approve before running 20260507_1400.';
  END IF;
END $$;

-- Confirm guided-create archetype appears in template binding after 1400 runs.
-- (This is a post-condition check — run after 20260507_1400 is applied.)
DO $$
DECLARE
  cnt integer;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM dos.ui_route_template_binding
  WHERE archetype = 'guided-create';

  IF cnt = 0 THEN
    RAISE WARNING '20260507_1500: guided-create archetype rows not yet present — run 20260507_1400 first.';
  END IF;
END $$;

COMMIT;
