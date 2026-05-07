-- 20260507_2000_bulk_dui_routes_for_all_bindings.sql
-- Close the binding ↔ dynamic_ui_routes gap.
--
-- Audit result: 202 ui_route_template_binding rows exist.
--   46 already have a matching dynamic_ui_routes row (tenant_id IS NULL).
--   156 have binding + metadata but NO dynamic_ui_routes row.
--     → SPA template resolver returns TEMPLATE_BINDING_NOT_FOUND on navigate.
--
-- Also: 3 metadata-only orphans (no binding, no dui_route):
--   /              render_mode=redirect       → skip (handled by gateway catch-all)
--   /foundation    render_mode=template       → already seeded in wave-14; investigate separately
--   /workspace-home render_mode=shell-only   → skip (shell-only, no template)
--
-- Strategy: for every binding row that has no dui_route, derive:
--   module_code  from route prefix
--   component_key from template_export (direct if module.*.page; mapped if TemplateComponent)
--   permission_key from archetype + module
--   sort_order derived from route alphabetic position within module (100+)
--
-- Idempotent: WHERE NOT EXISTS guard. Safe to re-run.

BEGIN;

INSERT INTO dos.dynamic_ui_routes (
  tenant_id, module_code, path_pattern, component_key,
  permission_key, sort_order, data_scope_mode, audit_enabled, realtime_enabled
)
SELECT
  NULL,
  CASE
    WHEN b.route LIKE '/admin/%'      THEN 'admin'
    WHEN b.route LIKE '/ai/%'         THEN 'ai'
    WHEN b.route LIKE '/audit/%'      THEN 'audit'
    WHEN b.route LIKE '/compliance/%' THEN 'compliance'
    WHEN b.route LIKE '/controls/%'   THEN 'controls'
    WHEN b.route LIKE '/dynamic-ui/%' THEN 'dynamic-ui'
    WHEN b.route LIKE '/evidence/%'   THEN 'evidence'
    WHEN b.route LIKE '/policy/%'     THEN 'policy'
    WHEN b.route LIKE '/risk/%'       THEN 'risk'
    WHEN b.route LIKE '/workflow/%'   THEN 'workflow'
    WHEN b.route IN ('/login','/mfa','/register','/reset-password','/forgot-password') THEN 'auth'
    WHEN b.route IN ('/','/pricing','/trust','/security','/contact','/about',
                     '/legal','/platform','/resources','/resources/executive-kit',
                     '/marketing') THEN 'marketing'
    ELSE 'platform'
  END AS module_code,

  b.route AS path_pattern,

  -- component_key: module.*.page values are used directly;
  -- Named TemplateComponents are mapped to their canonical component_key.
  CASE b.template_export
    WHEN 'ModuleRecordsTemplateComponent'        THEN 'module.records.page'
    WHEN 'IntelligentRegisterTemplateComponent'  THEN 'module.records.page'
    WHEN 'ModuleOverviewTemplateComponent'       THEN 'module.overview.page'
    WHEN 'CommandHomeTemplateComponent'          THEN 'module.overview.page'
    WHEN 'PostureOverviewTemplateComponent'      THEN 'module.posture.page'
    WHEN 'ModuleHeatmapTemplateComponent'        THEN 'module.heatmap.page'
    WHEN 'RiskLandscapeTemplateComponent'        THEN 'module.heatmap.page'
    WHEN 'ModuleAssessmentsTemplateComponent'    THEN 'module.workflows.page'
    WHEN 'WorkflowControlTemplateComponent'      THEN 'module.workflows.page'
    WHEN 'TrendIntelligenceTemplateComponent'    THEN 'module.trends.page'
    WHEN 'ModuleReportsTemplateComponent'        THEN 'module.reports.page'
    WHEN 'EvidenceReportsTemplateComponent'      THEN 'module.reports.page'
    WHEN 'ModuleWorkQueueTemplateComponent'      THEN 'module.work_queue'
    WHEN 'ActionQueueTemplateComponent'          THEN 'module.work_queue'
    WHEN 'ModuleSettingsTemplateComponent'       THEN 'module.settings.page'
    WHEN 'ModuleControlSettingsTemplateComponent' THEN 'module.settings.page'
    WHEN 'RecordStoryTemplateComponent'          THEN 'module.record.detail.page'
    WHEN 'GuidedCreateTemplateComponent'         THEN 'module.record.create.page'
    WHEN 'AiAdvisorTemplateComponent'            THEN 'module.overview.page'
    WHEN 'ModuleOnboardingTemplateComponent'     THEN 'module.overview.page'
    WHEN 'AuditTrailLedgerTemplateComponent'     THEN 'module.audit_trail_ledger.page'
    WHEN 'OrgChartTemplateComponent'             THEN 'module.org_chart.page'
    WHEN 'WorkflowTimelineTemplateComponent'     THEN 'module.workflow_timeline.page'
    WHEN 'OwnershipMapTemplateComponent'         THEN 'module.ownership_map.page'
    WHEN 'DelegationCenterTemplateComponent'     THEN 'module.delegation_center.page'
    -- auth/marketing get their own page keys
    WHEN 'auth.login.page'                       THEN 'auth.login.page'
    WHEN 'auth.mfa.page'                         THEN 'auth.mfa.page'
    WHEN 'auth.register.page'                    THEN 'auth.register.page'
    WHEN 'auth.reset-password.page'              THEN 'auth.reset-password.page'
    WHEN 'auth.forgot-password.page'             THEN 'auth.forgot-password.page'
    WHEN 'marketing.home.page'                   THEN 'marketing.home.page'
    WHEN 'marketing.pricing.page'                THEN 'marketing.pricing.page'
    WHEN 'marketing.trust.page'                  THEN 'marketing.trust.page'
    WHEN 'marketing.security.page'               THEN 'marketing.security.page'
    WHEN 'marketing.contact.page'                THEN 'marketing.contact.page'
    WHEN 'marketing.about.page'                  THEN 'marketing.about.page'
    WHEN 'marketing.legal.page'                  THEN 'marketing.legal.page'
    WHEN 'marketing.platform.page'               THEN 'marketing.platform.page'
    WHEN 'marketing.resources.page'              THEN 'marketing.resources.page'
    WHEN 'marketing.executive-kit.page'          THEN 'marketing.executive-kit.page'
    -- All other module.*.page values used directly
    ELSE b.template_export
  END AS component_key,

  -- permission_key from archetype + module prefix
  CASE
    WHEN b.route IN ('/login','/mfa','/register','/reset-password','/forgot-password') THEN NULL
    WHEN b.route LIKE '/%' AND b.route IN ('/','/pricing','/trust','/security',
      '/contact','/about','/legal','/platform','/resources','/marketing',
      '/resources/executive-kit') THEN NULL
    WHEN b.route LIKE '/admin/%'      THEN 'platform.admin.access'
    WHEN b.route LIKE '/audit/%'      THEN 'audit.read'
    WHEN b.route LIKE '/compliance/%' THEN 'compliance.read'
    WHEN b.route LIKE '/controls/%'   THEN 'controls.read'
    WHEN b.route LIKE '/dynamic-ui/%' THEN 'platform.admin.access'
    WHEN b.route LIKE '/evidence/%'   THEN 'evidence.read'
    WHEN b.route LIKE '/policy/%'     THEN 'policy.read'
    WHEN b.route LIKE '/risk/%'       THEN 'risk.read'
    WHEN b.route LIKE '/workflow/%'   THEN 'workflow.read'
    WHEN b.route LIKE '/ai/%'         THEN 'ai.read'
    ELSE NULL
  END AS permission_key,

  -- sort_order: use ASCII sort position within module (300+module_offset)
  300 + ROW_NUMBER() OVER (
    PARTITION BY CASE
      WHEN b.route LIKE '/admin/%'      THEN 'admin'
      WHEN b.route LIKE '/audit/%'      THEN 'audit'
      WHEN b.route LIKE '/compliance/%' THEN 'compliance'
      WHEN b.route LIKE '/controls/%'   THEN 'controls'
      ELSE 'platform'
    END
    ORDER BY b.route
  ) AS sort_order,

  'tenant'  AS data_scope_mode,
  CASE WHEN b.route NOT LIKE '/admin/%' AND b.route NOT IN
    ('/login','/mfa','/register','/reset-password','/forgot-password',
     '/','/pricing','/trust','/security','/contact','/about','/legal',
     '/platform','/resources','/marketing','/resources/executive-kit')
    THEN TRUE ELSE FALSE
  END AS audit_enabled,
  FALSE AS realtime_enabled

