import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { AccessStore } from '@dos/access-store';
import { foundationGuard } from './shell/foundation.guard';
import { provideRouteIcons } from './shell/icon-registration';
import { SHAHIN_DNA_MODULE_PACKS, buildDnaChildEntries } from './shell/dna-nav-contracts';
// ── Compliance routes ────────────────────────────────────────────────────────
// Source: modules/compliance/ui/routes/compliance.module.routes.ts
// Only READY_TO_MOUNT routes (verified build-clean) are wired.
//
// BUILD_BLOCKED (Carbon DropdownModule deprecated API / self-closing <button/> / cds-modal):
//   overview, frameworks, gaps, work-queue, exceptions, admin,
//   findings, calendar, roadmap, regulatory-changes, templates,
//   posture (imports DomainDetailDrawerComponent which uses cds-modal)
//
// Overview uses the app-local stub (compliance-overview.component.ts) which is
// build-clean and calls GET /api/compliance-ws/overview.
const complianceRouteChildren: Record<string, any> = {
  overview: {
    loadComponent: () =>
      import('./modules/compliance/ui/compliance-overview.component').then(m => m.ComplianceOverviewPageComponent),
    data: { moduleCode: 'compliance', componentKey: 'compliance.overview.page', kpiScope: 'module-overview' },
  },
  assessments:                   { loadComponent: () => import('@compliance-module/ui/features/compliance/pages/assessments-group/compliance-assessments-findings/compliance-assessments-page.component').then(m => m.ComplianceAssessmentsPageComponent) },
  attestations:                  { loadComponent: () => import('@compliance-module/ui/features/compliance/pages/assessments-group/compliance-assessments-findings/compliance-attestations-page.component').then(m => m.ComplianceAttestationsPageComponent) },
  obligations:                   { loadComponent: () => import('@compliance-module/ui/features/compliance/pages/regulatory-group/compliance-regulatory/compliance-obligations-page.component').then(m => m.ComplianceObligationsPageComponent) },
  'obligation-workspace':        { loadComponent: () => import('@compliance-module/ui/features/compliance/pages/regulatory-group/compliance-regulatory/obligation-workspace.component').then(m => m.ObligationWorkspaceComponent) },
  'obligations/:id':             { loadComponent: () => import('@compliance-module/ui/features/compliance/pages/regulatory-group/compliance-regulatory/obligation-detail-page.component').then(m => m.ObligationDetailPageComponent) },
  heatmap:                       { loadComponent: () => import('@compliance-module/ui/features/compliance/pages/assessments-group/compliance-assessments-findings/compliance-heatmap-page.component').then(m => m.ComplianceHeatMapPageComponent) },
  'assertion-dashboard':         { loadComponent: () => import('@compliance-module/ui/features/compliance/pages/assessments-group/compliance-assessments-findings/assertion-dashboard.component').then(m => m.AssertionDashboardComponent) },
  'rcsa-campaigns':              { loadComponent: () => import('@compliance-module/ui/features/compliance/pages/assessments-group/compliance-assessments-findings/rcsa-campaigns.component').then(m => m.RcsaCampaignsComponent) },
  'regulatory-reasoning-studio': { loadComponent: () => import('@compliance-module/ui/features/compliance/pages/regulatory-group/compliance-regulatory/regulatory-reasoning-studio.component').then(m => m.RegulatoryReasoningStudioComponent) },
  'evidence-ops':                { loadComponent: () => import('@compliance-module/ui/features/compliance/pages/controls-group/compliance-controls-monitoring/compliance-evidence-ops-page.component').then(m => m.ComplianceEvidenceOpsPageComponent) },
  reports:                       { loadComponent: () => import('@compliance-module/ui/features/compliance/pages/compliance-core-pages/compliance-core/compliance-reports-page.component').then(m => m.ComplianceReportsPageComponent) },
  controls:                      { redirectTo: '/controls/library', pathMatch: 'full' },
  'controls-monitoring':         { redirectTo: '/controls/monitoring', pathMatch: 'full' },
};

const configCenterGuard = () => {
  const access = inject(AccessStore);
  if (access.hasPermission('platform.config_center.read')) {
    return true;
  }
  return inject(Router).createUrlTree(['/workspace-home'], {
    queryParams: { denied: 'platform-config-center-read' },
  });
};

