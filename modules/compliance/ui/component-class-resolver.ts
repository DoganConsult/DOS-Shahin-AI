/**
 * Compliance componentKey → Angular class-name resolver.
 *
 * The dynamic-ui seed registers componentKeys (e.g. `ComplianceFrameworksPage`,
 * `FrameworkHubPage`) which the SPA renderer maps to standalone Angular
 * components by class name. Historically the module evolved with two naming
 * conventions:
 *
 *   1. {Key}Component                 — current convention; class = key + 'Component'
 *      e.g. ComplianceFrameworksPage  → ComplianceFrameworksPageComponent ✅
 *
 *   2. {Key without 'Page'}Component  — older convention surviving in many files
 *      e.g. FrameworkHubPage          → FrameworkHubComponent ✅
 *
 *   3. Idiosyncratic legacy class names that don't follow 1 or 2:
 *      e.g. NcaAssessmentPage         → NCAAssessmentComponent (uppercased acronym)
 *           ScoringPolicyDetailPage   → ScoringPolicyComponent (different name)
 *
 * This map captures the truth so:
 *   - the contract test can verify every key has a real implementation
 *   - the SPA renderer can resolve a key to the right class
 *   - rename refactors can target the keys, not 60 separate files
 *
 * Update this map when you rename a class OR add a new componentKey.
 */
export const COMPONENT_CLASS_RESOLVER: Record<string, string> = {
  // Convention 1 — Key + 'Component' matches the existing class verbatim
  AssertionDashboardPage:           'AssertionDashboardComponent',
  ComplianceAdminPage:              'ComplianceAdminPageComponent',
  ComplianceAssessmentsPage:        'ComplianceAssessmentsPageComponent',
  ComplianceAttestationsPage:       'ComplianceAttestationsPageComponent',
  ComplianceCalendarPage:           'ComplianceCalendarPageComponent',
  ComplianceExceptionsPage:         'ComplianceExceptionsPageComponent',
  ComplianceFindingsPage:           'ComplianceFindingsPageComponent',
  ComplianceFrameworksPage:         'ComplianceFrameworksPageComponent',
  ComplianceGapsPage:               'ComplianceGapsPageComponent',
  ComplianceHubComponent:           'ComplianceHubComponent',
  ComplianceObligationsPage:        'ComplianceObligationsPageComponent',
  CompliancePosturePage:            'CompliancePosturePageComponent',
  ComplianceRegulatoryChangesPage:  'ComplianceRegulatoryChangesComponent',
  ComplianceReportsPage:            'ComplianceReportsPageComponent',
  ComplianceRoadmapPage:            'ComplianceRoadmapPageComponent',
  ComplianceTemplatesPage:          'ComplianceTemplatesPageComponent',
  ComplianceWorkQueuePage:          'ComplianceWorkQueuePageComponent',
  ObligationDetailPage:             'ObligationDetailPageComponent',
  ObligationWorkspacePage:          'ObligationWorkspaceComponent',
  RcsaCampaignsPage:                'RcsaCampaignsComponent',
  RegulatoryReasoningStudioPage:    'RegulatoryReasoningStudioComponent',

  // Convention 2 — Drop 'Page' suffix to find the existing class
  FrameworkHubPage:             'FrameworkHubComponent',
  FrameworkMappingPage:         'FrameworkMappingComponent',
  FrameworkScorecardPage:       'FrameworkScorecardComponent',
  AssessmentTemplatesPage:      'AssessmentTemplatesComponent',
  MaturityJourneyPage:          'MaturityJourneyComponent',
  MaturityWizardPage:           'MaturityWizardComponent',
  ScoringPage:                  'ScoringComponent',
  ScoringPoliciesPage:          'ScoringPoliciesComponent',
  ControlPosturePage:           'ControlPostureComponent',
  ControlTestingPage:           'ControlTestingComponent',
  ControlsMonitoringPage:       'ControlsMonitoringPageComponent',
  RegulationCompilerPage:       'RegulationCompilerComponent',
  RegulatoryDeltaDashboardPage: 'RegulatoryDeltaDashboardComponent',
  RegulatoryFeedsPage:          'RegulatoryFeedsComponent',
  ExceptionManagerPage:         'ExceptionManagerComponent',
  EthicsIntegrityPage:          'EthicsIntegrityComponent',
  IntelligenceHubPage:          'IntelligenceHubComponent',
  ContentPackPage:              'ContentPackComponent',
  MappingPage:                  'MappingComponent',
  TaxonomyPage:                 'TaxonomyComponent',
  RegistryPage:                 'RegistryComponent',
  OntologyCatalogPage:          'OntologyCatalogComponent',
  ComplianceEvidenceOpsPage:    'ComplianceEvidenceOpsPageComponent',
  ComplianceHome:               'ComplianceHubComponent',     // home == hub for compliance landing

  // Convention 3 — Idiosyncratic legacy class names
  ComplianceOverviewPage:       'CompliancePageComponent',
  ComplianceHeatmapPage:        'ComplianceHeatMapPageComponent',
  ComplianceControlsPage:       'ControlsComponent',
  ComplianceControlDetailPage:  'ControlTestingComponent',     // PLACEHOLDER — proper detail page TODO
  ComplianceEvidencePage:       'ComplianceEvidenceOpsPageComponent',
  ComplianceDiagnosticsPage:    'ComplianceAdminPageComponent', // PLACEHOLDER — proper diagnostics page TODO
  ComplianceKsaPage:            'KSAHubComponent',
  KsaHubPage:                   'KSAHubComponent',
  ComplianceRegulatorPage:      'RegulatoryReasoningStudioComponent', // PLACEHOLDER — proper regulator portal TODO
  ComplianceSavingsPage:        'ComplianceSavingsComponent',
  NcaAssessmentPage:            'NCAAssessmentComponent',
  SamaAssessmentPage:           'SAMAAssessmentComponent',
  EsgPage:                      'ESGComponent',
  SoxCompliancePage:            'SOXComplianceComponent',
  UcfBrowserPage:               'UCFBrowserComponent',
  AssessmentsListPage:          'AssessmentsComponent',
  ScoringPolicyDetailPage:      'ScoringPolicyComponent',
  ComplianceCatchAll:           'ComplianceCatchAll',          // shell stub (no .ts file — rendered as 404)
  GenericModuleLifecycle:       'GenericModuleLifecycleComponent', // scaffolded by this session
};

/**
 * Tags componentKeys whose mapping is a deliberate placeholder reusing an
 * adjacent component until the proper one is built. Tracked in
 * docs/HONEST-AUDIT-2026-05-02.md §C item B.2.
 */
export const COMPONENT_PLACEHOLDERS = new Set<string>([
  'ComplianceControlDetailPage',
  'ComplianceDiagnosticsPage',
  'ComplianceRegulatorPage',
]);
