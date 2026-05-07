-- 20260511_1230_foundation_missing_route_contract_closure.sql
--
-- Closes missing Foundation route contracts for runtime-emitted navigation
-- targets and previously widget-only deep routes.

BEGIN;

WITH route_contracts AS (
  SELECT *
  FROM (
    VALUES
      ('/foundation/users/new',                    'module.records.page',            'foundation.user.write',       1010, 'guided-create',    'GuidedCreateTemplateComponent',        'Users onboarding'),
      ('/foundation/teams/new',                    'module.org_chart.page',          'foundation.data.read',        1020, 'guided-create',    'GuidedCreateTemplateComponent',        'Teams onboarding'),
      ('/foundation/roles/new',                    'module.records.page',            'foundation.rbac.read',        1030, 'guided-create',    'GuidedCreateTemplateComponent',        'Roles onboarding'),
      ('/foundation/delegations/new',              'module.delegation_center.page',  'foundation.data.read',        1040, 'guided-create',    'GuidedCreateTemplateComponent',        'Delegation enrollment'),
      ('/foundation/access-review/new',            'module.workflows.page',          'foundation.review.read',      1050, 'guided-create',    'GuidedCreateTemplateComponent',        'Access review campaign create'),
      ('/foundation/access-review/escalations',    'module.workflows.page',          'foundation.review.read',      1060, 'workflow-control', 'ModuleAssessmentsTemplateComponent',   'Access review escalation queue'),
      ('/foundation/workflows/new',                'module.workflow_timeline.page',  'foundation.workflows.read',   1070, 'guided-create',    'GuidedCreateTemplateComponent',        'Workflow authoring'),
      ('/foundation/people/onboarding',            'module.records.page',            'foundation.user.write',       1080, 'guided-create',    'GuidedCreateTemplateComponent',        'People onboarding runway'),
      ('/foundation/people/lifecycle',             'module.workflow_timeline.page',  'foundation.user.write',       1090, 'workflow-timeline','WorkflowTimelineTemplateComponent',     'People lifecycle timeline'),
      ('/foundation/people/probation-due',         'module.workflow_timeline.page',  'foundation.user.write',       1100, 'workflow-timeline','WorkflowTimelineTemplateComponent',     'People probation queue'),
      ('/foundation/governance/authority-matrix',  'module.ownership_map.page',      'foundation.ownership.read',   1110, 'ownership-map',     'OwnershipMapTemplateComponent',        'Authority matrix'),
      ('/foundation/governance/sod-rules',         'module.settings.page',           'foundation.sod.write',        1120, 'module-settings',   'ModuleSettingsTemplateComponent',      'SoD rules'),
      ('/foundation/governance/sod-violations',    'module.workflows.page',          'foundation.sod.write',        1130, 'workflow-control',  'ModuleAssessmentsTemplateComponent',   'SoD violations workflow'),
      ('/foundation/governance/policy-acks',       'module.records.page',            'foundation.data.read',        1140, 'intelligent-register','ModuleRecordsTemplateComponent',      'Policy acknowledgements'),
      ('/foundation/governance/training',          'module.records.page',            'foundation.data.read',        1150, 'intelligent-register','ModuleRecordsTemplateComponent',      'Governance training'),
      ('/foundation/governance/coi',               'module.records.page',            'foundation.data.read',        1160, 'intelligent-register','ModuleRecordsTemplateComponent',      'Conflict of interest register')
  ) AS t(route, component_key, permission_key, sort_order, archetype, template_export, notes)
)
INSERT INTO dos.dynamic_ui_routes (
  tenant_id, module_code, path_pattern, component_key, permission_key, sort_order,
  readiness, page_type, layout, title_key, subtitle_key, created_at
)
SELECT
  NULL, 'foundation', c.route, c.component_key, c.permission_key, c.sort_order,
  'ga', 'workflow', 'detail',
  'foundation.page.dynamic.title',
  'foundation.page.dynamic.subtitle',
  now()
FROM route_contracts c
ON CONFLICT (module_code, path_pattern) WHERE tenant_id IS NULL
DO UPDATE SET
  component_key = EXCLUDED.component_key,
  permission_key = EXCLUDED.permission_key,
  sort_order = EXCLUDED.sort_order;

