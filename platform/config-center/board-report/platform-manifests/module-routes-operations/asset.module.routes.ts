/**
 * Asset module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 */
import type { ModuleRouteGroup } from '../../core/routing/route-registry.types';

export const assetModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },
    create:   { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'asset' } },
    home: { loadComponent: () => import('../../features/asset/pages/asset-home/asset-home.component').then(m => m.AssetHomeComponent) },
    register: { loadComponent: () => import('../../features/asset/pages/asset-register/asset-register.component').then(m => m.AssetRegisterComponent) },
    ':id': { loadComponent: () => import('../../features/asset/pages/asset-detail/asset-detail.component').then(m => m.AssetDetailComponent) },
    applications: { loadComponent: () => import('../../features/asset/pages/asset-applications/asset-applications.component').then(m => m.AssetApplicationsComponent) },
    'service-map': { loadComponent: () => import('../../features/asset/pages/asset-service-map/asset-service-map.component').then(m => m.AssetServiceMapComponent) },
    dependencies: { loadComponent: () => import('../../features/asset/pages/asset-dependencies/asset-dependencies.component').then(m => m.AssetDependenciesComponent) },
    'critical-assets': { loadComponent: () => import('../../features/asset/pages/asset-critical/asset-critical.component').then(m => m.AssetCriticalComponent) },
    ownership: { loadComponent: () => import('../../features/asset/pages/asset-ownership/asset-ownership.component').then(m => m.AssetOwnershipComponent) },
    linkage: { loadComponent: () => import('../../features/asset/pages/asset-linkage/asset-linkage.component').then(m => m.AssetLinkageComponent) },
    reports: { loadComponent: () => import('../../features/asset/pages/asset-reports/asset-reports.component').then(m => m.AssetReportsComponent) },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'asset' } },
    admin: { loadComponent: () => import('../../features/asset/pages/asset-admin/asset-admin.component').then(m => m.AssetAdminComponent) },
  },
};
