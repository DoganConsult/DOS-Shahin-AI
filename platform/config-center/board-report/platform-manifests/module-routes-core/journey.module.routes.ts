/**
 * Journey module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const journeyModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'dashboard',
  children: {
    '': { redirectTo: 'dashboard', pathMatch: 'full' },
    dashboard: { loadComponent: () => import('../../features/journey/pages/journey-dashboard.component').then(m => m.JourneyDashboardComponent) },
    maturity: { loadComponent: () => import('../../features/journey/pages/maturity-dashboard.component').then(m => m.MaturityDashboardComponent) },
    roadmap: { loadComponent: () => import('../../features/journey/pages/roadmap-view.component').then(m => m.RoadmapViewComponent) },
    visualizer: { loadComponent: () => import('../../features/journey/pages/roadmap-visualizer.component').then(m => m.RoadmapVisualizerComponent) },
    'setup-wizard': { loadComponent: () => import('../../features/journey/pages/setup-wizard.component').then(m => m.SetupWizardComponent) },
    'stage/:id': { loadComponent: () => import('../../features/journey/pages/stage-detail.component').then(m => m.StageDetailComponent) },
    create:    { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'journey' } },
    ':id':     { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'journey' } },
    reports:   { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'journey' } },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'journey' } },
    diagnostics: { loadComponent: () => import('../../features/journey/diagnostics/journey-diagnostics.component').then(m => m.JourneyDiagnosticsComponent) },
    admin: { loadComponent: () => import('../../features/journey/pages/journey-dashboard.component').then(m => m.JourneyDashboardComponent), data: { moduleCode: 'journey', view: 'admin' } },
  },
};

export const journeyStandaloneRoutes: Record<string, StandaloneRouteEntry> = {};
