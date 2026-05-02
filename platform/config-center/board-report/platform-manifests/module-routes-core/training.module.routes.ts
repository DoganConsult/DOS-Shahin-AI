/**
 * Training module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 */
import type { ModuleRouteGroup } from '../../core/routing/route-registry.types';

export const trainingModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'overview',
  children: {
    '': { redirectTo: 'overview', pathMatch: 'full' },
    overview: { loadComponent: () => import('../../features/training/pages/training-sub-pages').then(m => m.TrainingOverviewComponent) },
    awareness: { loadComponent: () => import('../../features/training/pages/training-awareness.component').then(m => m.TrainingAwarenessComponent) },
    campaigns: { loadComponent: () => import('../../features/training/pages/training-sub-pages').then(m => m.TrainingCampaignsComponent) },
    assignments: { loadComponent: () => import('../../features/training/pages/training-sub-pages').then(m => m.TrainingAssignmentsComponent) },
    content: { loadComponent: () => import('../../features/training/pages/training-sub-pages').then(m => m.TrainingContentLibComponent) },
    certifications: { loadComponent: () => import('../../features/training/pages/training-sub-pages').then(m => m.TrainingCertificationsComponent) },
    phishing: { loadComponent: () => import('../../features/training/pages/training-sub-pages').then(m => m.TrainingPhishingComponent) },
    compliance: { loadComponent: () => import('../../features/training/pages/training-sub-pages').then(m => m.TrainingComplianceComponent) },
    create:    { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'training' } },
    ':id':     { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'training' } },
    reports: { loadComponent: () => import('../../features/training/pages/training-sub-pages').then(m => m.TrainingReportsComponent) },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'training' } },
  },
};
