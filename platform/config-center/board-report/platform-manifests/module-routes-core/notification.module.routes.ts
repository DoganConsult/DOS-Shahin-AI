/**
 * Notification module route fragment.
 * Lazy-loaded routes for notification center.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const notificationModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },
    create:       { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'notification' } },
    home:         { loadComponent: () => import('../../features/notification/pages/notification-center.component').then(m => m.NotificationCenterComponent) },
    preferences:  { loadComponent: () => import('../../features/notification/pages/notification-preferences.component').then(m => m.NotificationPreferencesComponent) },
    templates:    { loadComponent: () => import('../../features/notification/pages/notification-templates.component').then(m => m.NotificationTemplatesComponent) },
    ':id':        { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'notification' } },
    reports:      { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'notification' } },
    lifecycle:    { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'notification' } },
  },
};

export const notificationStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'messaging': { loadComponent: () => import('../../pages/messaging/messaging.component').then(m => m.MessagingComponent), requiredPermission: 'messaging.channel.read', moduleCode: 'notification' }
};