WITH route_contracts AS (
  SELECT *
  FROM (
    VALUES
      ('/foundation/users/new',                    'guided-create',       'Users onboarding'),
      ('/foundation/teams/new',                    'guided-create',       'Teams onboarding'),
      ('/foundation/roles/new',                    'guided-create',       'Roles onboarding'),
      ('/foundation/delegations/new',              'guided-create',       'Delegation enrollment'),
      ('/foundation/access-review/new',            'guided-create',       'Access review campaign create'),
      ('/foundation/access-review/escalations',    'workflow-control',    'Access review escalation queue'),
      ('/foundation/workflows/new',                'guided-create',       'Workflow authoring'),
      ('/foundation/people/onboarding',            'guided-create',       'People onboarding runway'),
      ('/foundation/people/lifecycle',             'workflow-timeline',   'People lifecycle timeline'),
      ('/foundation/people/probation-due',         'workflow-timeline',   'People probation queue'),
      ('/foundation/governance/authority-matrix',  'ownership-map',       'Authority matrix'),
      ('/foundation/governance/sod-rules',         'module-settings',     'SoD rules'),
      ('/foundation/governance/sod-violations',    'workflow-control',    'SoD violations workflow'),
      ('/foundation/governance/policy-acks',       'intelligent-register','Policy acknowledgements'),
      ('/foundation/governance/training',          'intelligent-register','Governance training'),
      ('/foundation/governance/coi',               'intelligent-register','Conflict of interest register')
  ) AS t(route, archetype, notes)
)
INSERT INTO dos.dynamic_ui_route_metadata (
  route, render_mode, template_binding_required, notes, version, metadata_public, metadata, updated_at
)
SELECT
  c.route,
  'template',
  true,
  c.notes,
  1,
  true,
  jsonb_build_object(
    'renderMode', 'template',
    'templateBindingRequired', true,
    'pageType', 'workflow',
    'layout', 'detail',
    'archetype', c.archetype
  ),
  now()
FROM route_contracts c
ON CONFLICT (route)
DO UPDATE SET
  render_mode = EXCLUDED.render_mode,
  template_binding_required = EXCLUDED.template_binding_required,
  notes = EXCLUDED.notes,
  metadata_public = EXCLUDED.metadata_public,
  metadata = EXCLUDED.metadata,
  updated_at = now();

