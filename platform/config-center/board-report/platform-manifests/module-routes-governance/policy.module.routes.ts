/**
 * Policy module route fragment — merged into MODULE_ROUTE_GROUPS via generated barrel.
 * Owned by the policy feature; edit here instead of the central component-registry.
 *
 * Structure follows the canonical Policy Module spec:
 *   home → work-queue → library → drafting → publications →
 *   exceptions → coverage → reports → admin → code → versions →
 *   procedures → lifecycle
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const policyModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },

    create:         { loadComponent: () => import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent), data: { moduleCode: 'policy' } },
    // ── Spec Primary Routes ─────────────────────────────────────────
    home:           { loadComponent: () => import('../../features/policy/pages/policy-home/policy-home.component').then(m => m.PolicyHomeComponent) },
    'work-queue':   { loadComponent: () => import('../../features/policy/pages/policy-work-queue/policy-work-queue.component').then(m => m.PolicyWorkQueueComponent) },
    library:        { loadComponent: () => import('../../features/policy/pages/policies/policies.component').then(m => m.PoliciesComponent) },
    drafting:       { loadComponent: () => import('../../features/policy/pages/policy-drafting/policy-drafting.component').then(m => m.PolicyDraftingComponent) },
    publications:   { loadComponent: () => import('../../features/policy/pages/policy-publications/policy-publications.component').then(m => m.PolicyPublicationsComponent) },
    exceptions:     { loadComponent: () => import('../../features/policy/pages/policy-exceptions/policy-exceptions.component').then(m => m.PolicyExceptionsComponent) },
    coverage:       { loadComponent: () => import('../../features/policy/pages/policy-coverage/policy-coverage.component').then(m => m.PolicyCoverageComponent) },
    reports:        { loadComponent: () => import('../../features/policy/pages/policy-reports/policy-reports.component').then(m => m.PolicyReportsComponent) },
    admin:          { loadComponent: () => import('../../features/policy/pages/policy-admin/policy-admin.component').then(m => m.PolicyAdminComponent), requiredPermission: 'policy.document.manage', adminOnly: true },

    // ── Existing routes (preserved for backward compatibility) ─────
    code:           { loadComponent: () => import('../../features/policy/pages/policy-code/policy-code.component').then(m => m.PolicyCodeComponent) },
    versions:       { loadComponent: () => import('../../features/policy/pages/policy-versions/policy-versions.component').then(m => m.PolicyVersionsComponent) },
    procedures:     { loadComponent: () => import('../../features/policy/pages/procedures/procedures.component').then(m => m.ProceduresComponent) },
    lifecycle:      { loadComponent: () => import('../../features/policy/pages/policy-lifecycle.component').then(m => m.PolicyLifecycleComponent) },
    ':id':          { loadComponent: () => import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent), data: { moduleCode: 'policy' } },
    'reports-analytics': { loadComponent: () => import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent), data: { moduleCode: 'policy' } },
  },
};

export const policyStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'ethics-integrity': { loadComponent: () => import('@app/features/compliance/pages/ethics-integrity/ethics-integrity.component').then(m => m.EthicsIntegrityComponent), requiredPermission: 'policy.document.read', moduleCode: 'policy' },
  'policy-code': { loadComponent: () => import('../../features/policy/pages/policy-code/policy-code.component').then(m => m.PolicyCodeComponent), requiredPermission: 'policy.document.read', moduleCode: 'policy' },
  'signatures': { loadComponent: () => import('../../features/policy/pages/signatures/signatures.component').then(m => m.SignaturesComponent), requiredPermission: 'policy.document.read', moduleCode: 'policy' },
  'policy-versions': { loadComponent: () => import('../../features/policy/pages/policy-versions/policy-versions.component').then(m => m.PolicyVersionsComponent), requiredPermission: 'policy.document.read', moduleCode: 'policy' },
  'procedures': { loadComponent: () => import('../../features/policy/pages/procedures/procedures.component').then(m => m.ProceduresComponent), requiredPermission: 'policy.document.read', moduleCode: 'policy' },
  'w/:workspaceId/policies': { loadComponent: () => import('../../features/dashboard/entities/policies/policies.page').then(m => m.PoliciesPageComponent), requiredPermission: 'policy.document.read', moduleCode: 'policy' }
};
