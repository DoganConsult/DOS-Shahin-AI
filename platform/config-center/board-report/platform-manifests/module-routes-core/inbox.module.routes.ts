import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const inboxModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },
    home:     { redirectTo: '/workflow/inbox', pathMatch: 'full' },
    hub:      { redirectTo: '/workflow/inbox', pathMatch: 'full' },
    create:   { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'inbox' } },
    ':id':    { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'inbox' } },
    reports:  { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'inbox' } },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'inbox' } },
    diagnostics: { redirectTo: '/workflow/inbox', pathMatch: 'full' },
    dashboard: { redirectTo: '/workflow/inbox', pathMatch: 'full' },
    admin: { redirectTo: '/workflow/inbox', pathMatch: 'full' },
  },
};

export const inboxStandaloneRoutes: Record<string, StandaloneRouteEntry> = {};
