/**
 * Privacy module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const privacyModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'overview',
  children: {
    '': { redirectTo: 'overview', pathMatch: 'full' },
    'overview': { loadComponent: () => import('../../features/privacy/pages/privacy-overview.component').then(m => m.PrivacyOverviewComponent) },
    'consent': { loadComponent: () => import('../../features/privacy/pages/privacy-consent.component').then(m => m.PrivacyConsentComponent) },
    'data-subjects': { loadComponent: () => import('../../features/privacy/pages/privacy-data-subjects.component').then(m => m.PrivacyDataSubjectsComponent) },
    'processing-register': { loadComponent: () => import('../../features/privacy/pages/privacy-processing-register.component').then(m => m.PrivacyProcessingRegisterComponent) },
    'dpia': { loadComponent: () => import('../../features/privacy/pages/privacy-dpia.component').then(m => m.PrivacyDpiaComponent) },
    'breach-notification': { loadComponent: () => import('../../features/privacy/pages/privacy-breach-notification.component').then(m => m.PrivacyBreachNotificationComponent) },
    'budget': { loadComponent: () => import('../../features/privacy/pages/privacy-budget-dashboard.component').then(m => m.PrivacyBudgetDashboardComponent) },
    create:    { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'privacy' } },
    ':id':     { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'privacy' } },
    reports:   { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'privacy' } },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'privacy' } },
  },
};

export const privacyStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'privacy-hub': { loadComponent: () => import('../../features/privacy/pages/privacy-hub-page/privacy-hub.component').then(m => m.PrivacyHubComponent), requiredPermission: 'privacy.record.read', moduleCode: 'privacy' },
  'dpia': { loadComponent: () => import('../../features/privacy/pages/dpia/dpia.component').then(m => m.DPIAComponent), requiredPermission: 'privacy.record.read', moduleCode: 'privacy' },
  'privacy-ops': { loadComponent: () => import('../../features/privacy/pages/privacy-ops/privacy-ops.component').then(m => m.PrivacyOpsComponent), requiredPermission: 'privacy.record.read', moduleCode: 'privacy' },
  'privacy-budget': { loadComponent: () => import('../../features/privacy/pages/privacy-budget/privacy-budget.component').then(m => m.PrivacyBudgetComponent), requiredPermission: 'privacy.record.read', moduleCode: 'privacy' }
};