function buildChildRoutes(children: Record<string, any>): Routes {
  const out: Routes = [];
  for (const [path, entry] of Object.entries(children)) {
    if (entry?.redirectTo) {
      out.push({ path, redirectTo: entry.redirectTo, pathMatch: entry.pathMatch ?? 'full' });
    } else if (entry?.loadComponent) {
      const r: any = { path, loadComponent: entry.loadComponent };
      if (entry.data) r.data = entry.data;
      out.push(r);
    } else if (entry?.loadChildren) {
      out.push({ path, loadChildren: entry.loadChildren });
    }
  }
  return out;
}

const shellDefaults = {
  moduleCode: 'foundation',
  productCode: 'shahin-ai',
  kpiScope: 'module-overview' as const,
};

const dnaModuleRoutes: Routes = SHAHIN_DNA_MODULE_PACKS
  .filter((pack) => pack.moduleCode !== 'foundation')
  .map((pack) => ({
    path: pack.moduleCode,
    data: { moduleCode: pack.moduleCode, productCode: 'shahin-ai', kpiScope: 'module-overview' },
    children: buildChildRoutes(buildDnaChildEntries(pack)),
  }));

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then(m => m.LandingComponent),
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth-redirect/auth-redirect.component').then(m => m.AuthRedirectComponent),
    data: { mode: 'login' },
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth-redirect/auth-redirect.component').then(m => m.AuthRedirectComponent),
    data: { mode: 'register' },
  },
  {
    path: '',
    loadComponent: () =>
      import('@app/core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
    providers: [provideRouteIcons()],
    data: { ...shellDefaults },
    children: [
      {
        path: 'workspace-home',
        loadComponent: () =>
          import('@dos/module-foundation/ui/workspace/workspace-home.component').then(m => m.WorkspaceHomeComponent),
        providers: [provideRouteIcons()],
        data: {
          contractRoute: '/workspace-home',
          moduleCode: 'foundation',
          productCode: 'shahin-ai',
          kpiScope: 'module-overview',
        },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then(m => m.ProfileComponent),
        data: { contractRoute: '/profile', productCode: 'shahin-ai' },
      },
      {
        path: 'tenant-profile',
        loadComponent: () =>
          import('./pages/tenant-profile/tenant-profile.component').then(m => m.TenantProfileComponent),
        data: { contractRoute: '/tenant-profile', productCode: 'shahin-ai' },
      },
      {
        path: 'foundation',
        data: { moduleCode: 'foundation', productCode: 'shahin-ai', kpiScope: 'module-overview' },
        canActivate: [foundationGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'overview' },
          { path: 'home', pathMatch: 'full', redirectTo: 'overview' },
          { path: 'register', pathMatch: 'full', redirectTo: 'records' },
          { path: 'detail', pathMatch: 'full', redirectTo: 'records' },
          { path: 'module-settings', pathMatch: 'full', redirectTo: 'settings' },
          { path: 'module-audit', pathMatch: 'full', redirectTo: 'reports' },
          { path: 'overview',          loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationOverviewPageComponent), data: { moduleCode: 'foundation', kpiScope: 'module-overview', componentKey: 'foundation.overview.page' } },
          { path: 'records',           loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationRecordsPageComponent), data: { moduleCode: 'foundation', componentKey: 'foundation.records.page' } },
          { path: 'workflows',         loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationWorkflowsPageComponent), data: { moduleCode: 'foundation', componentKey: 'foundation.workflows.page' } },
          { path: 'reports',           loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationReportsPageComponent), data: { moduleCode: 'foundation', componentKey: 'foundation.reports.page' } },
          { path: 'settings',          loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationSettingsPageComponent), data: { moduleCode: 'foundation', componentKey: 'foundation.settings.page' } },
          // Legacy routes (existing pages)
          { path: 'organization',      loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationOrganizationComponent) },
          { path: 'business-units',    loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationBusinessUnitsComponent) },
          { path: 'departments',       loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationDepartmentsComponent) },
          { path: 'positions',         loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationPositionsComponent) },
          { path: 'locations',         loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationLocationsComponent) },
          { path: 'users',             loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationUsersComponent) },
          { path: 'teams',             loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationTeamsComponent) },
          { path: 'roles',             loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationRolesComponent) },
          { path: 'roles/:id',         loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationRoleDetailComponent) },
          { path: 'committees',        loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationCommitteesComponent) },
          { path: 'delegations',       loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationDelegationsComponent) },
          { path: 'ownership-mapping', loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationOwnershipMappingComponent) },
          { path: 'access-review',     loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationAccessReviewComponent) },
          { path: 'policies',          loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationPoliciesComponent) },
          { path: 'data-processing',   loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationDataProcessingComponent) },
          { path: 'reference-data',    loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationReferenceDataComponent) },
          { path: 'audit',             loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationAuditComponent) },
        ],
      },
      {
        path: 'compliance',
        data: { moduleCode: 'compliance', productCode: 'shahin-ai', kpiScope: 'module-overview' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'overview' },
          ...buildChildRoutes(complianceRouteChildren),
        ],
      },
      {
        path: 'risk',
        data: { moduleCode: 'risk', productCode: 'shahin-ai', kpiScope: 'module-overview' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'overview' },
          {
            path: 'overview',
            loadComponent: () => import('@risk-module/ui/features/risk/pages/risk-overview.component').then(m => m.RiskOverviewComponent),
            data: { moduleCode: 'risk', componentKey: 'module.overview.page', permission: 'risk.record.read', kpiScope: 'module-overview' },
          },
          {
            path: 'register',
            loadComponent: () => import('@risk-module/ui/features/risk/pages/risk-register.component').then(m => m.RiskRegisterPageComponent),
            data: { moduleCode: 'risk', componentKey: 'RiskRegisterPage', permission: 'risk.record.read' },
          },
          {
            path: 'assessments',
            loadComponent: () => import('@risk-module/ui/features/risk/pages/risk-assessments.component').then(m => m.RiskAssessmentsPageComponent),
            data: { moduleCode: 'risk', componentKey: 'RiskAssessmentsPage', permission: 'risk.record.read' },
          },
          {
            path: 'heatmap',
            loadComponent: () => import('@risk-module/ui/features/risk/pages/risk-heatmap.component').then(m => m.RiskHeatmapPageComponent),
            data: { moduleCode: 'risk', componentKey: 'RiskHeatmapPage', permission: 'risk.record.read' },
          },
          {
            path: 'treatments',
            loadComponent: () => import('@risk-module/ui/features/risk/pages/risk-treatments.component').then(m => m.RiskTreatmentsPageComponent),
            data: { moduleCode: 'risk', componentKey: 'RiskTreatmentsPage', permission: 'risk.record.read' },
          },
          {
            path: 'reports',
            loadComponent: () => import('@risk-module/ui/features/risk/pages/risk-reports.component').then(m => m.RiskReportsPageComponent),
            data: { moduleCode: 'risk', componentKey: 'module.reports.page', permission: 'risk.record.read' },
          },
          {
            path: 'settings',
            loadComponent: () => import('@risk-module/ui/features/risk/pages/risk-settings.component').then(m => m.RiskSettingsPageComponent),
            data: { moduleCode: 'risk', componentKey: 'module.settings.page', permission: 'risk.manage' },
          },
        ],
      },
      {
        path: 'admin/config-center',
        canActivate: [configCenterGuard],
        canActivateChild: [configCenterGuard],
        data: { moduleCode: 'config-center', productCode: 'shahin-ai', kpiScope: 'page-local' },
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'resolve' },
          {
            path: 'resolve',
            loadComponent: () => import('../../../../../platform/config-center/config-resolution.component').then((m) => m.ConfigResolutionComponent),
          },
          {
            path: 'settings',
            loadComponent: () => import('../../../../../platform/config-center/config-settings.component').then((m) => m.ConfigSettingsComponent),
          },
          {
            path: 'audit',
            loadComponent: () => import('../../../../../platform/config-center/config-audit.component').then((m) => m.ConfigAuditComponent),
          },
          {
            path: 'health',
            loadComponent: () => import('../../../../../platform/config-center/config-health.component').then((m) => m.ConfigHealthComponent),
          },
          {
            path: 'compare',
            loadComponent: () => import('../../../../../platform/config-center/config-compare.component').then((m) => m.ConfigCompareComponent),
          },
          {
            path: 'gateway',
            loadComponent: () => import('../../../../../platform/config-center/config-gateway.component').then((m) => m.ConfigGatewayComponent),
          },
          {
            path: 'workspace',
            loadComponent: () => import('../../../../../platform/config-center/config-workspace.component').then((m) => m.ConfigWorkspaceComponent),
          },
          {
            path: 'flags',
            redirectTo: 'gateway',
            pathMatch: 'full',
          },
          {
            path: 'tokens',
            redirectTo: 'workspace',
            pathMatch: 'full',
          },
        ],
      },
      ...dnaModuleRoutes,
    ],
  },
  { path: '**', redirectTo: '' },
];
