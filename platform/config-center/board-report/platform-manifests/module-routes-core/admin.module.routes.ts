/**
 * Admin module route fragment.
 * Lazy-loaded routes for platform administration.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const adminModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },
    home:                 { loadComponent: () => import('../../features/admin/pages/admin-hub/admin-hub.component').then(m => m.AdminHubComponent) },
    dashboard:            { loadComponent: () => import('../../features/admin/pages/admin-dashboard-page/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
    administration:       { loadComponent: () => import('../../features/admin/pages/administration/administration.component').then(m => m.AdministrationComponent) },
    billing:              { loadComponent: () => import('../../features/admin/pages/billing/billing.component').then(m => m.BillingComponent) },
    'bulk-import':        { loadComponent: () => import('../../features/admin/pages/bulk-import/bulk-import.component').then(m => m.BulkImportComponent) },
    'field-rbac':         { loadComponent: () => import('../../features/admin/pages/field-rbac/field-rbac.component').then(m => m.FieldRbacComponent) },
    inference:            { loadComponent: () => import('../../features/admin/pages/inference-admin/inference-admin.component').then(m => m.InferenceAdminComponent) },
    config:               { loadComponent: () => import('../../features/admin/pages/platform-config/platform-config.component').then(m => m.PlatformConfigComponent) },
    'email-approvals':    { loadComponent: () => import('../../features/admin/pages/platform-email-approvals/platform-email-approvals.component').then(m => m.PlatformEmailApprovalsComponent) },
    provisioning:         { loadComponent: () => import('../../features/admin/pages/provisioning-dashboard/provisioning-dashboard.component').then(m => m.ProvisioningDashboardComponent) },
    tiers:                { loadComponent: () => import('../../features/admin/pages/tier-management/tier-management.component').then(m => m.TierManagementComponent) },
    'training-data':      { loadComponent: () => import('../../features/admin/pages/training-data/training-data.component').then(m => m.TrainingDataComponent) },
    'platform-registry':  { loadComponent: () => import('../../features/admin/pages/platform-registry/platform-registry.component').then(m => m.PlatformRegistryComponent) },
    diagnostics:          { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'admin', pageTitle: 'Platform Diagnostics' } },
    observability:        { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'admin', pageTitle: 'Platform Health' } },
    modules:              { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'admin', pageTitle: 'Module Registry' } },
    products:             { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'admin', pageTitle: 'Product Registry' } },
    'feature-flags':      { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'admin', pageTitle: 'Feature Flags' } },
    'event-bus':          { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'admin', pageTitle: 'Event Bus' } },
    // User + tenant surfaces — reuse the foundation/tenant-config components
    // already serving the workspace shell so admin operators see the same
    // canonical pages as end-users.
    users:                { loadComponent: () => import('../../../../foundation/ui/pages/foundation-users.component').then(m => m.FoundationUsersComponent) },
    'user-settings':      { loadComponent: () => import('../../../../foundation/ui/pages/account-settings/account-settings.component').then(m => m.AccountSettingsComponent) },
    tenants:              { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'admin', pageTitle: 'Tenants', apiPath: '/api/admin/dos/tenants' } },
    'tenant-settings':    { loadComponent: () => import('../../../tenant-config/tenant-config.component').then(m => m.TenantConfigComponent) },
    create:               { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'admin' } },
    ':id':                { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'admin' } },
    reports:              { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'admin' } },
    lifecycle:            { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'admin' } },
  },
};

export const adminStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'admin/settings': { loadComponent: () => import('../../features/admin/pages/admin-dashboard-page/admin-settings.component').then(m => m.AdminSettingsComponent), requiredPermission: 'platform:admin', moduleCode: 'admin', adminOnly: true }
};

