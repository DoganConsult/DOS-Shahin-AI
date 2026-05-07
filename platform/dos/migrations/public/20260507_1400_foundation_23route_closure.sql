-- 20260507_1400_foundation_23route_closure.sql
-- Phase B — close all 23 foundation routes missing dynamic_ui_routes +
-- ui_route_template_binding rows.
--
-- Context:
--   44 foundation route_metadata rows exist.
--   21 already have both dynamic_ui_routes + ui_route_template_binding.
--   23 have metadata but neither page-experience row nor template binding.
--   Wave 27 (20260507_1200) covered only 7; this migration covers all 23
--   idempotently (WHERE NOT EXISTS / ON CONFLICT DO NOTHING).
--
-- Archetype → template_export mapping (Option B: GuidedCreateTemplateComponent
-- registered as module.record.create.page per Option B selection):
--
--   guided-create        → GuidedCreateTemplateComponent   (module.record.create.page)
--   workflow-control     → ModuleAssessmentsTemplateComponent (module.workflows.page)
--   workflow-timeline    → WorkflowTimelineTemplateComponent  (module.workflow_timeline.page)
--   intelligent-register → ModuleRecordsTemplateComponent     (module.records.page)
--   ownership-map        → OwnershipMapTemplateComponent      (module.ownership_map.page)
--   module-settings      → ModuleSettingsTemplateComponent    (module.settings.page)
--   posture-overview     → PostureOverviewTemplateComponent   (module.overview.page)
--   audit-trail-ledger   → AuditTrailLedgerTemplateComponent  (module.audit_trail_ledger.page)
--
-- Idempotent. Safe to re-run. No destructive ops.

BEGIN;

-- =========================================================================
-- PART 1 — dynamic_ui_routes (page-experience rows)
-- =========================================================================
-- All rows: tenant_id=NULL (platform-level), module_code='foundation'.
-- component_key derived from archetype; permission_key from domain.

WITH new_routes (path_pattern, component_key, permission_key, sort_order) AS (
  VALUES
    -- guided-create routes (8)
    ('/foundation/access-review/new',          'module.record.create.page',        'foundation.review.write',      135),
    ('/foundation/delegations/new',            'module.record.create.page',        'foundation.delegations.write', 125),
    ('/foundation/people/onboarding',          'module.record.create.page',        'foundation.people.write',      311),
    ('/foundation/roles/new',                  'module.record.create.page',        'foundation.roles.write',       171),
    ('/foundation/teams/new',                  'module.record.create.page',        'foundation.teams.write',       181),
    ('/foundation/users/new',                  'module.record.create.page',        'foundation.users.write',       191),
    ('/foundation/workflows/new',              'module.record.create.page',        'foundation.workflows.write',   285),
    -- workflow-control routes (2)
    ('/foundation/access-review/escalations',  'module.workflows.page',            'foundation.review.read',       136),
    ('/foundation/governance/sod-violations',  'module.workflows.page',            'foundation.governance.read',   263),
    -- workflow-timeline routes (3)
    ('/foundation/people/lifecycle',           'module.workflow_timeline.page',    'foundation.people.read',       313),
    ('/foundation/people/probation-due',       'module.workflow_timeline.page',    'foundation.people.read',       315),
    ('/foundation/workflows',                  'module.workflow_timeline.page',    'foundation.workflows.read',    280),
    -- intelligent-register routes (3)
    ('/foundation/governance/coi',             'module.records.page',              'foundation.governance.read',   255),
    ('/foundation/governance/policy-acks',     'module.records.page',              'foundation.governance.read',   257),
    ('/foundation/governance/training',        'module.records.page',              'foundation.governance.read',   269),
    -- ownership-map routes (1)
    ('/foundation/governance/authority-matrix','module.ownership_map.page',        'foundation.governance.read',   251),
    -- module-settings routes (2)
    ('/foundation/governance/sod-rules',       'module.settings.page',             'foundation.governance.read',   261),
    ('/foundation/settings',                   'module.settings.page',             'foundation.settings.read',     240),
    -- posture-overview routes (1)
    ('/foundation/operations-readiness',       'module.overview.page',             'foundation.diagnostics.read',  270),
    -- audit-trail / record list routes (4)
    ('/foundation/data-processing',            'module.audit_trail_ledger.page',   'foundation.records.read',      220),
    ('/foundation/ownership-mapping',          'module.ownership_map.page',        'foundation.ownership.read',    230),
    ('/foundation/records',                    'module.records.page',              'foundation.records.read',      260),
    ('/foundation/reports',                    'module.audit_trail_ledger.page',   'foundation.reports.read',      250)
)
INSERT INTO dos.dynamic_ui_routes (
  tenant_id,
  module_code,
  path_pattern,
  component_key,
  permission_key,
  sort_order,
  data_scope_mode,
  audit_enabled,
  realtime_enabled
)
SELECT
  NULL,
  'foundation',
  nr.path_pattern,
  nr.component_key,
  nr.permission_key,
  nr.sort_order,
  'tenant',
  TRUE,
  FALSE
