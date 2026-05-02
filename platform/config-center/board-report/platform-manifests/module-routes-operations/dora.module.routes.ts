/**
 * DORA module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 */
import type { ModuleRouteGroup } from '../../core/routing/route-registry.types';

export const doraModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'overview',
  children: {
    '': { redirectTo: 'overview', pathMatch: 'full' },
    'overview': { loadComponent: () => import('../../features/dora/pages/dora-overview.component').then(m => m.DoraOverviewComponent) },
    'ict-assets': { loadComponent: () => import('../../features/dora/pages/dora-ict-assets.component').then(m => m.DoraIctAssetsComponent) },
    'major-incidents': { loadComponent: () => import('../../features/dora/pages/dora-major-incidents.component').then(m => m.DoraMajorIncidentsComponent) },
    'resilience-tests': { loadComponent: () => import('../../features/dora/pages/dora-resilience-tests.component').then(m => m.DoraResilienceTestsComponent) },
    'test-results': { loadComponent: () => import('../../features/dora/pages/dora-test-results.component').then(m => m.DoraTestResultsComponent) },
    'threat-intel': { loadComponent: () => import('../../features/dora/pages/dora-threat-intel.component').then(m => m.DoraThreatIntelComponent) },
    'backups': { loadComponent: () => import('../../features/dora/pages/dora-backups.component').then(m => m.DoraBackupsComponent) },
    create:    { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'dora' } },
    ':id':     { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'dora' } },
    reports:   { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'dora' } },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'dora' } },
  },
};
