/**
 * Risk module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';
import { riskRouteChildren, riskStandaloneRoutes } from '@risk-module/ui/routes/risk.module.routes';

export const riskModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },
    create: { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'risk' } },
    ...riskRouteChildren,
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'risk' } },
  },
};

export const riskStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  ...(riskStandaloneRoutes as any),
  'w/:workspaceId/risks': { loadComponent: () => import('../../features/dashboard/entities/risks/risks.page').then(m => m.RisksPageComponent), requiredPermission: 'risk.record.read', moduleCode: 'risk' },
};
