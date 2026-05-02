-- =====================================================================
-- 0500 — Register compliance UI components in dos.dynamic_ui_component_registry.
--
-- Each row is gated by the Layer 1 trigger (0400):
--   - vendor='ibm-carbon'
--   - approval_status='approved'
--   - carbon_key references a real Carbon catalog row whose runtime_status
--     allows runtime use (active or wrapper-required)
--
-- The 63 compliance pages map to canonical Carbon primitives that compose
-- the page chrome:
--   - Hub/overview/posture/work-queue/calendar/heatmap pages → 'tiles' (KPI cards + dashboards)
--   - Detail/list/admin/assessment/scoring/control-testing pages → 'table'
--   - Catalog/registry/taxonomy/ontology/content-pack browsing → 'structured-list'
--
-- The link is INDICATIVE — a compliance page composes many Carbon
-- components, but the FK identifies the dominant chrome primitive so the
-- catalog↔registry relationship is concrete.
--
-- The Layer 2 allowlist endpoint serves these rows to the SPA.
-- Layer 7 boot probe verifies they all link to non-blocked Carbon rows.
-- =====================================================================

BEGIN;

-- 63 compliance pages, classified by dominant chrome primitive.
INSERT INTO dos.dynamic_ui_component_registry
  (component_key, vendor, approval_status, carbon_key, schema_version, metadata)
