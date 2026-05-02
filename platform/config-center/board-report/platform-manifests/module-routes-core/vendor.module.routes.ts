import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const vendorModuleRouteGroup: ModuleRouteGroup = {
  children: {}
};

export const vendorStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'vendor-hub': { loadComponent: () => import('../../features/vendor-risk/pages/vendor-hub/vendor-hub.component').then(m => m.VendorHubComponent), requiredPermission: 'vendor.record.read', moduleCode: 'vendor' },
  'vendor-risk-ext': { loadComponent: () => import('../../features/vendor-risk/pages/vendor-risk-ext/vendor-risk-ext.component').then(m => m.VendorRiskExtComponent), requiredPermission: 'vendor.record.read', moduleCode: 'vendor', adminOnly: true },
  'vendor/:vendorId': { loadComponent: () => import('../../features/vendor-risk/pages/vendor-detail.component').then(m => m.VendorDetailComponent), requiredPermission: 'vendor.record.read', moduleCode: 'vendor' }
};

