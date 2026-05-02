/**
 * Foundation module route fragment — fully dynamic-UI compliant per spec §7.
 *
 * Every list/object route below dispatches via DynamicPageHostComponent. The
 * host resolves the page's widget(s) from `dos.dynamic_ui_widgets` (via
 * DynamicWidgetResolver) and instantiates the resolved component(s) into the
 * matching zone. The route file no longer hard-codes which component renders
 * a given URL — that mapping lives in the DB seed and the widget-key-map.
 *
 * To swap a Foundation page's contents per tenant, insert a tenant-scoped
 * row into dos.dynamic_ui_widgets pointing at the desired widget_key. No code
 * change required.
 *
 * The overview route remains a direct loadComponent because it owns the
 * dashboard layout (KPI strip + signature widget + agent panel + context
 * rail) — its host responsibilities exceed a single-widget render.
 *
 * `data.contractRoute` tells the host which route's widgets to resolve.
 */
import type { ModuleRouteGroup } from '../../core/routing/route-registry.types';

const dynamicHost = () =>
  import('../../blueprint/shared/dynamic-ui/components/dynamic-page-host.component').then(m => m.DynamicPageHostComponent);

export const foundationModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'overview',
  children: {
    '': { redirectTo: 'overview', pathMatch: 'full' },
    create:   { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'foundation', kpiScope: 'none', pageType: 'object' } },
    reports:  { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'foundation', kpiScope: 'none', pageType: 'analytics' } },
    overview: { loadComponent: () => import('@foundation-module/ui').then(m => m.FoundationOverviewComponent), data: { kpiScope: 'module-overview', pageType: 'overview', layout: 'dashboard', contractRoute: '/foundation/overview' } },
    organization:        { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'object',   layout: 'split-view', contractRoute: '/foundation/organization' } },
    departments:         { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'list',     layout: 'full-page',  contractRoute: '/foundation/departments' } },
    'business-units':    { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'list',     layout: 'full-page',  contractRoute: '/foundation/business-units' } },
    teams:               { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'list',     layout: 'full-page',  contractRoute: '/foundation/teams' } },
    roles:               { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'list',     layout: 'full-page',  contractRoute: '/foundation/roles' } },
    'roles/:id':         { loadComponent: () => import('@foundation-module/ui').then(m => m.FoundationRoleDetailComponent), data: { kpiScope: 'none', pageType: 'object', layout: 'object-page' } },
    positions:           { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'list',     layout: 'full-page',  contractRoute: '/foundation/positions' } },
    users:               { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'list',     layout: 'full-page',  contractRoute: '/foundation/users' } },
    committees:          { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'list',     layout: 'full-page',  contractRoute: '/foundation/committees' } },
    delegations:         { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'list',     layout: 'full-page',  contractRoute: '/foundation/delegations' } },
    locations:           { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'list',     layout: 'full-page',  contractRoute: '/foundation/locations' } },
    policies:            { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'list',     layout: 'full-page',  contractRoute: '/foundation/policies' } },
    'reference-data':    { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'list',     layout: 'full-page',  contractRoute: '/foundation/reference-data' } },
    'data-processing':   { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'list',     layout: 'full-page',  contractRoute: '/foundation/data-processing' } },
    'ownership-mapping': { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'list',     layout: 'full-page',  contractRoute: '/foundation/ownership-mapping' } },
    'access-review':     { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'workflow', layout: 'full-page',  contractRoute: '/foundation/access-review' } },
    audit:               { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'audit',    layout: 'full-page',  contractRoute: '/foundation/audit' } },
    'operations-readiness': { loadComponent: dynamicHost, data: { kpiScope: 'none', pageType: 'analytics', layout: 'full-page', contractRoute: '/foundation/operations-readiness' } },
    // G1 — Employee Lifecycle (Govern jobs)
    'people/onboarding':    { loadComponent: dynamicHost, data: { kpiScope: 'page-local', pageType: 'workflow', layout: 'full-page',  contractRoute: '/foundation/people/onboarding' } },
    'people/lifecycle':     { loadComponent: dynamicHost, data: { kpiScope: 'page-local', pageType: 'object',   layout: 'object-page',contractRoute: '/foundation/people/lifecycle' } },
    'people/probation-due': { loadComponent: dynamicHost, data: { kpiScope: 'page-local', pageType: 'workflow', layout: 'full-page',  contractRoute: '/foundation/people/probation-due' } },
    // G2 — Authority + SoD (Govern jobs)
    'governance/authority-matrix': { loadComponent: dynamicHost, data: { kpiScope: 'page-local', pageType: 'analytics', layout: 'full-page', contractRoute: '/foundation/governance/authority-matrix' } },
    'governance/sod-rules':        { loadComponent: dynamicHost, data: { kpiScope: 'page-local', pageType: 'list',      layout: 'full-page', contractRoute: '/foundation/governance/sod-rules' } },
    'governance/sod-violations':   { loadComponent: dynamicHost, data: { kpiScope: 'page-local', pageType: 'workflow',  layout: 'full-page', contractRoute: '/foundation/governance/sod-violations' } },
    // G7 — Compliance Fabric
    'governance/policy-acks':      { loadComponent: dynamicHost, data: { kpiScope: 'page-local', pageType: 'workflow',  layout: 'full-page', contractRoute: '/foundation/governance/policy-acks' } },
    'governance/training':         { loadComponent: dynamicHost, data: { kpiScope: 'page-local', pageType: 'workflow',  layout: 'full-page', contractRoute: '/foundation/governance/training' } },
    'governance/coi':              { loadComponent: dynamicHost, data: { kpiScope: 'page-local', pageType: 'workflow',  layout: 'full-page', contractRoute: '/foundation/governance/coi' } },
    settings:            { loadComponent: dynamicHost, adminOnly: true, data: { requiredPermission: 'admin.system.write', adminOnly: true, kpiScope: 'none', pageType: 'settings',  layout: 'full-page', contractRoute: '/foundation/settings' } },
    permissions:         { loadComponent: dynamicHost, adminOnly: true, data: { requiredPermission: 'admin.system.write', adminOnly: true, kpiScope: 'none', pageType: 'analytics', layout: 'full-page', contractRoute: '/foundation/permissions' } },
    ':id': { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'foundation', kpiScope: 'none', pageType: 'object', layout: 'object-page' } },
    lifecycle: { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'foundation', kpiScope: 'none', pageType: 'workflow', layout: 'full-page' } },
  },
};
