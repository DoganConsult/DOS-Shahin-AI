import type { ModuleRouteGroup } from '../../core/routing/route-registry.types';

export const recordsModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },
    home:     { loadComponent: () => import('../../features/records/pages/records-overview.component').then(m => m.RecordsOverviewComponent) },
    create:   { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'records' } },
    ':id':    { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'records' } },
    reports:  { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'records' } },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'records' } },
  },
};
