-- =====================================================================
-- Foundation Module — Root Route Contract Seed
-- =====================================================================
-- Closes the only remaining contract gap on the foundation module:
--
--   - /foundation root route had metadata_public=false and NO
--     ui_route_template_binding row, so any caller hitting /foundation
--     without a deep-link suffix saw a 401 on /api/ui-os/route-metadata
--     and a missing template binding from /api/ui-os/template-binding.
--
-- All other 44 /foundation/* routes already carry metadata_public=true
-- AND a typed ui_route_template_binding row.
--
-- Idempotent. Test-DB safe. NO destructive ops.
-- =====================================================================

BEGIN;

-- 1. Mark /foundation root metadata public so the FE preload stops
--    leaking 401 on shell route-metadata for the canonical module entry.
UPDATE dos.dynamic_ui_route_metadata
   SET metadata_public = true,
       updated_at = now()
 WHERE route = '/foundation'
   AND metadata_public = false;

-- 2. Bind /foundation root to the same archetype + template_export used
--    by /foundation/overview (canonical module landing). The
--    `template_export` MUST exist in dos.dynamic_ui_component_registry —
--    enforced by trg_validate_template_export.
INSERT INTO dos.ui_route_template_binding (
  route, archetype, template_export, props,
  title_en, title_ar, eyebrow_en, eyebrow_ar,
  status_tags, primary_action
)
SELECT '/foundation',
       'command-home',
       'ModuleOverviewTemplateComponent',
       '{}'::jsonb,
       'Foundation',
       'الأساس',
       'Module',
       'الوحدة',
       '[]'::jsonb,
       NULL
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.ui_route_template_binding WHERE route = '/foundation'
 );

-- 3. Final assertions — fail the migration loud if either fix did not land.
DO $$
DECLARE
  v_meta_public boolean;
  v_binding_count int;
BEGIN
  SELECT metadata_public INTO v_meta_public
    FROM dos.dynamic_ui_route_metadata WHERE route='/foundation';
  IF v_meta_public IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL: /foundation metadata_public did not land';
  END IF;

  SELECT count(*) INTO v_binding_count
    FROM dos.ui_route_template_binding WHERE route='/foundation';
  IF v_binding_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: /foundation template binding row count = %, expected 1', v_binding_count;
  END IF;

  RAISE NOTICE 'OK: /foundation root contract seeded (metadata_public=true, binding=1)';
END $$;

COMMIT;
