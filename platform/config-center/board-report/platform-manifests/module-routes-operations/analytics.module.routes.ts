/**
 * Analytics module route fragment.
 * Lazy-loaded routes for analytics and KPI dashboards.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const analyticsModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },
    home:       { loadComponent: () => import('../../features/analytics/pages/analytics-dashboard/analytics-dashboard.component').then(m => m.AnalyticsDashboardComponent) },
    create:     { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'analytics' } },
    ':id':      { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'analytics' } },
    reports:    { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'analytics' } },
    lifecycle:  { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'analytics' } },
  },
};

export const analyticsStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'dashboard/:dashboardCode': { loadComponent: () => import('../../features/dashboard/pages/dynamic-dashboard-page.component').then(m => m.DynamicDashboardPageComponent), requiredPermission: 'analytics:read', moduleCode: 'analytics' },
  'admin/dashboards/:dashboardCode/edit': { loadComponent: () => import('../../features/dashboard/editor/dashboard-editor-page.component').then(m => m.DashboardEditorPageComponent), requiredPermission: 'analytics:write', moduleCode: 'analytics', adminOnly: true },
  'kpi/:key': { loadComponent: () => import('../../pages/kpi-detail/kpi-detail.component').then(m => m.KpiDetailComponent), requiredPermission: 'analytics:read', moduleCode: 'analytics' },
  'analytics-hub': { loadComponent: () => import('../../pages/analytics-hub/analytics-hub.component').then(m => m.AnalyticsHubComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'advanced-hub': { loadComponent: () => import('../../pages/advanced-hub/advanced-hub.component').then(m => m.AdvancedHubComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'regulator-heatmap': { loadComponent: () => import('../../pages/regulator-heatmap/regulator-heatmap.component').then(m => m.RegulatorHeatmapComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'digital-twin': { loadComponent: () => import('../../features/risk/pages/digital-twin/digital-twin.component').then(m => m.DigitalTwinComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'red-team': { loadComponent: () => import('../../features/ai-governance/pages/red-team/red-team.component').then(m => m.RedTeamComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'grc-query': { loadComponent: () => import('../../features/grc-query/components/grc-query-console.component').then(m => m.GrcQueryConsoleComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'entity-links': { loadComponent: () => import('../../pages/entity-link/entity-link.component').then(m => m.EntityLinkComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'public-explorer': { loadComponent: () => import('../../pages/public-explorer/public-explorer.component').then(m => m.PublicExplorerComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'widget-gallery': { loadComponent: () => import('../../pages/widgets/widgets.component').then(m => m.WidgetsComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'analytics-dashboard': { loadComponent: () => import('../../features/analytics/pages/analytics-dashboard/analytics-dashboard.component').then(m => m.AnalyticsDashboardComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'framework-scorecard': { loadComponent: () => import('../../features/compliance/pages/frameworks-group/framework-scorecard/framework-scorecard.component').then(m => m.FrameworkScorecardComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'maturity-journey': { loadComponent: () => import('../../features/compliance/pages/scoring-maturity/maturity-journey/maturity-journey.component').then(m => m.MaturityJourneyComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'ccm-dashboard': { loadComponent: () => import('../../pages/ccm-dashboard/ccm-dashboard.component').then(m => m.CcmDashboardComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'dashboard-sharing': { loadComponent: () => import('../../pages/dashboard-sharing/dashboard-sharing.component').then(m => m.DashboardSharingComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'shared-dashboard': { loadComponent: () => import('../../pages/shared-dashboard/shared-dashboard.component').then(m => m.SharedDashboardComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'data-explorer': { loadComponent: () => import('../../pages/data-explorer/data-explorer.component').then(m => m.DataExplorerComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'chart-showcase': { loadComponent: () => import('../../pages/chart-showcase/chart-showcase.component').then(m => m.ChartShowcaseComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'powerbi-dashboard': { loadComponent: () => import('../../features/reports/pages/powerbi-dashboard/powerbi-dashboard.component').then(m => m.PowerBIDashboardComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'entity-graph': { loadComponent: () => import('../../features/knowledge/pages/entity-graph/entity-graph-page.component').then(m => m.EntityGraphPageComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' },
  'w/:workspaceId/lifecycle/:stage': { loadComponent: () => import('../../features/governance/pages/lifecycle/lifecycle-stage.page').then(m => m.LifecycleStagePageComponent), requiredPermission: 'analytics.report.read', moduleCode: 'analytics' }
};

