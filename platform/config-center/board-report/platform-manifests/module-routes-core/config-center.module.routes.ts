import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const configCenterModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'resolve',
  children: {
    '': { redirectTo: 'resolve', pathMatch: 'full' },
    resolve:  { loadComponent: () => import('../../pages/config-center/config-resolution.component').then(m => m.ConfigResolutionComponent) },
    settings: { loadComponent: () => import('../../pages/config-center/config-settings.component').then(m => m.ConfigSettingsComponent) },
    audit:    { loadComponent: () => import('../../pages/config-center/config-audit.component').then(m => m.ConfigAuditComponent) },
    health:   { loadComponent: () => import('../../pages/config-center/config-health.component').then(m => m.ConfigHealthComponent) },
    compare:  { loadComponent: () => import('../../pages/config-center/config-compare.component').then(m => m.ConfigCompareComponent) },
    gateway:  { loadComponent: () => import('../../pages/config-center/config-gateway.component').then(m => m.ConfigGatewayComponent) },
    workspace: { loadComponent: () => import('../../pages/config-center/config-workspace.component').then(m => m.ConfigWorkspaceComponent) },
  },
};

export const configCenterStandaloneRoutes: Record<string, StandaloneRouteEntry> = {};
