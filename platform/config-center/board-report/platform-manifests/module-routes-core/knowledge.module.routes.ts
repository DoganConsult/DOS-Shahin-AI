import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const knowledgeModuleRouteGroup: ModuleRouteGroup = {
  children: {}
};

export const knowledgeStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'knowledge-hub': { loadComponent: () => import('../../features/knowledge/pages/knowledge-hub/knowledge-hub.component').then(m => m.KnowledgeHubComponent), requiredPermission: 'knowledge.base.read', moduleCode: 'knowledge' },
  'knowledge-base': { loadComponent: () => import('../../features/knowledge/pages/knowledge-base/knowledge-base.component').then(m => m.KnowledgeBaseComponent), requiredPermission: 'knowledge:read', moduleCode: 'knowledge' }
};

