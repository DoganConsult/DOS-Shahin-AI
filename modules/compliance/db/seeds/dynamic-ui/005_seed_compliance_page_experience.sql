-- Compliance module — Page Experience metadata backfill.
--
-- Populates `page_type / layout / kpi_scope / user_intent / signature_widget /
-- audience_profiles / data_scope_mode / evidence_required / empty_state_key /
-- error_state_key / help_key` on every compliance route so the SPA's
-- DynamicPageExperienceResolver has a populated row for the Page Quality
-- Gate (DR-#7 expects 'command-center' on overviews; DR-#27 expects
-- visible_when_perm derived from permission_key — handled by the global
-- 016_seed_modules_quality_polish.sql).
--
-- Enums mirror foundation.module-contract.ts:
--   PageType   = overview | list | object | workflow | analytics | audit | settings
--   PageLayout = dashboard | full-page | split-view | object-page | wizard | report
--   KpiScope   = module-overview | page-local | none
--   UserIntent = monitor | manage | review | approve | investigate | configure
--   DataScope  = tenant | org_scope | department_scope | self | global
--
-- Idempotent: pure UPDATEs scoped to tenant_id IS NULL templates.

BEGIN;

UPDATE dos.dynamic_ui_routes r
   SET page_type        = src.page_type,
       layout           = src.layout,
       kpi_scope        = src.kpi_scope,
       user_intent      = src.user_intent,
       signature_widget = src.signature_widget,
       data_scope_mode  = COALESCE(r.data_scope_mode, 'tenant'),
       evidence_required= COALESCE(src.evidence_required, false),
       empty_state_key  = COALESCE(src.empty_state_key, 'compliance.empty.default'),
       error_state_key  = COALESCE(src.error_state_key, 'compliance.error.default'),
       help_key         = COALESCE(src.help_key, 'compliance.help.default')
  FROM (VALUES
    -- Per-page in-depth signature widget design — each surfaces the page's primary
    -- insight (the "why" of the page). Keys must exist in compliance.widgets.ts
    -- (WidgetManifest catalog) — see DESIGN doc in the plan file for shape per widget.
    ('/compliance',                               'overview',  'dashboard',   'module-overview', 'monitor',     'posture_chart',                     false, NULL, NULL, NULL),
    ('/compliance/overview',                      'overview',  'dashboard',   'module-overview', 'monitor',     'posture_chart',                     false, NULL, NULL, NULL),
    ('/compliance/posture',                       'overview',  'dashboard',   'module-overview', 'monitor',     'compliance_score_gauge',            false, NULL, NULL, NULL),
    ('/compliance/work-queue',                    'list',      'full-page',   'page-local',      'manage',      'compliance_work_queue_strip',       false, 'compliance.empty.work-queue', NULL, NULL),
    ('/compliance/calendar',                      'analytics', 'full-page',   'page-local',      'monitor',     'compliance_calendar_strip',         false, NULL, NULL, NULL),
    ('/compliance/heatmap',                       'analytics', 'full-page',   'page-local',      'investigate', 'compliance_heatmap',                false, NULL, NULL, NULL),
    ('/compliance/roadmap',                       'analytics', 'full-page',   'page-local',      'manage',      'compliance_roadmap_timeline',       false, NULL, NULL, NULL),
    ('/compliance/templates',                     'list',      'full-page',   'page-local',      'configure',   'compliance_template_coverage',      false, NULL, NULL, NULL),
    ('/compliance/frameworks',                    'list',      'full-page',   'page-local',      'manage',      'framework_radar',                   false, 'compliance.empty.frameworks', NULL, NULL),
    ('/compliance/obligations',                   'list',      'full-page',   'page-local',      'manage',      'obligation_status',                 false, 'compliance.empty.obligations', NULL, NULL),
    ('/compliance/obligations/:id',               'object',    'object-page', 'none',            'review',      'obligation_detail_card',            true,  NULL, NULL, NULL),
    ('/compliance/obligation-workspace',          'workflow',  'split-view',  'page-local',      'manage',      'obligation_kanban',                 true,  NULL, NULL, NULL),
    ('/compliance/regulatory-changes',            'list',      'full-page',   'page-local',      'monitor',     'regulatory_change_feed',            false, NULL, NULL, NULL),
    ('/compliance/assessments',                   'list',      'full-page',   'page-local',      'manage',      'assessment_pipeline_funnel',        false, 'compliance.empty.assessments', NULL, NULL),
    ('/compliance/attestations',                  'list',      'full-page',   'page-local',      'review',      'attestation_coverage_donut',        true,  NULL, NULL, NULL),
    ('/compliance/findings',                      'list',      'full-page',   'page-local',      'investigate', 'findings_bar',                      true,  'compliance.empty.findings', NULL, NULL),
    ('/compliance/gaps',                          'list',      'full-page',   'page-local',      'investigate', 'gap_by_framework',                  true,  'compliance.empty.gaps', NULL, NULL),
    ('/compliance/exceptions',                    'list',      'full-page',   'page-local',      'review',      'exceptions_aging',                  true,  NULL, NULL, NULL),
    ('/compliance/evidence-ops',                  'workflow',  'full-page',   'page-local',      'manage',      'evidence_freshness',                true,  NULL, NULL, NULL),
    ('/compliance/reports',                       'analytics', 'report',      'page-local',      'monitor',     'report_activity_strip',             false, NULL, NULL, NULL),
    ('/compliance/lifecycle',                     'settings',  'full-page',   'none',            'configure',   NULL,                                false, NULL, NULL, NULL),
    ('/compliance/admin',                         'settings',  'full-page',   'none',            'configure',   NULL,                                false, NULL, NULL, NULL),
    ('/compliance/assertion-dashboard',           'analytics', 'dashboard',   'page-local',      'monitor',     'assertion_status_panel',            false, NULL, NULL, NULL),
    ('/compliance/rcsa-campaigns',                'workflow',  'full-page',   'page-local',      'manage',      'rcsa_campaign_progress',            true,  NULL, NULL, NULL),
    ('/compliance/regulatory-reasoning-studio',   'analytics', 'split-view',  'page-local',      'investigate', 'reasoning_studio_activity',         false, NULL, NULL, NULL)
  ) AS src(path_pattern, page_type, layout, kpi_scope, user_intent, signature_widget, evidence_required, empty_state_key, error_state_key, help_key)
 WHERE r.tenant_id IS NULL
   AND r.module_code  = 'compliance'
   AND r.path_pattern = src.path_pattern;

-- Backfill visible_when_perm from permission_key (mirrors 016_seed_modules_quality_polish.sql
-- step 2). Idempotent — only fires where the column is NULL and a permission_key exists.
UPDATE dos.dynamic_ui_routes
   SET visible_when_perm = ARRAY[permission_key]::text[]
 WHERE tenant_id IS NULL
   AND module_code = 'compliance'
   AND permission_key IS NOT NULL
   AND visible_when_perm IS NULL;

COMMIT;
