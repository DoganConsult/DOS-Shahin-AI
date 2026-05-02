/**
 * Team module route fragment.
 * Lazy-loaded routes for team management and workload distribution.
 */
import type { ModuleRouteGroup } from '../../core/routing/route-registry.types';

export const teamModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'hub',
  children: {
    '': { redirectTo: 'hub', pathMatch: 'full' },
    home:               { loadComponent: () => import('../../features/team/pages/team-hub/team-hub.component').then(m => m.TeamHubComponent) },
    hub:                { loadComponent: () => import('../../features/team/pages/team-hub/team-hub.component').then(m => m.TeamHubComponent) },
    'command-center':   { loadComponent: () => import('../../pages/team-command-center/team-command-center.component').then(m => m.TeamCommandCenterComponent) },
    management:         { loadComponent: () => import('../../pages/team-management/team-management.component').then(m => m.TeamManagementComponent) },
    members:            { loadComponent: () => import('../../pages/team-management/components/members-tab.component').then(m => m.MembersTabComponent) },
    invitations:        { loadComponent: () => import('../../pages/team-management/components/invitations-tab.component').then(m => m.InvitationsTabComponent) },
    raci:               { loadComponent: () => import('../../pages/team-management/components/raci-matrix-tab.component').then(m => m.RaciMatrixTabComponent) },
    staffing:           { loadComponent: () => import('../../features/team/pages/team-management/components/role-staffing-tab.component').then(m => m.RoleStaffingTabComponent) },
    workload:           { loadComponent: () => import('../../pages/team-management/components/workload-tab.component').then(m => m.WorkloadTabComponent) },
    lifecycle:          { loadComponent: () => import('../../pages/team-hub/member-lifecycle-panel.component').then(m => m.MemberLifecyclePanelComponent) },
    create:             { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'team' } },
    ':id':              { loadComponent: () => import('../../features/team/pages/team-detail/team-detail.component').then(m => m.TeamDetailComponent), data: { moduleCode: 'team' } },
    reports:            { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'team' } },
  },
};
export const teamStandaloneRoutes: Record<string, import('../../core/routing/route-registry.types').StandaloneRouteEntry> = {};
