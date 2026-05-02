/**
 * Action module route fragment.
 * Lazy-loaded routes for action items.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const actionModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },
    home:      { loadComponent: () => import('../../features/action/pages/action-board.component').then(m => m.ActionBoardComponent) },
    create:    { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'action' } },
    ':id':     { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'action' } },
    reports:   { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'action' } },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'action' } },
  },
};

export const actionStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'action-items': { loadComponent: () => import('../../features/action/pages/action-items/action-items.component').then(m => m.ActionItemsComponent), requiredPermission: 'action.item.read', moduleCode: 'action' }
};

