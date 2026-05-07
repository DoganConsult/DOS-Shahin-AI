-- 20260511_1220_foundation_workflows_route_parity_reconcile.sql
--
-- Reconcile /foundation/workflows parity across legacy 0040 routing
-- contracts and wave27 route completion seeds.

BEGIN;

UPDATE dos.dynamic_ui_routes
   SET component_key = 'module.workflow_timeline.page',
       title_key = COALESCE(NULLIF(title_key, ''), 'foundation.page.workflows.title'),
       subtitle_key = COALESCE(NULLIF(subtitle_key, ''), 'foundation.page.workflows.subtitle'),
       page_type = COALESCE(NULLIF(page_type, ''), 'workflow'),
       layout = COALESCE(NULLIF(layout, ''), 'kanban')
 WHERE path_pattern = '/foundation/workflows'
   AND tenant_id IS NULL;

UPDATE dos.dynamic_ui_route_metadata
   SET metadata = COALESCE(metadata, '{}'::jsonb)
       || jsonb_build_object(
         'pageType', 'workflow',
         'layout', 'kanban',
         'archetype', 'workflow-timeline',
         'renderMode', 'template',
         'templateBindingRequired', true
       ),
       render_mode = 'template',
       template_binding_required = true,
       updated_at = now()
 WHERE route = '/foundation/workflows';

UPDATE dos.ui_route_template_binding
   SET archetype = 'workflow-timeline',
       template_export = 'module.workflow_timeline.page',
       updated_at = now()
 WHERE route = '/foundation/workflows';

DO $$
DECLARE
  c_routes integer;
BEGIN
  SELECT COUNT(*) INTO c_routes
  FROM dos.dynamic_ui_routes
  WHERE path_pattern = '/foundation/workflows'
    AND tenant_id IS NULL
    AND component_key = 'module.workflow_timeline.page';
  IF c_routes = 0 THEN
    RAISE EXCEPTION 'workflows parity reconcile assertion failed: canonical route component missing';
  END IF;
END $$;

COMMIT;
