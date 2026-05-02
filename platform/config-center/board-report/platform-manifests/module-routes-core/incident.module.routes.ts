import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const incidentModuleRouteGroup: ModuleRouteGroup = {
  children: {}
};

export const incidentStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'incident-hub': { loadComponent: () => import('../../features/incident/pages/incident-hub/incident-hub.component').then(m => m.IncidentHubComponent), requiredPermission: 'incident.record.read', moduleCode: 'incident' }
};

