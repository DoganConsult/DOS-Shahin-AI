/**
 * Reports module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 */
import type { ModuleRouteGroup } from '../../core/routing/route-registry.types';

export const reportsModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'overview',
  children: {
    '': { redirectTo: 'overview', pathMatch: 'full' },
    overview: { loadComponent: () => import('../../features/reports/pages/reports-overview.component').then(m => m.ReportsOverviewComponent) },
    builder: { loadComponent: () => import('../../features/reports/pages/report-builder.component').then(m => m.ReportBuilderComponent) },
    risk: { loadComponent: () => import('../../features/reports/pages/risk-report.component').then(m => m.RiskReportComponent) },
    compliance: { loadComponent: () => import('../../features/reports/pages/compliance-report.component').then(m => m.ComplianceReportComponent) },
    audit: { loadComponent: () => import('../../features/reports/pages/audit-report.component').then(m => m.AuditReportComponent) },
    evidence: { loadComponent: () => import('../../features/reports/pages/evidence-report.component').then(m => m.EvidenceReportComponent) },
    executive: { loadComponent: () => import('../../features/reports/pages/executive-report.component').then(m => m.ExecutiveReportComponent) },
    exports: { loadComponent: () => import('../../features/reports/pages/exports-page.component').then(m => m.ExportsPageComponent) },
    scheduled: { loadComponent: () => import('../../features/reports/pages/scheduled-reports.component').then(m => m.ScheduledReportsComponent) },
    hub: { loadComponent: () => import('../../features/reports/pages/report-hub/report-hub.component').then(m => m.ReportHubComponent) },
    center: { loadComponent: () => import('../../features/reports/pages/report-center/report-center.component').then(m => m.ReportCenterComponent) },
    generator: { loadComponent: () => import('../../features/reports/pages/report-generator/report-generator.component').then(m => m.ReportGeneratorComponent) },
    scenario: { loadComponent: () => import('../../features/reports/pages/report-scenario/report-scenario.component').then(m => m.ReportScenarioComponent) },
    ext: { loadComponent: () => import('../../features/reports/pages/report-ext/report-ext.component').then(m => m.ReportExtComponent) },
    powerbi: { loadComponent: () => import('../../features/reports/pages/powerbi-dashboard/powerbi-dashboard.component').then(m => m.PowerBIDashboardComponent) },
    samples: { loadComponent: () => import('../../features/reports/pages/sample-reports/sample-reports.component').then(m => m.SampleReportsComponent) },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'reports' } },
  },
};
