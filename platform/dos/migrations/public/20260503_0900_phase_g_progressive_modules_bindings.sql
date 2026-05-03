-- Phase G — Productive Progressive Modules: ui_route_template_binding
-- Owner: ui-os-service.
--
-- Lifts every customer-facing route exposed by the 10 productive modules
-- (risk, compliance, controls, policy, audit, evidence, workflow,
-- reporting, knowledge, foundation) onto the 31-archetype roster, so the
-- DynamicTemplatePageComponent renders a real Carbon template under
-- every productive URL — not just the admin shell covered by Phase F.
--
-- Forward-only and idempotent (ON CONFLICT (route) DO UPDATE). The
-- chk_archetype constraint guarantees archetype validity. The
-- trg_bump_ui_route_template_version trigger bumps `version` per write.
--
-- Coverage: 92 routes from dos.dynamic_ui_routes WHERE module_code IN
-- ('risk','compliance','controls','policy','audit','evidence','workflow',
-- 'reporting','knowledge','foundation') AND path_pattern NOT LIKE '%/:%'
-- minus the 2 already bound (/settings, /tenant-settings).

BEGIN;

-- ─── A — command-home (module landings + simple hubs) ──────────────────────
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export) VALUES
  ('/audit',                       'command-home', 'ModuleOverviewTemplateComponent'),
  ('/audit/overview',              'command-home', 'ModuleOverviewTemplateComponent'),
  ('/compliance',                  'command-home', 'ModuleOverviewTemplateComponent'),
  ('/compliance/overview',         'command-home', 'ModuleOverviewTemplateComponent'),
  ('/controls',                    'command-home', 'ModuleOverviewTemplateComponent'),
  ('/controls/home',               'command-home', 'ModuleOverviewTemplateComponent'),
  ('/evidence',                    'command-home', 'ModuleOverviewTemplateComponent'),
  ('/evidence/overview',           'command-home', 'ModuleOverviewTemplateComponent'),
  ('/foundation',                  'command-home', 'ModuleOverviewTemplateComponent'),
  ('/foundation/overview',         'command-home', 'ModuleOverviewTemplateComponent'),
  ('/knowledge',                   'command-home', 'ModuleOverviewTemplateComponent'),
  ('/knowledge-hub',               'command-home', 'ModuleOverviewTemplateComponent'),
  ('/policy',                      'command-home', 'ModuleOverviewTemplateComponent'),
  ('/policy/coverage',             'command-home', 'ModuleOverviewTemplateComponent'),
  ('/policy/drafting',             'command-home', 'ModuleOverviewTemplateComponent'),
  ('/policy/home',                 'command-home', 'ModuleOverviewTemplateComponent'),
  ('/policy/lifecycle',            'command-home', 'ModuleOverviewTemplateComponent'),
  ('/policy/publications',         'command-home', 'ModuleOverviewTemplateComponent'),
  ('/reporting',                   'command-home', 'ModuleOverviewTemplateComponent'),
  ('/reports/overview',            'command-home', 'ModuleOverviewTemplateComponent'),
  ('/risk',                        'command-home', 'ModuleOverviewTemplateComponent'),
  ('/risk/overview',               'command-home', 'ModuleOverviewTemplateComponent'),
  ('/workflow',                    'command-home', 'ModuleOverviewTemplateComponent'),
  ('/workflow/hub',                'command-home', 'ModuleOverviewTemplateComponent')
ON CONFLICT (route) DO UPDATE SET archetype=EXCLUDED.archetype, template_export=EXCLUDED.template_export;

-- ─── B — intelligent-register (record lists, libraries, catalogs) ─────────
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export) VALUES
  ('/audit/findings',              'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/compliance/attestations',     'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/compliance/controls',         'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/compliance/controls/list',    'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/compliance/evidence',         'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/compliance/exceptions',       'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/compliance/findings',         'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/compliance/frameworks',       'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/compliance/gaps',             'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/compliance/obligations',      'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/compliance/regulator',        'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/controls/library',            'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/evidence/catalog',            'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/foundation/committees',       'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/foundation/data-processing',  'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/foundation/locations',        'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/foundation/policies',         'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/foundation/positions',        'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/foundation/records',          'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/foundation/reference-data',   'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/foundation/roles',            'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/foundation/users',            'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/policy/library',              'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/risk/records',                'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/risk/register',               'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/workflow/templates',          'intelligent-register', 'ModuleRecordsTemplateComponent'),
  ('/workflow/workflows',          'intelligent-register', 'ModuleRecordsTemplateComponent')
ON CONFLICT (route) DO UPDATE SET archetype=EXCLUDED.archetype, template_export=EXCLUDED.template_export;

-- ─── C — workflow-control (assessments, engagements, reviews) ─────────────
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export) VALUES
  ('/audit/engagements',           'workflow-control', 'ModuleAssessmentsTemplateComponent'),
  ('/compliance/assessments',      'workflow-control', 'ModuleAssessmentsTemplateComponent'),
  ('/controls/testing',            'workflow-control', 'ModuleAssessmentsTemplateComponent'),
  ('/evidence/reviews',            'workflow-control', 'ModuleAssessmentsTemplateComponent'),
  ('/foundation/access-review',    'workflow-control', 'ModuleAssessmentsTemplateComponent'),
  ('/foundation/workflows',        'workflow-control', 'ModuleAssessmentsTemplateComponent'),
  ('/risk/assessments',            'workflow-control', 'ModuleAssessmentsTemplateComponent'),
  ('/risk/treatments',             'workflow-control', 'ModuleAssessmentsTemplateComponent'),
  ('/risk/workflows',              'workflow-control', 'ModuleAssessmentsTemplateComponent'),
  ('/workflow/designer',           'workflow-control', 'ModuleAssessmentsTemplateComponent')
