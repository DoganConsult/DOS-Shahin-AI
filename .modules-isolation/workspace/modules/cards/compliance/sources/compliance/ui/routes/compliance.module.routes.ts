import type { ModuleRouteGroup, StandaloneRouteEntry } from '@app/runtime/routing/route-registry.types';

export const complianceRouteChildren = {
  overview: { loadComponent: () => import('../features/compliance/pages/compliance-core-pages/compliance-core/compliance-page.component').then(m => m.CompliancePageComponent) },
  frameworks: { loadComponent: () => import('../features/compliance/pages/regulatory-group/compliance-regulatory/compliance-frameworks-page.component').then(m => m.ComplianceFrameworksPageComponent) },
  controls: { redirectTo: '/controls/library', pathMatch: 'full' },
  'controls-monitoring': { redirectTo: '/controls/monitoring', pathMatch: 'full' },
  assessments: { loadComponent: () => import('../features/compliance/pages/assessments-group/compliance-assessments-findings/compliance-assessments-page.component').then(m => m.ComplianceAssessmentsPageComponent) },
  attestations: { loadComponent: () => import('../features/compliance/pages/assessments-group/compliance-assessments-findings/compliance-attestations-page.component').then(m => m.ComplianceAttestationsPageComponent) },
  obligations: { loadComponent: () => import('../features/compliance/pages/regulatory-group/compliance-regulatory/compliance-obligations-page.component').then(m => m.ComplianceObligationsPageComponent) },
  'obligation-workspace': { loadComponent: () => import('../features/compliance/pages/regulatory-group/compliance-regulatory/obligation-workspace.component').then(m => m.ObligationWorkspaceComponent) },
  'obligations/:id': { loadComponent: () => import('../features/compliance/pages/regulatory-group/compliance-regulatory/obligation-detail-page.component').then(m => m.ObligationDetailPageComponent) },
  findings: { loadComponent: () => import('../features/compliance/pages/assessments-group/compliance-assessments-findings/compliance-findings-page.component').then(m => m.ComplianceFindingsPageComponent) },
  gaps: { loadComponent: () => import('../features/compliance/pages/assessments-group/compliance-assessments-findings/compliance-gaps-page.component').then(m => m.ComplianceGapsPageComponent) },
  posture: { loadComponent: () => import('../features/compliance/pages/compliance-core-pages/compliance-core/compliance-posture-page.component').then(m => m.CompliancePosturePageComponent) },
  heatmap: { loadComponent: () => import('../features/compliance/pages/assessments-group/compliance-assessments-findings/compliance-heatmap-page.component').then(m => m.ComplianceHeatMapPageComponent) },
  calendar: { loadComponent: () => import('../features/compliance/pages/compliance-core-pages/compliance-core/compliance-calendar-page.component').then(m => m.ComplianceCalendarPageComponent) },
  roadmap: { loadComponent: () => import('../features/compliance/pages/compliance-core-pages/compliance-core/compliance-roadmap-page.component').then(m => m.ComplianceRoadmapPageComponent) },
  templates: { loadComponent: () => import('../features/compliance/pages/compliance-core-pages/compliance-core/compliance-templates-page.component').then(m => m.ComplianceTemplatesPageComponent) },
  'regulatory-changes': { loadComponent: () => import('../features/compliance/pages/regulatory-group/compliance-regulatory/compliance-regulatory-changes.component').then(m => m.ComplianceRegulatoryChangesComponent) },
  'assertion-dashboard': { loadComponent: () => import('../features/compliance/pages/assessments-group/compliance-assessments-findings/assertion-dashboard.component').then(m => m.AssertionDashboardComponent) },
  'rcsa-campaigns': { loadComponent: () => import('../features/compliance/pages/assessments-group/compliance-assessments-findings/rcsa-campaigns.component').then(m => m.RcsaCampaignsComponent) },
  'regulatory-reasoning-studio': { loadComponent: () => import('../features/compliance/pages/regulatory-group/compliance-regulatory/regulatory-reasoning-studio.component').then(m => m.RegulatoryReasoningStudioComponent) },
  'work-queue': { loadComponent: () => import('../features/compliance/pages/compliance-core-pages/compliance-core/compliance-work-queue-page.component').then(m => m.ComplianceWorkQueuePageComponent) },
  exceptions: { loadComponent: () => import('../features/compliance/pages/assessments-group/compliance-assessments-findings/compliance-exceptions-page.component').then(m => m.ComplianceExceptionsPageComponent) },
  'evidence-ops': { loadComponent: () => import('../features/compliance/pages/controls-group/compliance-controls-monitoring/compliance-evidence-ops-page.component').then(m => m.ComplianceEvidenceOpsPageComponent) },
  reports: { loadComponent: () => import('../features/compliance/pages/compliance-core-pages/compliance-core/compliance-reports-page.component').then(m => m.ComplianceReportsPageComponent) },
  admin: { loadComponent: () => import('../features/compliance/pages/compliance-core-pages/compliance-core/compliance-admin-page.component').then(m => m.ComplianceAdminPageComponent) },
} as const;