WITH route_contracts AS (
  SELECT *
  FROM (
    VALUES
      ('/foundation/users/new',                    'guided-create',       'GuidedCreateTemplateComponent',      'Create user',                     'Onboard user identity with role-safe defaults.'),
      ('/foundation/teams/new',                    'guided-create',       'GuidedCreateTemplateComponent',      'Create team',                     'Register and align team ownership boundaries.'),
      ('/foundation/roles/new',                    'guided-create',       'GuidedCreateTemplateComponent',      'Create role',                     'Author role scope and assignment policies.'),
      ('/foundation/delegations/new',              'guided-create',       'GuidedCreateTemplateComponent',      'Create delegation',               'Configure trust scope and expiry lifecycle.'),
      ('/foundation/access-review/new',            'guided-create',       'GuidedCreateTemplateComponent',      'Create access review campaign',   'Launch targeted review with SLA and evidence controls.'),
      ('/foundation/access-review/escalations',    'workflow-control',    'ModuleAssessmentsTemplateComponent', 'Access review escalations',       'Operational escalation queue for overdue review items.'),
      ('/foundation/workflows/new',                'guided-create',       'GuidedCreateTemplateComponent',      'Create workflow',                 'Author workflow with evidence and approval gates.'),
      ('/foundation/people/onboarding',            'guided-create',       'GuidedCreateTemplateComponent',      'People onboarding',               'Provision onboarding journeys from DB runtime contracts.'),
      ('/foundation/people/lifecycle',             'workflow-timeline',   'WorkflowTimelineTemplateComponent',  'People lifecycle',                'Lifecycle timeline from join to offboarding.'),
      ('/foundation/people/probation-due',         'workflow-timeline',   'WorkflowTimelineTemplateComponent',  'Probation due',                   'Upcoming probation checkpoints and required decisions.'),
      ('/foundation/governance/authority-matrix',  'ownership-map',       'OwnershipMapTemplateComponent',      'Authority matrix',                'Decision authority graph and ownership lineage.'),
      ('/foundation/governance/sod-rules',         'module-settings',     'ModuleSettingsTemplateComponent',    'SoD rules',                       'Segregation-of-duties policy configuration.'),
      ('/foundation/governance/sod-violations',    'workflow-control',    'ModuleAssessmentsTemplateComponent', 'SoD violations',                  'Violation remediation workflow and approvals.'),
      ('/foundation/governance/policy-acks',       'intelligent-register','ModuleRecordsTemplateComponent',     'Policy acknowledgements',         'Acknowledgement register and completion evidence.'),
      ('/foundation/governance/training',          'intelligent-register','ModuleRecordsTemplateComponent',     'Governance training',             'Training completion tracking and controls.'),
      ('/foundation/governance/coi',               'intelligent-register','ModuleRecordsTemplateComponent',     'Conflict of interest',            'Conflict declarations and evidence workflow.')
  ) AS t(route, archetype, template_export, title_en, subtitle_en)
)
INSERT INTO dos.ui_route_template_binding (
  route, archetype, template_export, props, version,
  title_en, title_ar, subtitle_en, subtitle_ar,
  eyebrow_en, eyebrow_ar, ai_headline_en, ai_headline_ar, status_tags, primary_action, updated_at
)
SELECT
  c.route,
  c.archetype,
  c.template_export,
  jsonb_build_object('eventHandlers', jsonb_build_object()),
  1,
  c.title_en,
  c.title_en,
  c.subtitle_en,
  c.subtitle_en,
  'Foundation',
  'Foundation',
  'Route contract: foundation.dynamic',
  'Route contract: foundation.dynamic',
  jsonb_build_array(jsonb_build_object('label', 'DB-driven', 'severity', 'success')),
  jsonb_build_object('id', 'foundation.dynamic.open', 'label', 'Open', 'route', c.route),
  now()
FROM route_contracts c
ON CONFLICT (route)
DO UPDATE SET
  archetype = EXCLUDED.archetype,
  template_export = EXCLUDED.template_export,
  props = COALESCE(dos.ui_route_template_binding.props, '{}'::jsonb)
    || jsonb_build_object('eventHandlers', COALESCE(dos.ui_route_template_binding.props->'eventHandlers', '{}'::jsonb)),
  title_en = EXCLUDED.title_en,
  title_ar = EXCLUDED.title_ar,
  subtitle_en = EXCLUDED.subtitle_en,
  subtitle_ar = EXCLUDED.subtitle_ar,
  eyebrow_en = EXCLUDED.eyebrow_en,
  eyebrow_ar = EXCLUDED.eyebrow_ar,
  ai_headline_en = EXCLUDED.ai_headline_en,
  ai_headline_ar = EXCLUDED.ai_headline_ar,
  status_tags = EXCLUDED.status_tags,
  updated_at = now();

DO $$
DECLARE
  c_bindings integer;
BEGIN
  SELECT COUNT(*) INTO c_bindings
  FROM dos.ui_route_template_binding
  WHERE route IN (
    '/foundation/users/new',
    '/foundation/teams/new',
    '/foundation/roles/new',
    '/foundation/delegations/new',
    '/foundation/access-review/new',
    '/foundation/access-review/escalations',
    '/foundation/workflows/new',
    '/foundation/people/onboarding',
    '/foundation/people/lifecycle',
    '/foundation/people/probation-due',
    '/foundation/governance/authority-matrix',
    '/foundation/governance/sod-rules',
    '/foundation/governance/sod-violations',
    '/foundation/governance/policy-acks',
    '/foundation/governance/training',
    '/foundation/governance/coi'
  );
  IF c_bindings < 16 THEN
    RAISE EXCEPTION 'foundation route-closure assertion failed: expected 16 bindings, got %', c_bindings;
  END IF;
END $$;

COMMIT;