FROM dos.ui_route_template_binding b
WHERE NOT EXISTS (
  SELECT 1 FROM dos.dynamic_ui_routes r
  WHERE r.path_pattern = b.route AND r.tenant_id IS NULL
)
-- Skip pure shell-only and redirect-only routes that should never mount a template
AND b.route NOT IN ('/', '/workspace-home');

-- Validation
DO $$
DECLARE
  still_missing integer;
  total_bindings integer;
  total_dui_routes integer;
BEGIN
  SELECT COUNT(*) INTO still_missing
  FROM dos.ui_route_template_binding b
  WHERE NOT EXISTS (
    SELECT 1 FROM dos.dynamic_ui_routes r
    WHERE r.path_pattern = b.route AND r.tenant_id IS NULL
  )
  AND b.route NOT IN ('/', '/workspace-home');

  SELECT COUNT(*) INTO total_bindings FROM dos.ui_route_template_binding;
  SELECT COUNT(*) INTO total_dui_routes FROM dos.dynamic_ui_routes WHERE tenant_id IS NULL;

  IF still_missing > 0 THEN
    RAISE EXCEPTION 'MIGRATION FAIL 20260507_2000: % binding rows still missing dui_route', still_missing;
  END IF;

  RAISE NOTICE '20260507_2000 PASS: all binding rows now have dui_route. bindings=%, dui_routes(platform)=%',
    total_bindings, total_dui_routes;
END $$;

COMMIT;
