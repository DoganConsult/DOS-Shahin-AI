import { Routes } from '@angular/router';
import { platformAdminGuard } from './platform-admin.guard';

export const PLATFORM_ADMIN_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./platform-admin-login.component').then(m => m.PlatformAdminLoginComponent),
    data: { contractRoute: '/platform-admin/login', componentKey: 'platform-admin.login' },
  },
  {
    path: '',
    loadComponent: () =>
      import('./platform-admin-shell-host.component').then(m => m.PlatformAdminShellHostComponent),
    canActivate: [platformAdminGuard],
    children: [
      { path: '', redirectTo: 'dos-master', pathMatch: 'full' },
      {
        path: 'dos-master',
        loadComponent: () =>
          import('./panels/overview.panel.component').then(m => m.PlatformAdminOverviewComponent),
      },
      {
        path: 'dos-master/milestones',
        loadComponent: () =>
          import('./panels/milestones.panel.component').then(m => m.PlatformAdminMilestonesComponent),
      },
      {
        path: 'dos-master/services',
        loadComponent: () =>
          import('./panels/services.panel.component').then(m => m.PlatformAdminServicesComponent),
      },
      {
        path: 'dos-master/doctrine',
        loadComponent: () =>
          import('./panels/doctrine.panel.component').then(m => m.PlatformAdminDoctrineComponent),
      },
      {
        path: 'dos-master/controlled-ddl',
        loadComponent: () =>
          import('./panels/controlled-ddl.panel.component').then(m => m.PlatformAdminControlledDdlComponent),
      },
      {
        path: 'dos-master/ppd',
        loadComponent: () =>
          import('./panels/ppd.panel.component').then(m => m.PlatformAdminPpdComponent),
      },
      {
        path: 'dos-master/compensation',
        loadComponent: () =>
          import('./panels/compensation.panel.component').then(m => m.PlatformAdminCompensationComponent),
      },
      {
        path: 'dos-master/auto-evaluator',
        loadComponent: () =>
          import('./panels/auto-evaluator.panel.component').then(m => m.PlatformAdminAutoEvaluatorComponent),
      },
      {
        path: 'dos-master/controlled-write',
        loadComponent: () =>
          import('./panels/controlled-write.panel.component').then(m => m.PlatformAdminControlledWriteComponent),
      },
      {
        path: 'dos-master/rollout-ledger',
        loadComponent: () =>
          import('./panels/rollout-ledger.panel.component').then(m => m.PlatformAdminRolloutLedgerComponent),
      },
      {
        path: 'dos-master/ci-guards',
        loadComponent: () =>
          import('./panels/ci-guards.panel.component').then(m => m.PlatformAdminCiGuardsComponent),
      },
      {
        path: 'dos-master/evidence',
        loadComponent: () =>
          import('./panels/evidence-pack.panel.component').then(m => m.PlatformAdminEvidencePackComponent),
      },
    ],
  },
];
