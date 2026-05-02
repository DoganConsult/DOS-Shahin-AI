/**
 * Remediation module route fragment.
 * Lazy-loaded routes for remediation tracking.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const remediationModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },
    home:      { loadComponent: () => import('../../features/remediation/pages/remediation-tracker.component').then(m => m.RemediationTrackerComponent) },
    create:    { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'remediation' } },
    ':id':     { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'remediation' } },
    reports:   { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'remediation' } },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'remediation' } },
  },
};

export const remediationStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'remediation': { loadComponent: () => import('../../features/remediation/pages/remediation-page/remediation.component').then(m => m.RemediationComponent), requiredPermission: 'remediation.task.read', moduleCode: 'remediation' }
};

