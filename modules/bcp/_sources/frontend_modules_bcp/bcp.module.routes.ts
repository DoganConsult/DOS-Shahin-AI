import type { ModuleRouteGroup } from '../core/routing/route-registry.types';

export const bcpModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'overview',
  children: {
    '': { redirectTo: 'overview', pathMatch: 'full' },
    overview: { loadComponent: () => import('../features/bcp/pages/bcp-sub-pages').then(m => m.BcpOverviewComponent) },
    plans: { loadComponent: () => import('../features/incident/pages/bcp/bcp.component').then(m => m.BCPComponent) },
    bia: { loadComponent: () => import('../features/bcp/pages/bcp-sub-pages').then(m => m.BcpBiaComponent) },
    exercises: { loadComponent: () => import('../features/bcp/pages/bcp-sub-pages').then(m => m.BcpExercisesComponent) },
    'crisis-comm': { loadComponent: () => import('../features/bcp/pages/bcp-sub-pages').then(m => m.BcpCrisisCommComponent) },
    recovery: { loadComponent: () => import('../features/bcp/pages/bcp-sub-pages').then(m => m.BcpRecoveryComponent) },
    activation: { loadComponent: () => import('../features/bcp/pages/bcp-sub-pages').then(m => m.BcpActivationComponent) },
    dependencies: { loadComponent: () => import('../features/bcp/pages/bcp-sub-pages').then(m => m.BcpDependenciesComponent) },
    maturity: { loadComponent: () => import('../features/bcp/pages/bcp-sub-pages').then(m => m.BcpMaturityComponent) },
    'crisis-room': { loadComponent: () => import('../features/bcp/pages/bcp-sub-pages').then(m => m.BcpCrisisRoomComponent) },
    'recovery-metrics': { loadComponent: () => import('../features/bcp/pages/bcp-sub-pages').then(m => m.BcpRecoveryMetricsComponent) },
    findings: { loadComponent: () => import('../features/bcp/pages/bcp-sub-pages').then(m => m.BcpFindingsComponent) },
    create:    { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'bcp' } },
    ':id':     { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'bcp' } },
    reports: { loadComponent: () => import('../features/bcp/pages/bcp-sub-pages').then(m => m.BcpReportsComponent) },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'bcp' } },
    admin: { loadComponent: () => import('../features/bcp/pages/bcp-sub-pages').then(m => m.BcpAdminComponent), requiredPermission: 'bcp.plan.manage', adminOnly: true },
  },
};
