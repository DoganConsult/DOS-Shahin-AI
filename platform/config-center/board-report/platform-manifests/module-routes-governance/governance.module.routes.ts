/**
 * Governance module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const governanceModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'overview',
  children: {
    '': { redirectTo: 'overview', pathMatch: 'full' },
    overview: { loadComponent: () => import('../../features/governance/pages/governance-operations/governance-overview.component').then(m => m.GovernanceOverviewComponent) },
    structure: { loadComponent: () => import('../../features/governance/pages/governance-oversight/governance-structure.component').then(m => m.GovernanceStructureComponent) },
    committees: { loadComponent: () => import('../../features/governance/pages/board-decisions/governance-committees.component').then(m => m.GovernanceCommitteesComponent) },
    charters: { loadComponent: () => import('../../features/governance/pages/governance-planning/governance-charters.component').then(m => m.GovernanceChartersComponent) },
    mandates: { loadComponent: () => import('../../features/governance/pages/governance-planning/governance-mandates.component').then(m => m.GovernanceMandatesComponent) },
    delegations: { loadComponent: () => import('../../features/governance/pages/board-decisions/governance-delegations.component').then(m => m.GovernanceDelegationsComponent) },
    responsibilities: { loadComponent: () => import('../../features/governance/pages/governance-oversight/governance-responsibilities.component').then(m => m.GovernanceResponsibilitiesComponent) },
    decisions: { loadComponent: () => import('../../features/governance/pages/board-decisions/governance-decisions.component').then(m => m.GovernanceDecisionsComponent) },
    'board-decisions': { loadComponent: () => import('../../features/governance/pages/board-decisions/board-decisions.component').then(m => m.BoardDecisionsComponent) },
    'board-packs': { loadComponent: () => import('../../features/governance/pages/board-decisions/governance-board-packs.component').then(m => m.GovernanceBoardPacksComponent) },
    reviews: { loadComponent: () => import('../../features/governance/pages/governance-oversight/governance-reviews.component').then(m => m.GovernanceReviewsComponent) },
    'policy-reviews': { loadComponent: () => import('../../features/governance/pages/governance-oversight/governance-policy-reviews.component').then(m => m.GovernancePolicyReviewsComponent) },
    objectives: { loadComponent: () => import('../../features/governance/pages/governance-planning/governance-objectives.component').then(m => m.GovernanceObjectivesComponent) },
    initiatives: { loadComponent: () => import('../../features/governance/pages/governance-planning/governance-initiatives.component').then(m => m.GovernanceInitiativesComponent) },
    milestones: { loadComponent: () => import('../../features/governance/pages/governance-planning/governance-milestones.component').then(m => m.GovernanceMilestonesComponent) },
    actions: { loadComponent: () => import('../../features/governance/pages/governance-operations/governance-actions.component').then(m => m.GovernanceActionsComponent) },
    raci: { loadComponent: () => import('../../features/governance/pages/governance-oversight/governance-raci.component').then(m => m.GovernanceRaciComponent) },
    'raci-templates': { loadComponent: () => import('../../features/governance/pages/governance-oversight/governance-raci-templates.component').then(m => m.GovernanceRaciTemplatesComponent) },
    'sod-conflicts': { loadComponent: () => import('../../features/governance/pages/governance-operations/sod-conflicts-page.component').then(m => m.SodConflictsPageComponent) },
    health: { loadComponent: () => import('../../features/governance/pages/governance-operations/governance-health.component').then(m => m.GovernanceHealthComponent) },
    digests: { loadComponent: () => import('../../features/governance/pages/governance-operations/governance-digests.component').then(m => m.GovernanceDigestsComponent) },
    'executive-summaries': { loadComponent: () => import('../../features/governance/pages/governance-operations/governance-executive-summaries.component').then(m => m.GovernanceExecutiveSummariesComponent) },
    acknowledgements: { loadComponent: () => import('../../features/governance/pages/governance-oversight/governance-acknowledgements.component').then(m => m.GovernanceAcknowledgementsComponent) },
    create:    { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'governance' } },
    reports:   { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'governance' } },
    ':id':     { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'governance' } },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'governance' } },
    // Cross-module redirects
    obligations: { redirectTo: '/compliance/obligations', pathMatch: 'full' },
    exceptions: { redirectTo: '/compliance/exceptions', pathMatch: 'full' },
  },
};

export const governanceStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'operations-hub': { loadComponent: () => import('@workflow-module/ui').then(m => m.OperationsHubComponent), requiredPermission: 'timeline.event.read', moduleCode: 'governance' },
  'timeline': { loadComponent: () => import('@workflow-module/ui').then(m => m.TimelineComponent), requiredPermission: 'timeline.event.read', moduleCode: 'governance' }
};
