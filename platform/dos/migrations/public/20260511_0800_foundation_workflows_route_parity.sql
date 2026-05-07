-- 20260511_0800_foundation_workflows_route_parity.sql
--
-- Wave 06: reconcile /foundation/workflows parity across route runtime,
-- route metadata, and template binding.
--
-- Idempotent and additive.

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
   SET render_mode = 'template',
       template_binding_required = true,
       metadata_public = true,
       metadata = jsonb_set(
         jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{renderMode}',
           '"template"'::jsonb,
           true
         ),
         '{templateBindingRequired}',
         'true'::jsonb,
         true
       ),
       updated_at = now()
 WHERE route = '/foundation/workflows';

UPDATE dos.ui_route_template_binding
   SET archetype = 'workflow-timeline',
       template_export = 'module.workflow_timeline.page',
       title_en = 'Workflows',
       title_ar = 'سير العمل',
       subtitle_en = 'Foundation workflow definitions and execution status.',
       subtitle_ar = 'تعريفات سير عمل المؤسسة وحالة التنفيذ.',
       eyebrow_en = 'Foundation',
       eyebrow_ar = 'Foundation',
       ai_headline_en = 'Route contract: workflows.timeline',
       ai_headline_ar = 'عقد المسار: workflows.timeline',
       status_tags = jsonb_build_array(
         jsonb_build_object('label', 'DB-driven', 'severity', 'success'),
         jsonb_build_object('label', 'Template', 'severity', 'info')
       ),
       primary_action = jsonb_build_object(
         'id', 'workflows.create',
         'label', 'Create workflow',
         'route', '/foundation/workflows/new',
         'action', jsonb_build_object('kind', 'navigate', 'path', '/foundation/workflows/new')
       ),
       props = jsonb_set(
         COALESCE(props, '{}'::jsonb),
         '{pillars}',
         jsonb_build_object(
           'labels', jsonb_build_object(
             'whatChanged', 'Workflow state',
             'whyItMatters', 'Why it matters',
             'riskOrOpportunity', 'Risk exposure',
             'nextAction', 'What should I do?',
             'evidence', 'Evidence basis'
           ),
           'whatChanged', 'Workflow lifecycle and handoff status across approval streams.',
           'whyItMatters', 'Workflow drift introduces approval bottlenecks.',
           'riskOrOpportunity', 'Stalled steps increase unresolved access and control exceptions.',
           'nextAction', jsonb_build_object('label', 'Create workflow'),
           'evidence', 'Derived from workflow timeline step contracts.'
         ),
         true
       ),
       updated_at = now()
 WHERE route = '/foundation/workflows';

INSERT INTO dos.ui_route_workflow_timeline_step (
  route, sort_order, step_id, label_en, label_ar, state, description, occurred_at, actor
)
VALUES
  ('/foundation/workflows', 10, 'wf-foundation-1', 'Draft workflow', 'صياغة سير العمل', 'complete', 'Workflow drafted and validated by governance owner.', '2026-05-01T09:00:00Z'::timestamptz, 'governance-owner@grc'),
  ('/foundation/workflows', 20, 'wf-foundation-2', 'Risk review', 'مراجعة المخاطر', 'complete', 'Risk scoring and control mapping completed.', '2026-05-02T11:00:00Z'::timestamptz, 'risk-lead@grc'),
  ('/foundation/workflows', 30, 'wf-foundation-3', 'Approval routing', 'توجيه الموافقات', 'current', 'Routing through delegated signoff authorities.', '2026-05-03T13:00:00Z'::timestamptz, 'workflow-engine@grc'),
  ('/foundation/workflows', 40, 'wf-foundation-4', 'Evidence attach', 'إرفاق الأدلة', 'incomplete', 'Evidence package pending compliance attachment.', NULL, 'compliance-lead@grc'),
  ('/foundation/workflows', 50, 'wf-foundation-5', 'Publish', 'النشر', 'incomplete', 'Workflow publish pending completion of prior gates.', NULL, 'platform-admin@grc')
ON CONFLICT (route, step_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  label_en = EXCLUDED.label_en,
  label_ar = EXCLUDED.label_ar,
  state = EXCLUDED.state,
  description = EXCLUDED.description,
  occurred_at = EXCLUDED.occurred_at,
  actor = EXCLUDED.actor;

DO $$
DECLARE
  route_rows integer;
  timeline_rows integer;
BEGIN
  SELECT COUNT(*) INTO route_rows
  FROM dos.dynamic_ui_routes
  WHERE path_pattern = '/foundation/workflows'
    AND tenant_id IS NULL
    AND component_key = 'module.workflow_timeline.page';

  IF route_rows = 0 THEN
    RAISE EXCEPTION 'workflows parity assertion failed: component_key not reconciled';
  END IF;

  SELECT COUNT(*) INTO timeline_rows
  FROM dos.ui_route_workflow_timeline_step
  WHERE route = '/foundation/workflows';

  IF timeline_rows < 5 THEN
    RAISE EXCEPTION 'workflows parity assertion failed: expected >= 5 timeline rows, got %', timeline_rows;
  END IF;
END $$;

COMMIT;
