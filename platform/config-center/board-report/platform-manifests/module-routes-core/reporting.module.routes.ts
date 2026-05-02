import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const reportingModuleRouteGroup: ModuleRouteGroup = {
  children: {}
};

export const reportingStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'report-scenario': { loadComponent: () => import('../../features/reports/pages/report-scenario/report-scenario.component').then(m => m.ReportScenarioComponent), requiredPermission: 'report.document.read', moduleCode: 'reporting' },
  'w/:workspaceId/reports': { loadComponent: () => import('../../features/reports/pages/reports.page').then(m => m.ReportsPageComponent), requiredPermission: 'report.document.read', moduleCode: 'reporting' }
};

