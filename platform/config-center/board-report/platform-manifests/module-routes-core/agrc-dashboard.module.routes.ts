/**
 * AGRC Dashboard module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 * No shell component; the layout component is loaded directly via the :code param route.
 */
import type { ModuleRouteGroup } from '../../core/routing/route-registry.types';

export const agrcDashboardModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  children: {
    ':code': { loadComponent: () => import('../../pages/agrc-dashboard/agrc-dashboard-layout.component').then(m => m.AgrcDashboardLayoutComponent) },
    'lifecycle': { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent) },
  },
};
