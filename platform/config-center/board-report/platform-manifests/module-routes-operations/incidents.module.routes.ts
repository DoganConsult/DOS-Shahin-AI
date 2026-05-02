/**
 * Incidents module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 */
import type { ModuleRouteGroup } from '../../core/routing/route-registry.types';

export const incidentsModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'overview',
  children: {
    '': { redirectTo: 'overview', pathMatch: 'full' },
    overview: { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentOverviewComponent) },
    register: { loadComponent: () => import('../../features/incident/pages/incidents.component').then(m => m.IncidentsComponent) },
    'near-miss': { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentNearMissComponent) },
    pir: { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentPirComponent) },
    trends: { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentTrendsComponent) },
    regulatory: { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentRegulatoryComponent) },
    taxonomy: { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentTaxonomyComponent) },
    'lessons-learned': { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentLessonsComponent) },
    investigation: { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentInvestigationComponent) },
    'war-room': { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentWarRoomComponent) },
    triage: { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentTriageComponent) },
    cases: { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentCasesComponent) },
    breach: { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentBreachComponent) },
    impact: { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentImpactComponent) },
    evidence: { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentEvidenceComponent) },
    capa: { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentCapaComponent) },
    create:    { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'incident' } },
    ':id':     { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'incident' } },
    reports: { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentReportsComponent) },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'incident' } },
    admin: { loadComponent: () => import('../../features/incident/pages/incident-sub-pages').then(m => m.IncidentAdminComponent), requiredPermission: 'incident.record.manage', adminOnly: true },
  },
};