VALUES
  -- Dashboards / hubs / KPI overviews → tiles
  ('ComplianceHome',                'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"hub"}'),
  ('ComplianceCatchAll',            'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"hub"}'),
  ('ComplianceOverviewPage',        'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"overview"}'),
  ('CompliancePosturePage',         'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"dashboard"}'),
  ('ComplianceWorkQueuePage',       'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"dashboard"}'),
  ('ComplianceCalendarPage',        'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"calendar"}'),
  ('ComplianceHeatmapPage',         'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"dashboard"}'),
  ('ComplianceRoadmapPage',         'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"timeline"}'),
  ('FrameworkHubPage',              'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"hub"}'),
  ('IntelligenceHubPage',           'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"hub"}'),
  ('KsaHubPage',                    'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"hub"}'),
  ('MaturityJourneyPage',           'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"dashboard"}'),
  ('FrameworkScorecardPage',        'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"dashboard"}'),
  ('AssertionDashboardPage',        'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"dashboard"}'),
  ('RegulatoryDeltaDashboardPage',  'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"dashboard"}'),
  ('ComplianceSavingsPage',         'ibm-carbon', 'approved', 'tiles',           '1', '{"module":"compliance","kind":"dashboard"}'),

  -- List/detail/admin pages → table
  ('ComplianceTemplatesPage',       'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ComplianceFrameworksPage',      'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ComplianceObligationsPage',     'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ObligationDetailPage',          'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"detail"}'),
  ('ObligationWorkspacePage',       'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"workspace"}'),
  ('ComplianceRegulatoryChangesPage','ibm-carbon','approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ComplianceAssessmentsPage',     'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ComplianceAttestationsPage',    'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ComplianceFindingsPage',        'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ComplianceGapsPage',            'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ComplianceExceptionsPage',      'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ComplianceEvidenceOpsPage',     'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ComplianceReportsPage',         'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('GenericModuleLifecycle',        'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"lifecycle"}'),
  ('ComplianceAdminPage',           'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"admin"}'),
  ('RcsaCampaignsPage',             'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('RegulatoryReasoningStudioPage', 'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"workspace"}'),
  ('ComplianceControlsPage',        'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ComplianceControlDetailPage',   'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"detail"}'),
  ('ComplianceEvidencePage',        'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ComplianceRegulatorPage',       'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ComplianceKsaPage',             'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ComplianceDiagnosticsPage',     'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('FrameworkMappingPage',          'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"mapping"}'),
  ('AssessmentTemplatesPage',       'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('AssessmentsListPage',           'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('NcaAssessmentPage',             'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"detail"}'),
  ('SamaAssessmentPage',            'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"detail"}'),
  ('MaturityWizardPage',            'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"wizard"}'),
  ('ScoringPage',                   'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"workspace"}'),
  ('ScoringPoliciesPage',           'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ScoringPolicyDetailPage',       'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"detail"}'),
  ('ControlPosturePage',            'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"dashboard"}'),
  ('ControlTestingPage',            'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"workspace"}'),
  ('ControlsMonitoringPage',        'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"dashboard"}'),
  ('RegulationCompilerPage',        'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"workspace"}'),
  ('RegulatoryFeedsPage',           'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('ExceptionManagerPage',          'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"list"}'),
  ('EsgPage',                       'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"dashboard"}'),
  ('EthicsIntegrityPage',           'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"dashboard"}'),
  ('SoxCompliancePage',             'ibm-carbon', 'approved', 'table',           '1', '{"module":"compliance","kind":"dashboard"}'),

  -- Catalog / taxonomy / browsing pages → structured-list
  ('UcfBrowserPage',                'ibm-carbon', 'approved', 'structured-list', '1', '{"module":"compliance","kind":"catalog"}'),
  ('ContentPackPage',               'ibm-carbon', 'approved', 'structured-list', '1', '{"module":"compliance","kind":"catalog"}'),
  ('MappingPage',                   'ibm-carbon', 'approved', 'structured-list', '1', '{"module":"compliance","kind":"catalog"}'),
  ('TaxonomyPage',                  'ibm-carbon', 'approved', 'structured-list', '1', '{"module":"compliance","kind":"catalog"}'),
  ('RegistryPage',                  'ibm-carbon', 'approved', 'structured-list', '1', '{"module":"compliance","kind":"catalog"}'),
  ('OntologyCatalogPage',           'ibm-carbon', 'approved', 'structured-list', '1', '{"module":"compliance","kind":"catalog"}')
ON CONFLICT (component_key) DO UPDATE
  SET vendor          = EXCLUDED.vendor,
      approval_status = EXCLUDED.approval_status,
      carbon_key      = EXCLUDED.carbon_key,
      metadata        = EXCLUDED.metadata,
      schema_version  = EXCLUDED.schema_version,
      approved_at     = COALESCE(dos.dynamic_ui_component_registry.approved_at, NOW());

-- Post-flight: every newly registered row must satisfy the Layer 7 invariants.
DO $$
DECLARE
  registered  INTEGER;
  drift       INTEGER;
BEGIN
  SELECT COUNT(*) INTO registered
    FROM dos.dynamic_ui_component_registry
   WHERE component_key LIKE 'Compliance%' OR component_key IN
     ('ObligationDetailPage','ObligationWorkspacePage','AssertionDashboardPage','RcsaCampaignsPage',
      'RegulatoryReasoningStudioPage','GenericModuleLifecycle','FrameworkHubPage','FrameworkMappingPage',
      'FrameworkScorecardPage','UcfBrowserPage','AssessmentTemplatesPage','AssessmentsListPage',
      'NcaAssessmentPage','SamaAssessmentPage','MaturityJourneyPage','MaturityWizardPage',
      'ScoringPage','ScoringPoliciesPage','ScoringPolicyDetailPage','ControlPosturePage',
      'ControlTestingPage','ControlsMonitoringPage','RegulationCompilerPage','RegulatoryDeltaDashboardPage',
      'RegulatoryFeedsPage','ExceptionManagerPage','EsgPage','EthicsIntegrityPage','SoxCompliancePage',
      'KsaHubPage','IntelligenceHubPage','ContentPackPage','MappingPage','TaxonomyPage',
      'RegistryPage','OntologyCatalogPage');

  SELECT COUNT(*) INTO drift
    FROM dos.dynamic_ui_component_registry r
    JOIN dos.ui_carbon_components c ON c.carbon_key = r.carbon_key
   WHERE r.metadata->>'module' = 'compliance'
     AND (c.vendor <> 'ibm-carbon'
          OR c.runtime_status IN ('blocked-react-only','catalog-only','missing-upstream-angular-binding')
          OR r.vendor <> 'ibm-carbon'
          OR r.approval_status <> 'approved');

  IF drift > 0 THEN
    RAISE EXCEPTION '0500: % compliance rows fail Layer 7 invariants', drift;
  END IF;

  RAISE NOTICE 'Compliance registry: % rows registered, drift=%', registered, drift;
END $$;

INSERT INTO dos.schema_migrations (filename, checksum, applied_by)
SELECT '20260502_0500_compliance_components_runtime_register.sql', 'inline-0500', 'system'
 WHERE NOT EXISTS (
   SELECT 1 FROM dos.schema_migrations
    WHERE filename = '20260502_0500_compliance_components_runtime_register.sql'
 );

COMMIT;
