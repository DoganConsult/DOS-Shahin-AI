/**
 * Integrations module route fragment.
 * Lazy-loaded routes for connector and webhook management.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const integrationsModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },
    home: { loadComponent: () => import('../../features/integrations/pages/connector-hub/connector-hub.component').then(m => m.ConnectorHubComponent) },
    webhooks: { loadComponent: () => import('../../features/integrations/pages/webhook-manager.component').then(m => m.WebhookManagerComponent) },
    connectors: { loadComponent: () => import('../../features/integrations/pages/connector-manager/connector-manager.component').then(m => m.ConnectorManagerComponent) },
    health: { loadComponent: () => import('../../features/integrations/pages/connector-health/connector-health.component').then(m => m.ConnectorHealthComponent) },
    marketplace: { loadComponent: () => import('../../features/integrations/pages/integration-marketplace/integration-marketplace.component').then(m => m.IntegrationMarketplaceComponent) },
    create:      { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'integrations' } },
    ':id':       { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'integrations' } },
    reports:     { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'integrations' } },
    lifecycle:   { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'integrations' } },
  },
};

export const integrationsStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'connector-hub': { loadComponent: () => import('../../features/integrations/pages/connector-hub/connector-hub.component').then(m => m.ConnectorHubComponent), requiredPermission: 'integrations.connector.read', moduleCode: 'integrations' },
  'integrations': { loadComponent: () => import('../../pages/integrations/integrations.component').then(m => m.IntegrationsComponent), requiredPermission: 'integrations.connector.read', moduleCode: 'integrations' },
  'connector-manager': { loadComponent: () => import('../../features/integrations/pages/connector-manager/connector-manager.component').then(m => m.ConnectorManagerComponent), requiredPermission: 'integrations.connector.read', moduleCode: 'integrations', adminOnly: true },
  'webhook-manager': { loadComponent: () => import('../../features/integrations/pages/webhook-manager.component').then(m => m.WebhookManagerComponent), requiredPermission: 'admin.system.write', moduleCode: 'integrations', adminOnly: true },
  'integration-marketplace': { loadComponent: () => import('../../features/integrations/pages/integration-marketplace/integration-marketplace.component').then(m => m.IntegrationMarketplaceComponent), requiredPermission: 'integrations:read', moduleCode: 'integrations' }
};