ON CONFLICT (route) DO UPDATE SET archetype=EXCLUDED.archetype, template_export=EXCLUDED.template_export;

-- ─── D — action-queue (work-queue, requests, ops queues) ──────────────────
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export) VALUES
  ('/compliance/evidence-ops',     'action-queue', 'ModuleWorkQueueTemplateComponent'),
  ('/compliance/work-queue',       'action-queue', 'ModuleWorkQueueTemplateComponent'),
  ('/evidence/requests',           'action-queue', 'ModuleWorkQueueTemplateComponent'),
  ('/evidence/tasks',              'action-queue', 'ModuleWorkQueueTemplateComponent')
ON CONFLICT (route) DO UPDATE SET archetype=EXCLUDED.archetype, template_export=EXCLUDED.template_export;

-- ─── E — evidence-reports (board packs + report cards) ────────────────────
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export) VALUES
  ('/audit/reports',               'evidence-reports', 'ModuleReportsTemplateComponent'),
  ('/compliance/reports',          'evidence-reports', 'ModuleReportsTemplateComponent'),
  ('/foundation/reports',          'evidence-reports', 'ModuleReportsTemplateComponent'),
  ('/risk/reports',                'evidence-reports', 'ModuleReportsTemplateComponent')
ON CONFLICT (route) DO UPDATE SET archetype=EXCLUDED.archetype, template_export=EXCLUDED.template_export;

-- ─── F — risk-landscape / posture-overview / trend-intelligence ───────────
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export) VALUES
  ('/compliance/heatmap',          'risk-landscape',     'ModuleHeatmapTemplateComponent'),
  ('/risk/heatmap',                'risk-landscape',     'ModuleHeatmapTemplateComponent'),
  ('/compliance/posture',          'posture-overview',   'PostureOverviewTemplateComponent'),
  ('/compliance/diagnostics',      'posture-overview',   'PostureOverviewTemplateComponent'),
  ('/compliance/ksa',              'posture-overview',   'PostureOverviewTemplateComponent'),
  ('/foundation/operations-readiness', 'posture-overview','PostureOverviewTemplateComponent'),
  ('/controls/monitoring',         'trend-intelligence', 'TrendIntelligenceTemplateComponent'),
  ('/workflow/analytics',          'trend-intelligence', 'TrendIntelligenceTemplateComponent')
ON CONFLICT (route) DO UPDATE SET archetype=EXCLUDED.archetype, template_export=EXCLUDED.template_export;

-- ─── G — module-settings + record-story (profiles + admin shells) ─────────
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export) VALUES
  ('/compliance/admin',            'module-settings', 'ModuleSettingsTemplateComponent'),
  ('/foundation/settings',         'module-settings', 'ModuleSettingsTemplateComponent'),
  ('/risk/settings',               'module-settings', 'ModuleSettingsTemplateComponent'),
  ('/profile',                     'record-story',    'RecordStoryTemplateComponent'),
  ('/tenant-profile',              'record-story',    'RecordStoryTemplateComponent')
ON CONFLICT (route) DO UPDATE SET archetype=EXCLUDED.archetype, template_export=EXCLUDED.template_export;

-- ─── H — props-bearing archetypes (require seed JSONs in same wave) ───────
-- calendar-timeline / compliance-calendar / remediation-roadmap / org-chart /
-- ownership-map / delegation-center / audit-trail-ledger / workflow-timeline
INSERT INTO dos.ui_route_template_binding (route, archetype, template_export) VALUES
  ('/audit/plan',                  'calendar-timeline',     'CalendarTimelineTemplateComponent'),
  ('/compliance/calendar',         'compliance-calendar',   'ComplianceCalendarTemplateComponent'),
  ('/compliance/roadmap',          'remediation-roadmap',   'RemediationRoadmapTemplateComponent'),
  ('/controls/mapping',            'ownership-map',         'OwnershipMapTemplateComponent'),
  ('/foundation/audit',            'audit-trail-ledger',    'AuditTrailLedgerTemplateComponent'),
  ('/foundation/business-units',   'org-chart',             'OrgChartTemplateComponent'),
  ('/foundation/delegations',      'delegation-center',     'DelegationCenterTemplateComponent'),
  ('/foundation/departments',      'org-chart',             'OrgChartTemplateComponent'),
  ('/foundation/organization',     'org-chart',             'OrgChartTemplateComponent'),
  ('/foundation/ownership-mapping','ownership-map',         'OwnershipMapTemplateComponent'),
  ('/foundation/permissions',      'ownership-map',         'OwnershipMapTemplateComponent'),
  ('/foundation/teams',            'org-chart',             'OrgChartTemplateComponent'),
  ('/workflow/executions',         'workflow-timeline',     'WorkflowTimelineTemplateComponent')
ON CONFLICT (route) DO UPDATE SET archetype=EXCLUDED.archetype, template_export=EXCLUDED.template_export;

-- ─── Sanity guard — at least 22 distinct archetypes must remain ───────────
DO $$
DECLARE
  distinct_count INTEGER;
  total_bindings INTEGER;
BEGIN
  SELECT count(DISTINCT archetype), count(*) INTO distinct_count, total_bindings
    FROM dos.ui_route_template_binding;
  IF distinct_count < 22 THEN
    RAISE EXCEPTION '[phase-g progressive] expected >=22 distinct archetypes, found %', distinct_count;
  END IF;
  IF total_bindings < 140 THEN
    RAISE EXCEPTION '[phase-g progressive] expected >=140 total bindings, found %', total_bindings;
  END IF;
END $$;

COMMIT;
