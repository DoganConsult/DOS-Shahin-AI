/**
 * Exception module route fragment.
 * Lazy-loaded routes for exception management.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const exceptionModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },
    home:      { loadComponent: () => import('../../features/exception/pages/exception-management.component').then(m => m.ExceptionManagementComponent) },
    create:    { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'exception' } },
    ':id':     { loadComponent: () => import('../../features/exception/pages/exception-detail.component').then(m => m.ExceptionDetailComponent), data: { moduleCode: 'exception' } },
    reports:   { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'exception' } },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'exception' } },
  },
};

export const exceptionStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'exception-manager': { loadComponent: () => import('../../features/compliance/pages/findings-exceptions/exception-manager/exception-manager.component').then(m => m.ExceptionManagerComponent), requiredPermission: 'exception.record.read', moduleCode: 'exception' }
};

