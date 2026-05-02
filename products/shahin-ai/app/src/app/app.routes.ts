import { Routes } from '@angular/router';
import { foundationGuard } from './shell/foundation.guard';
// Out-of-scope for shell-only build: compliance routes not loaded here.
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
    data: { ...shellDefaults },
    children: [
      {
        path: 'workspace-home',
        loadComponent: () =>
          import('@dos/module-foundation/ui/workspace/workspace-home.component').then(m => m.WorkspaceHomeComponent),
        data: {
          contractRoute: '/workspace-home',
          moduleCode: 'foundation',
          productCode: 'shahin-ai',
          kpiScope: 'module-overview',
        },
      },
      {
        path: 'foundation',
        data: { moduleCode: 'foundation', productCode: 'shahin-ai', kpiScope: 'module-overview' },
        canActivate: [foundationGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'overview' },
          { path: 'overview',          loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationOverviewComponent) },
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
          { path: 'settings',          loadComponent: () => import('@dos/module-foundation/ui').then(m => m.FoundationSettingsComponent) },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
