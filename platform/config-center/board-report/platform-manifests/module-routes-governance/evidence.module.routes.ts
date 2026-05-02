/**
 * Evidence module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 * Owned by the evidence feature; edit here instead of the central component-registry.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const evidenceModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },
    create:   { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'evidence' } },
    home: { loadComponent: () => import('../../features/evidence/pages/evidence-home/evidence-home.component').then(m => m.EvidenceHomeComponent) },
    'work-queue': { loadComponent: () => import('../../features/evidence/pages/evidence-work-queue/evidence-work-queue.component').then(m => m.EvidenceWorkQueueComponent) },
    overview: { loadComponent: () => import('../../features/evidence/pages/evidence/evidence-overview.component').then(m => m.EvidenceOverviewComponent) },
    vault: { loadComponent: () => import('../../features/evidence/pages/evidence/evidence.component').then(m => m.EvidenceComponent) },
    catalog: { loadComponent: () => import('../../features/evidence/pages/evidence-catalog/evidence-catalog.component').then(m => m.EvidenceCatalogComponent) },
    'catalog/:id': { loadComponent: () => import('../../features/evidence/pages/evidence-detail/evidence-detail.component').then(m => m.EvidenceDetailComponent) },
    requests: { loadComponent: () => import('../../features/evidence/pages/evidence/evidence-requests.component').then(m => m.EvidenceRequestsComponent) },
    reviews: { loadComponent: () => import('../../features/evidence/pages/evidence/evidence-reviews.component').then(m => m.EvidenceReviewsComponent) },
    freshness: { loadComponent: () => import('../../features/evidence/pages/evidence/evidence-expiry.component').then(m => m.EvidenceExpiryComponent) },
    expiry: { loadComponent: () => import('../../features/evidence/pages/evidence/evidence-expiry.component').then(m => m.EvidenceExpiryComponent) },
    reuse: { loadComponent: () => import('../../features/evidence/pages/evidence-reuse/evidence-reuse.component').then(m => m.EvidenceReuseComponent) },
    packages: { loadComponent: () => import('../../features/evidence/pages/evidence-packages/evidence-packages.component').then(m => m.EvidencePackagesComponent) },
    mappings: { loadComponent: () => import('../../features/evidence/pages/evidence/evidence-mappings.component').then(m => m.EvidenceMappingsComponent) },
    connectors: { loadComponent: () => import('../../features/evidence/pages/evidence/evidence-automated-collection.component').then(m => m.EvidenceAutomatedCollectionComponent) },
    'automated-collection': { loadComponent: () => import('../../features/evidence/pages/evidence/evidence-automated-collection.component').then(m => m.EvidenceAutomatedCollectionComponent) },
    tasks: { loadComponent: () => import('../../features/evidence/pages/evidence-tasks/evidence-tasks.component').then(m => m.EvidenceTasksComponent) },
    reports: { loadComponent: () => import('../../features/evidence/pages/evidence-reports/evidence-reports.component').then(m => m.EvidenceReportsComponent) },
    ':id': { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'evidence' } },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'evidence' } },
    admin: { loadComponent: () => import('../../features/evidence/pages/evidence-admin/evidence-admin.component').then(m => m.EvidenceAdminComponent) },
  },
};

export const evidenceStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'evidence-schedules': { loadComponent: () => import('../../features/evidence/pages/evidence-schedules/evidence-schedules.component').then(m => m.EvidenceSchedulesComponent), requiredPermission: 'evidence.item.read', moduleCode: 'evidence' }
};

