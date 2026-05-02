export const riskRouteChildren = {
  home:           { loadComponent: () => import('../features/risk/pages/risk-overview.component').then(m => m.RiskOverviewComponent) },
  'work-queue':   { loadComponent: () => import('../features/risk/pages/risk-work-queue/risk-work-queue.component').then(m => m.RiskWorkQueueComponent) },
  register:       { loadComponent: () => import('../features/risk/pages/risk-register.component').then(m => m.RiskRegisterPageComponent) },
  'register/:id': { loadComponent: () => import('../features/risk/pages/risk-detail/risk-detail.component').then(m => m.RiskDetailPageComponent) },
  assessments:    { loadComponent: () => import('../features/risk/pages/risk-assessments.component').then(m => m.RiskAssessmentsPageComponent) },
  indicators:     { loadComponent: () => import('../features/risk/pages/risk-kris.component').then(m => m.RiskKrisPageComponent) },
  treatment:      { loadComponent: () => import('../features/risk/pages/risk-treatments.component').then(m => m.RiskTreatmentsPageComponent) },
  issues:         { loadComponent: () => import('../features/risk/pages/risk-issues/risk-issues.component').then(m => m.RiskIssuesComponent) },
  scenarios:      { loadComponent: () => import('../features/risk/pages/risk-scenarios.component').then(m => m.RiskScenariosComponent) },
  reports:        { loadComponent: () => import('../features/risk/pages/risk-reports/risk-reports.component').then(m => m.RiskReportsComponent) },
  admin:          { loadComponent: () => import('../features/risk/pages/risk-admin/risk-admin.component').then(m => m.RiskAdminComponent) },

  scoring:        { loadComponent: () => import('../features/risk/pages/risk-scoring-page.component').then(m => m.RiskScoringPageComponent) },
  acceptance:     { loadComponent: () => import('../features/risk/pages/risk-acceptance.component').then(m => m.RiskAcceptancePageComponent) },
  heatmap:        { loadComponent: () => import('../features/risk/pages/risk-heatmap.component').then(m => m.RiskHeatmapPageComponent) },
  metrics:        { loadComponent: () => import('../features/risk/pages/risk-metrics-page.component').then(m => m.RiskMetricsPageComponent) },
  appetite:       { loadComponent: () => import('../features/risk/pages/risk-appetite.component').then(m => m.RiskAppetitePageComponent) },
  bowtie:         { loadComponent: () => import('../features/risk/pages/risk-bowtie.component').then(m => m.RiskBowtieComponent) },

  overview:       { redirectTo: 'home', pathMatch: 'full' },
  kris:           { redirectTo: 'indicators', pathMatch: 'full' },
  treatments:     { redirectTo: 'treatment', pathMatch: 'full' },
} as const;

export const riskStandaloneRoutes = {
  vulnerabilities: {
    loadComponent: () => import('../features/risk/pages/vulnerabilities/vulnerabilities.component').then(m => m.VulnerabilitiesComponent),
    requiredPermission: 'risk.record.read',
    moduleCode: 'risk',
  },
  'model-risk': {
    loadComponent: () => import('../features/risk/pages/model-risk/model-risk.component').then(m => m.ModelRiskComponent),
    requiredPermission: 'risk.record.read',
    moduleCode: 'risk',
  },
} as const;