export const complianceModuleRouteGroup: ModuleRouteGroup = {
  defaultRedirect: 'overview',
  children: {
    '': { redirectTo: 'overview', pathMatch: 'full' },
    ...complianceRouteChildren,
  },
};

export const complianceStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'controls/monitoring': { loadComponent: () => import('../features/compliance/pages/controls-group/compliance-controls-monitoring/controls-monitoring-page.component').then(m => m.ControlsMonitoringPageComponent), requiredPermission: 'control.record.read', moduleCode: 'compliance' },
  'maturity': { loadComponent: () => import('../features/compliance/pages/scoring-maturity/maturity/maturity-wizard.component').then(m => m.MaturityWizardComponent), requiredPermission: 'assessment.record.read', moduleCode: 'compliance' },
  'registry': { loadComponent: () => import('../features/compliance/pages/registry/registry.component').then(m => m.RegistryComponent), requiredPermission: 'framework.record.read', moduleCode: 'compliance' },
  'framework-hub': { loadComponent: () => import('../features/compliance/pages/frameworks-group/framework-hub/framework-hub.component').then(m => m.FrameworkHubComponent), requiredPermission: 'framework.record.read', moduleCode: 'compliance' },
  'scoring-policy': { loadComponent: () => import('../features/compliance/pages/scoring-maturity/scoring-policy/scoring-policy.component').then(m => m.ScoringPolicyComponent), requiredPermission: 'assessment.record.manage', moduleCode: 'compliance' },
  'regulatory-delta': { loadComponent: () => import('../features/compliance/pages/regulatory-group/regulatory-delta/regulatory-delta-dashboard.component').then(m => m.RegulatoryDeltaDashboardComponent), requiredPermission: 'framework.record.read', moduleCode: 'compliance' },
  'ucf-browser': { loadComponent: () => import('../features/compliance/pages/frameworks-group/ucf-browser/ucf-browser.component').then(m => m.UCFBrowserComponent), requiredPermission: 'framework.record.read', moduleCode: 'compliance' },
  'assessment-templates': { loadComponent: () => import('../features/compliance/pages/assessments-group/assessment-templates/assessment-templates.component').then(m => m.AssessmentTemplatesComponent), requiredPermission: 'assessment.record.read', moduleCode: 'compliance' },
  'scoring-policies': { loadComponent: () => import('../features/compliance/pages/scoring-maturity/scoring-policies/scoring-policies.component').then(m => m.ScoringPoliciesComponent), requiredPermission: 'compliance.program.read', moduleCode: 'compliance' },
  'assessments': { loadComponent: () => import('../features/compliance/pages/assessments-group/assessments/assessments.component').then(m => m.AssessmentsComponent), requiredPermission: 'assessment.record.read', moduleCode: 'compliance' },
  'content-packs': { loadComponent: () => import('../features/compliance/pages/content-pack/content-pack.component').then(m => m.ContentPackComponent), requiredPermission: 'framework.record.read', moduleCode: 'compliance' },
  'ksa-hub': { loadComponent: () => import('../features/compliance/pages/ksa-hub/ksa-hub.component').then(m => m.KSAHubComponent), requiredPermission: 'framework.record.read', moduleCode: 'compliance' },
  'mappings': { loadComponent: () => import('../features/compliance/pages/mapping/mapping.component').then(m => m.MappingComponent), requiredPermission: 'framework.record.read', moduleCode: 'compliance' },
  'scoring-engine': { loadComponent: () => import('../features/compliance/pages/scoring-maturity/scoring/scoring.component').then(m => m.ScoringComponent), requiredPermission: 'compliance.program.read', moduleCode: 'compliance' },
  'regulation-compiler': { loadComponent: () => import('../features/compliance/pages/regulatory-group/regulation-compiler/regulation-compiler.component').then(m => m.RegulationCompilerComponent), requiredPermission: 'framework.record.read', moduleCode: 'compliance' },
  'control-testing': { loadComponent: () => import('../features/compliance/pages/controls-group/control-testing/control-testing.component').then(m => m.ControlTestingComponent), requiredPermission: 'control.record.read', moduleCode: 'compliance' },
  'regulatory-feeds': { loadComponent: () => import('../features/compliance/pages/regulatory-group/regulatory-feeds/regulatory-feeds.component').then(m => m.RegulatoryFeedsComponent), requiredPermission: 'framework.record.read', moduleCode: 'compliance' },
  'taxonomy': { loadComponent: () => import('../features/compliance/pages/taxonomy/taxonomy.component').then(m => m.TaxonomyComponent), requiredPermission: 'framework.record.read', moduleCode: 'compliance' },
  'ontology-catalog': { loadComponent: () => import('../features/compliance/pages/ontology-catalog/ontology-catalog.component').then(m => m.OntologyCatalogComponent), requiredPermission: 'framework.record.read', moduleCode: 'compliance' },
};
