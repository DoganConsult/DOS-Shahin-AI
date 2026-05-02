/**
 * Controls module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 * Owned by the controls feature; edit here instead of the central component-registry.
 *
 * Structure follows the canonical Controls Module spec:
 *   home → work-queue → library → library/:id → mapping → testing →
 *   certifications → deficiencies → monitoring → reports → admin
 *
 * Extras (lifecycle, posture) are preserved as additional routes
 * integrated into the spec structure.
 */
import type { ModuleRouteGroup } from '../../core/routing/route-registry.types';

export const controlsModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },

    create:           { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'controls' } },
    // ── Spec Primary Routes ─────────────────────────────────────────
    home:             { loadComponent: () => import('../../features/controls/pages/controls-home/controls-home.component').then(m => m.ControlsHomeComponent) },
    'work-queue':     { loadComponent: () => import('../../features/controls/pages/controls-work-queue/controls-work-queue.component').then(m => m.ControlsWorkQueueComponent) },
    library:          { loadComponent: () => import('../../features/controls/pages/controls-library/controls-library.component').then(m => m.ControlsLibraryComponent) },
    'library/:id':    { loadComponent: () => import('../../features/controls/pages/control-detail/control-detail.component').then(m => m.ControlDetailComponent) },
    mapping:          { loadComponent: () => import('../../features/controls/pages/controls-mapping/controls-mapping.component').then(m => m.ControlsMappingComponent) },
    testing:          { loadComponent: () => import('../../features/controls/pages/controls-testing/controls-testing.component').then(m => m.ControlsTestingComponent) },
    certifications:   { loadComponent: () => import('../../features/controls/pages/controls-certifications/controls-certifications.component').then(m => m.ControlsCertificationsComponent) },
    deficiencies:     { loadComponent: () => import('../../features/controls/pages/controls-deficiencies/controls-deficiencies.component').then(m => m.ControlsDeficienciesComponent) },
    monitoring:       { loadComponent: () => import('../../features/controls/pages/controls-monitoring/controls-monitoring.component').then(m => m.ControlsMonitoringComponent) },
    reports:          { loadComponent: () => import('../../features/controls/pages/controls-reports/controls-reports.component').then(m => m.ControlsReportsComponent) },
    admin:            { loadComponent: () => import('../../features/controls/pages/controls-admin/controls-admin.component').then(m => m.ControlsAdminComponent) },
    ':id':            { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'controls' } },

    // ── Extras (advanced analytics) ─────────────────────────────────
    lifecycle:        { loadComponent: () => import('../../pages/control-lifecycle/control-lifecycle.component').then(m => m.ControlLifecycleComponent) },
    posture:          { loadComponent: () => import('../../features/controls/pages/control-posture/control-posture.component').then(m => m.ControlPostureComponent) },

    // ── Backward-compat redirects from compliance paths ─────────────
    'controls-monitoring': { redirectTo: 'monitoring', pathMatch: 'full' },
  },
};