FROM new_routes nr
WHERE NOT EXISTS (
  SELECT 1
  FROM dos.dynamic_ui_routes r
  WHERE r.tenant_id IS NULL
    AND r.path_pattern = nr.path_pattern
);

-- =========================================================================
-- PART 2 — ui_route_template_binding (archetype + template export)
-- =========================================================================
-- props scaffold: minimal valid JSON (eyebrow, title, subtitle, loading=false,
-- pillars evidence stub, records/rows empty). status_tags=[].
-- primary_action=NULL for list/detail pages; guided-create gets a create cta stub.

WITH new_bindings (
  route, archetype, template_export,
  title_en, title_ar, subtitle_en, subtitle_ar,
  props
) AS (
  VALUES
    -- guided-create (8)
    (
      '/foundation/access-review/new', 'guided-create', 'GuidedCreateTemplateComponent',
      'New access review', 'مراجعة وصول جديدة',
      'Create a new access review campaign.', 'إنشاء حملة مراجعة وصول جديدة.',
      '{"eyebrow":"Foundation","title":"New access review","subtitle":"Create a new access review campaign.","loading":false,"steps":[]}'::jsonb
    ),
    (
      '/foundation/delegations/new', 'guided-create', 'GuidedCreateTemplateComponent',
      'New delegation', 'تفويض جديد',
      'Create a new delegation record.', 'إنشاء سجل تفويض جديد.',
      '{"eyebrow":"Foundation","title":"New delegation","subtitle":"Create a new delegation record.","loading":false,"steps":[]}'::jsonb
    ),
    (
      '/foundation/people/onboarding', 'guided-create', 'GuidedCreateTemplateComponent',
      'Onboarding', 'التأهيل الوظيفي',
      'Onboard new personnel into Foundation.', 'تأهيل الموظفين الجدد في المؤسسة.',
      '{"eyebrow":"Foundation","title":"Onboarding","subtitle":"Onboard new personnel into Foundation.","loading":false,"steps":[]}'::jsonb
    ),
    (
      '/foundation/roles/new', 'guided-create', 'GuidedCreateTemplateComponent',
      'New role', 'دور جديد',
      'Define a new role.', 'تعريف دور جديد.',
      '{"eyebrow":"Foundation","title":"New role","subtitle":"Define a new role.","loading":false,"steps":[]}'::jsonb
    ),
    (
      '/foundation/teams/new', 'guided-create', 'GuidedCreateTemplateComponent',
      'New team', 'فريق جديد',
      'Create a new team.', 'إنشاء فريق جديد.',
      '{"eyebrow":"Foundation","title":"New team","subtitle":"Create a new team.","loading":false,"steps":[]}'::jsonb
    ),
    (
      '/foundation/users/new', 'guided-create', 'GuidedCreateTemplateComponent',
      'New user', 'مستخدم جديد',
      'Provision a new user account.', 'إنشاء حساب مستخدم جديد.',
      '{"eyebrow":"Foundation","title":"New user","subtitle":"Provision a new user account.","loading":false,"steps":[]}'::jsonb
    ),
    (
      '/foundation/workflows/new', 'guided-create', 'GuidedCreateTemplateComponent',
      'New workflow', 'سير عمل جديد',
      'Create a new workflow.', 'إنشاء سير عمل جديد.',
      '{"eyebrow":"Foundation","title":"New workflow","subtitle":"Create a new workflow.","loading":false,"steps":[]}'::jsonb
    ),
    -- workflow-control (2)
    (
      '/foundation/access-review/escalations', 'workflow-control', 'ModuleAssessmentsTemplateComponent',
      'Escalations', 'التصعيدات',
      'Access review escalation queue.', 'قائمة انتظار تصعيد مراجعة الوصول.',
      '{"eyebrow":"Foundation","title":"Escalations","subtitle":"Access review escalation queue.","loading":false,"pillars":{"evidence":"Escalation register."},"records":[]}'::jsonb
    ),
    (
      '/foundation/governance/sod-violations', 'workflow-control', 'ModuleAssessmentsTemplateComponent',
      'SoD violations', 'انتهاكات فصل المهام',
      'Segregation of duties violation register.', 'سجل انتهاكات فصل المهام.',
      '{"eyebrow":"Foundation","title":"SoD violations","subtitle":"Segregation of duties violation register.","loading":false,"pillars":{"evidence":"SoD violation register."},"records":[]}'::jsonb
    ),
    -- workflow-timeline (3)
    (
      '/foundation/people/lifecycle', 'workflow-timeline', 'WorkflowTimelineTemplateComponent',
      'People lifecycle', 'دورة حياة الموظفين',
      'Personnel lifecycle event timeline.', 'الجدول الزمني لأحداث دورة حياة الموظفين.',
      '{"eyebrow":"Foundation","title":"People lifecycle","subtitle":"Personnel lifecycle event timeline.","loading":false,"events":[]}'::jsonb
    ),
    (
      '/foundation/people/probation-due', 'workflow-timeline', 'WorkflowTimelineTemplateComponent',
      'Probation due', 'انتهاء فترة التجربة',
      'Personnel approaching probation review deadline.', 'الموظفون الذين يقتربون من موعد مراجعة فترة التجربة.',
      '{"eyebrow":"Foundation","title":"Probation due","subtitle":"Personnel approaching probation review deadline.","loading":false,"events":[]}'::jsonb
    ),
    (
      '/foundation/workflows', 'workflow-timeline', 'WorkflowTimelineTemplateComponent',
      'Workflows', 'سير العمل',
      'Foundation workflow timeline.', 'الجدول الزمني لسير عمل المؤسسة.',
      '{"eyebrow":"Foundation","title":"Workflows","subtitle":"Foundation workflow timeline.","loading":false,"events":[]}'::jsonb
    ),
    -- intelligent-register (3)
    (
      '/foundation/governance/coi', 'intelligent-register', 'ModuleRecordsTemplateComponent',
      'Conflicts of interest', 'تعارض المصالح',
      'Conflict of interest disclosures and assessments.', 'الإفصاحات وتقييمات تعارض المصالح.',
      '{"eyebrow":"Foundation","title":"Conflicts of interest","subtitle":"Conflict of interest disclosures and assessments.","loading":false,"pillars":{"evidence":"CoI register."},"records":[]}'::jsonb
    ),
    (
      '/foundation/governance/policy-acks', 'intelligent-register', 'ModuleRecordsTemplateComponent',
      'Policy acknowledgements', 'إقرارات السياسة',
      'Policy acknowledgement tracking register.', 'سجل متابعة إقرارات السياسة.',
      '{"eyebrow":"Foundation","title":"Policy acknowledgements","subtitle":"Policy acknowledgement tracking register.","loading":false,"pillars":{"evidence":"Policy ack register."},"records":[]}'::jsonb
    ),
    (
      '/foundation/governance/training', 'intelligent-register', 'ModuleRecordsTemplateComponent',
      'Training records', 'سجلات التدريب',
      'Mandatory and elective training completion register.', 'سجل إتمام التدريب الإلزامي والاختياري.',
      '{"eyebrow":"Foundation","title":"Training records","subtitle":"Mandatory and elective training completion register.","loading":false,"pillars":{"evidence":"Training register."},"records":[]}'::jsonb
    ),
    -- ownership-map (2)
    (
      '/foundation/governance/authority-matrix', 'ownership-map', 'OwnershipMapTemplateComponent',
      'Authority matrix', 'مصفوفة الصلاحيات',
      'Delegation of authority and approval matrix.', 'تفويض السلطة ومصفوفة الموافقة.',
      '{"eyebrow":"Foundation","title":"Authority matrix","subtitle":"Delegation of authority and approval matrix.","loading":false,"edges":[]}'::jsonb
    ),
    (
      '/foundation/ownership-mapping', 'ownership-map', 'OwnershipMapTemplateComponent',
      'Ownership mapping', 'خرائط الملكية',
      'Map ownership across entities and modules.', 'تخطيط الملكية عبر الكيانات والوحدات.',
      '{"eyebrow":"Foundation","title":"Ownership mapping","subtitle":"Map ownership across entities and modules.","loading":false,"edges":[]}'::jsonb
    ),
    -- module-settings (2)
    (
      '/foundation/governance/sod-rules', 'module-settings', 'ModuleSettingsTemplateComponent',
      'SoD rules', 'قواعد فصل المهام',
      'Segregation of duties rule configuration.', 'تكوين قواعد فصل المهام.',
      '{"eyebrow":"Foundation","title":"SoD rules","subtitle":"Segregation of duties rule configuration.","loading":false,"sections":[]}'::jsonb
    ),
    (
      '/foundation/settings', 'module-settings', 'ModuleSettingsTemplateComponent',
      'Settings', 'الإعدادات',
      'Foundation module settings and configuration.', 'إعدادات وتكوين وحدة المؤسسة.',
      '{"eyebrow":"Foundation","title":"Settings","subtitle":"Foundation module settings and configuration.","loading":false,"sections":[]}'::jsonb
    ),
    -- posture-overview (1)
    (
      '/foundation/operations-readiness', 'posture-overview', 'PostureOverviewTemplateComponent',
      'Operations readiness', 'الجاهزية التشغيلية',
      'Operational readiness signals and posture indicators.', 'مؤشرات الجاهزية التشغيلية.',
      '{"eyebrow":"Foundation","title":"Operations readiness","subtitle":"Operational readiness signals and posture indicators.","loading":false,"pillars":{"evidence":"Readiness overview."}}'::jsonb
    ),
    -- audit-trail / data (4)
    (
      '/foundation/data-processing', 'audit-trail-ledger', 'AuditTrailLedgerTemplateComponent',
      'Data processing', 'معالجة البيانات',
      'Data processing inventory and lawful basis register.', 'جرد معالجة البيانات وسجل الأساس القانوني.',
      '{"eyebrow":"Foundation","title":"Data processing","subtitle":"Data processing inventory and lawful basis register.","loading":false,"pillars":{"evidence":"Data processing ledger."},"rows":[]}'::jsonb
    ),
    (
      '/foundation/records', 'intelligent-register', 'ModuleRecordsTemplateComponent',
      'Records', 'السجلات',
      'Foundation record library.', 'مكتبة سجلات المؤسسة.',
      '{"eyebrow":"Foundation","title":"Records","subtitle":"Foundation record library.","loading":false,"pillars":{"evidence":"Foundation record register."},"records":[]}'::jsonb
    ),
    (
      '/foundation/reports', 'audit-trail-ledger', 'AuditTrailLedgerTemplateComponent',
      'Reports', 'التقارير',
      'Foundation reports and data exports.', 'تقارير وتصدير بيانات المؤسسة.',
      '{"eyebrow":"Foundation","title":"Reports","subtitle":"Foundation reports and data exports.","loading":false,"pillars":{"evidence":"Foundation report exports."},"rows":[]}'::jsonb
    )
)
INSERT INTO dos.ui_route_template_binding (
  route,
  archetype,
  template_export,
  title_en,
  title_ar,
  subtitle_en,
  subtitle_ar,
  props,
  status_tags,
  version,
  updated_at
)
SELECT
  nb.route,
  nb.archetype,
  nb.template_export,
  nb.title_en,
  nb.title_ar,
  nb.subtitle_en,
  nb.subtitle_ar,
  nb.props,
  '[]'::jsonb,
  1,
  now()
