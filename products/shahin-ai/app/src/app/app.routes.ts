import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { AccessStore } from '@dos/access-store';
import { foundationGuard } from './shell/foundation.guard';
import { provideRouteIcons } from './shell/icon-registration';
import { SHAHIN_DNA_MODULE_PACKS, buildDnaChildEntries } from './shell/dna-nav-contracts';
import { MARKETING_PUBLIC_ROUTES } from './pages/marketing-public/marketing-public.routes';
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
      import('./pages/marketing-landing/marketing-landing.component').then(m => m.MarketingLandingComponent),
    pathMatch: 'full',
    data: { contractRoute: '/', componentKey: 'marketing.home.page' },
  },
  ...MARKETING_PUBLIC_ROUTES,
  {
    // Phase M1.6.1 — OIDC bridge. SPA NEVER collects credentials.
    // The Carbon login/register card components remain in @dos/ui-system
    // for future tenant-managed flows but the public route renders the
    // bridge: brand + security note + single SSO CTA → Keycloak.
    path: 'login',
    loadComponent: () =>
      import('./pages/auth-pages/auth-bridge.component').then(m => m.AuthBridgeComponent),
    data: { authMode: 'login', contractRoute: '/login', componentKey: 'auth.login.bridge' },
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth-pages/auth-bridge.component').then(m => m.AuthBridgeComponent),
    data: { authMode: 'register', contractRoute: '/register', componentKey: 'auth.register.bridge' },
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/auth-pages/auth-page.host').then(m => m.AuthPageHostComponent),
    data: { authPage: 'forgot-password', contractRoute: '/forgot-password', componentKey: 'auth.forgot-password.page' },
  },
  {
    path: 'mfa',
    loadComponent: () =>
      import('./pages/auth-pages/auth-page.host').then(m => m.AuthPageHostComponent),
    data: { authPage: 'mfa', contractRoute: '/mfa', componentKey: 'auth.mfa.page' },
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/auth-pages/auth-page.host').then(m => m.AuthPageHostComponent),
    data: { authPage: 'reset-password', contractRoute: '/reset-password', componentKey: 'auth.reset-password.page' },
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
        // Template-only routing (rule §3.1): every Foundation child route is
        // resolved through DynamicTemplatePageComponent, which reads the
        // archetype + props from `dos.ui_route_template_binding`. No bespoke
        // Foundation*Component is reachable from any URL — they are
        // @deprecated and slated for physical deletion.
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'overview' },
          { path: 'home', pathMatch: 'full', redirectTo: 'overview' },
          { path: 'register', pathMatch: 'full', redirectTo: 'records' },
          { path: 'detail', pathMatch: 'full', redirectTo: 'records' },
          { path: 'module-settings', pathMatch: 'full', redirectTo: 'settings' },
          { path: 'module-audit', pathMatch: 'full', redirectTo: 'reports' },
          {
            path: '**',
            loadComponent: () =>
              import('@platform/shell').then(m => m.DynamicTemplatePageComponent),
          },
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
            path: 'compare',
            loadComponent: () => import('../../../../../platform/config-center/config-compare.component').then((m) => m.ConfigCompareComponent),
          },
          {
            path: 'workspace',
            loadComponent: () => import('../../../../../platform/config-center/config-workspace.component').then((m) => m.ConfigWorkspaceComponent),
          },
          {
            path: 'health',
            loadComponent: () => import('../../../../../platform/config-center/config-health.component').then((m) => m.ConfigHealthComponent),
          },
          // Phase F-F5 — these admin/config-center concrete routes are now
          // resolved by the DB-driven template binding host. Each route still
          // has its own row in dos.ui_route_template_binding so the legacy
          // shapes (audit / settings / flags / tokens) keep their archetype.
          {
            path: 'settings',
            loadComponent: () => import('@platform/shell').then((m) => m.DynamicTemplatePageComponent),
            data: { contractRoute: '/admin/config-center/settings' },
          },
          {
            path: 'audit',
            loadComponent: () => import('@platform/shell').then((m) => m.DynamicTemplatePageComponent),
            data: { contractRoute: '/admin/config-center/audit' },
          },
          {
            path: 'gateway',
            loadComponent: () => import('@platform/shell').then((m) => m.DynamicTemplatePageComponent),
            data: { contractRoute: '/admin/config-center/gateway' },
          },
          {
            path: 'flags',
            loadComponent: () => import('@platform/shell').then((m) => m.DynamicTemplatePageComponent),
            data: { contractRoute: '/admin/config-center/flags' },
          },
          {
            path: 'tokens',
            loadComponent: () => import('@platform/shell').then((m) => m.DynamicTemplatePageComponent),
            data: { contractRoute: '/admin/config-center/tokens' },
          },
        ],
      },
      // Phase F-F5 — DB-driven admin surface. Every /admin/* path that is not
      // claimed by the concrete admin/config-center block above falls through
      // to the dynamic template host, which resolves its archetype + props
      // from dos.ui_route_template_binding. Covers /admin/{access,ai,dauth,
      // dnoc,dos,dsoc,foundation,multi-tenant,runtime,tenants,ui-system}/*.
      {
        path: 'admin',
        data: { moduleCode: 'platform-admin', productCode: 'shahin-ai', kpiScope: 'page-local' },
        children: [
          {
            path: '**',
            loadComponent: () => import('@platform/shell').then((m) => m.DynamicTemplatePageComponent),
          },
        ],
      },
      // Phase F-F5 — top-level DB-bound settings surfaces.
      {
        path: 'settings',
        loadComponent: () => import('@platform/shell').then((m) => m.DynamicTemplatePageComponent),
        data: { contractRoute: '/settings' },
      },
      {
        path: 'tenant-settings',
        loadComponent: () => import('@platform/shell').then((m) => m.DynamicTemplatePageComponent),
        data: { contractRoute: '/tenant-settings' },
      },
      ...dnaModuleRoutes,
      // Phase F-F4 — DB-driven dynamic template host. Any path under
      // `/_dyn/*` resolves its archetype + props from the live
      // `dos.ui_route_template_binding` table via the
      // `/api/ui-os/template-binding` resolver, then lazy-imports the
      // matching `@platform/shell/templates` archetype. Opt-in only — no
      // existing route is disturbed.
      {
        path: '_dyn',
        loadComponent: () =>
          import('@platform/shell').then(m => m.DynamicTemplatePageComponent),
      },
      {
        path: '_dyn/:rest',
        loadComponent: () =>
          import('@platform/shell').then(m => m.DynamicTemplatePageComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
