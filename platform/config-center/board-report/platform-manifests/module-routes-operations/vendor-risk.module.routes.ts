/**
 * Vendor Risk module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 */
import type { ModuleRouteGroup } from '../../core/routing/route-registry.types';

export const vendorRiskModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },
    create:   { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'vendor' } },
    home: { loadComponent: () => import('../../features/vendor-risk/pages/vendor-sub-pages').then(m => m.VendorRiskHomeComponent) },
    overview: { loadComponent: () => import('../../features/vendor-risk/pages/vendor-sub-pages').then(m => m.VendorOverviewComponent) },
    register: { loadComponent: () => import('../../features/vendor-risk/pages/vendors/vendors.component').then(m => m.VendorsComponent) },
    'risk-assessments': { loadComponent: () => import('../../features/vendor-risk/pages/vendor-risk/vendor-risk.component').then(m => m.VendorRiskComponent) },
    ':id': { loadComponent: () => import('../../features/vendor-risk/pages/vendor-detail.component').then(m => m.VendorDetailComponent) },
    'due-diligence': { loadComponent: () => import('../../features/vendor-risk/pages/vendor-sub-pages').then(m => m.VendorDueDiligenceComponent) },
    sla: { loadComponent: () => import('../../features/vendor-risk/pages/vendor-sub-pages').then(m => m.VendorSlaComponent) },
    'fourth-party': { loadComponent: () => import('../../features/vendor-risk/pages/vendor-sub-pages').then(m => m.VendorFourthPartyComponent) },
    concentration: { loadComponent: () => import('../../features/vendor-risk/pages/vendor-sub-pages').then(m => m.VendorConcentrationComponent) },
    offboarding: { loadComponent: () => import('../../features/vendor-risk/pages/vendor-sub-pages').then(m => m.VendorOffboardingComponent) },
    monitoring: { loadComponent: () => import('../../features/vendor-risk/pages/vendor-sub-pages').then(m => m.VendorMonitoringComponent) },
    engagements: { loadComponent: () => import('../../features/vendor-risk/pages/vendor-sub-pages').then(m => m.VendorEngagementsComponent) },
    issues: { loadComponent: () => import('../../features/vendor-risk/pages/vendor-sub-pages').then(m => m.VendorIssuesComponent) },
    reports: { loadComponent: () => import('../../features/vendor-risk/pages/vendor-sub-pages').then(m => m.VendorReportsComponent) },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'vendor' } },
    admin: { loadComponent: () => import('../../features/vendor-risk/pages/vendor-sub-pages').then(m => m.VendorAdminComponent), requiredPermission: 'vendor.record.manage', adminOnly: true },
  },
};
