import { Routes } from '@angular/router';

/**
 * Standalone route configuration for the Policy Module.
 * All routes use lazy-loaded standalone components.
 */
export const POLICY_ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('../pages/policy-home/policy-home.component').then((m) => m.PolicyHomeComponent),
      },
      {
        path: 'work-queue',
        loadComponent: () =>
          import('../pages/policy-work-queue/policy-work-queue.component').then((m) => m.PolicyWorkQueueComponent),
      },
      {
        path: 'library',
        loadComponent: () =>
          import('../pages/policies/policies.component').then((m) => m.PoliciesComponent),
      },
      {
        path: 'drafting',
        loadComponent: () =>
          import('../pages/policy-drafting/policy-drafting.component').then((m) => m.PolicyDraftingComponent),
      },
      {
        path: 'publications',
        loadComponent: () =>
          import('../pages/policy-publications/policy-publications.component').then(
            (m) => m.PolicyPublicationsComponent,
          ),
      },
      {
        path: 'exceptions',
        loadComponent: () =>
          import('../pages/policy-exceptions/policy-exceptions.component').then(
            (m) => m.PolicyExceptionsComponent,
          ),
      },
      {
        path: 'coverage',
        loadComponent: () =>
          import('../pages/policy-coverage/policy-coverage.component').then(
            (m) => m.PolicyCoverageComponent,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('../pages/policy-reports/policy-reports.component').then(
            (m) => m.PolicyReportsComponent,
          ),
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('../pages/policy-admin/policy-admin.component').then((m) => m.PolicyAdminComponent),
      },
      // Preserve existing routes
      {
        path: 'code',
        loadComponent: () =>
          import('../pages/policy-code/policy-code.component').then((m) => m.PolicyCodeComponent),
      },
      {
        path: 'versions',
        loadComponent: () =>
          import('../pages/policy-versions/policy-versions.component').then(
            (m) => m.PolicyVersionsComponent,
          ),
      },
      {
        path: 'procedures',
        loadComponent: () =>
          import('../pages/procedures/procedures.component').then((m) => m.ProceduresComponent),
      },
      {
        path: 'lifecycle',
        loadComponent: () =>
          import('../pages/policy-lifecycle.component').then((m) => m.PolicyLifecycleComponent),
      },
    ],
  },
];
