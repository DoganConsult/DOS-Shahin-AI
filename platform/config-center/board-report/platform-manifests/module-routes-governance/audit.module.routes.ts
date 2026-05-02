/**
 * Audit module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 * Owned by the audit feature; edit here instead of the central component-registry.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const auditModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'overview',
  children: {
    '': { redirectTo: 'overview', pathMatch: 'full' },
    create:   { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'audit' } },
    overview: { loadComponent: () => import('../../features/audit/pages/audit-core/audit-overview.component').then(m => m.AuditOverviewComponent) },
    plan: { loadComponent: () => import('../../features/audit/pages/audit-planning/audit-plan.component').then(m => m.AuditPlanComponent) },
    engagements: { loadComponent: () => import('../../features/audit/pages/audit-planning/audit-engagements.component').then(m => m.AuditEngagementsComponent) },
    findings: { loadComponent: () => import('../../features/audit/pages/audit-findings-qa/audit-findings.component').then(m => m.AuditFindingsComponent) },
    capa: { loadComponent: () => import('../../features/audit/pages/audit-findings-qa/audit-capa.component').then(m => m.AuditCapaComponent) },
    validation: { loadComponent: () => import('../../features/audit/pages/audit-findings-qa/audit-validation.component').then(m => m.AuditValidationComponent) },
    reports: { loadComponent: () => import('../../features/audit/pages/audit-core/audit-reports.component').then(m => m.AuditReportsComponent) },
    universe: { loadComponent: () => import('../../features/audit/pages/audit-planning/audit-universe.component').then(m => m.AuditUniverseComponent) },
    'risk-planning': { loadComponent: () => import('../../features/audit/pages/audit-planning/audit-risk-planning.component').then(m => m.AuditRiskPlanningComponent) },
    schedules: { loadComponent: () => import('../../features/audit/pages/audit-planning/audit-schedules.component').then(m => m.AuditSchedulesComponent) },
    'working-papers': { loadComponent: () => import('../../features/audit/pages/audit-planning/audit-working-papers.component').then(m => m.AuditWorkingPapersComponent) },
    'workpaper-generator': { loadComponent: () => import('../../features/workpapers/components/workpaper-generator.component').then(m => m.WorkpaperGeneratorComponent) },
    team: { loadComponent: () => import('../../features/audit/pages/audit-core/audit-team.component').then(m => m.AuditTeamComponent) },
    'repeat-findings': { loadComponent: () => import('../../features/audit/pages/audit-findings-qa/audit-repeat-findings.component').then(m => m.AuditRepeatFindingsComponent) },
    'qa-reviews': { loadComponent: () => import('../../features/audit/pages/audit-findings-qa/audit-qa-reviews.component').then(m => m.AuditQaReviewsComponent) },
    'finding-trends': { loadComponent: () => import('../../features/audit/pages/audit-findings-qa/audit-finding-trends.component').then(m => m.AuditFindingTrendsComponent) },
    ratings: { loadComponent: () => import('../../features/audit/pages/audit-findings-qa/audit-ratings.component').then(m => m.AuditRatingsComponent) },
    'capa-effectiveness': { loadComponent: () => import('../../features/audit/pages/audit-findings-qa/audit-capa-effectiveness.component').then(m => m.AuditCapaEffectivenessComponent) },
    committee: { loadComponent: () => import('../../features/audit/pages/audit-core/audit-committee-dashboard.component').then(m => m.AuditCommitteeDashboardComponent) },
    external: { loadComponent: () => import('../../features/audit/pages/audit-core/audit-external.component').then(m => m.AuditExternalComponent) },
    regulatory: { loadComponent: () => import('../../features/audit/pages/audit-core/audit-regulatory.component').then(m => m.AuditRegulatoryComponent) },
    'test-plans': { loadComponent: () => import('../../features/audit/pages/audit-planning/audit-test-plans.component').then(m => m.AuditTestPlansComponent) },
    ':id':     { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'audit' } },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'audit' } },
  },
};

export const auditStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'audit-trail': { loadComponent: () => import('../../features/audit/pages/audit-trail/audit-trail.component').then(m => m.AuditTrailComponent), requiredPermission: 'audit.record.read', moduleCode: 'audit' },
  'login-history': { loadComponent: () => import('../../features/audit/pages/login-history/login-history.component').then(m => m.LoginHistoryComponent), requiredPermission: 'audit.record.read', moduleCode: 'audit' },
  'audit-package': { loadComponent: () => import('../../features/audit/pages/audit-package/audit-package.component').then(m => m.AuditPackageComponent), requiredPermission: 'audit.record.read', moduleCode: 'audit' },
  'akb': { loadComponent: () => import('../../pages/akb/akb.component').then(m => m.AkbComponent), requiredPermission: 'audit.record.read', moduleCode: 'audit' },
  'audit-workpapers': { loadComponent: () => import('../../features/audit/pages/audit-workpapers/audit-workpapers.component').then(m => m.AuditWorkpapersComponent), requiredPermission: 'audit.record.read', moduleCode: 'audit' }
};