FROM new_bindings nb
WHERE NOT EXISTS (
  SELECT 1
  FROM dos.ui_route_template_binding b
  WHERE b.route = nb.route
);

-- =========================================================================
-- VALIDATION
-- =========================================================================
DO $$
DECLARE
  missing_dui    integer;
  missing_bind   integer;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE has_dui IS NULL),
    COUNT(*) FILTER (WHERE has_bind IS NULL)
  INTO missing_dui, missing_bind
  FROM (
    SELECT
      m.route,
      (SELECT 1 FROM dos.dynamic_ui_routes r
        WHERE r.path_pattern = m.route AND r.tenant_id IS NULL LIMIT 1) AS has_dui,
      (SELECT 1 FROM dos.ui_route_template_binding b
        WHERE b.route = m.route LIMIT 1) AS has_bind
    FROM dos.dynamic_ui_route_metadata m
    WHERE m.route LIKE '/foundation/%'
  ) sub;

  IF missing_dui > 0 OR missing_bind > 0 THEN
    RAISE EXCEPTION
      'MIGRATION FAIL 20260507_1400: % foundation routes still missing dynamic_ui_routes; % still missing template_binding',
      missing_dui, missing_bind;
  END IF;

  -- Confirm guided-create archetype is present
  IF NOT EXISTS (
    SELECT 1 FROM dos.ui_route_template_binding WHERE archetype = 'guided-create'
  ) THEN
    RAISE EXCEPTION 'MIGRATION FAIL 20260507_1400: guided-create archetype rows not inserted';
  END IF;

  RAISE NOTICE '20260507_1400 PASS: all 44 foundation routes have dynamic_ui_routes + template_binding. guided-create archetype registered.';
END $$;

COMMIT;
