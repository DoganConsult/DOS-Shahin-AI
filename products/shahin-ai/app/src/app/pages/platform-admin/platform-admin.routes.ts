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
      {
        path: 'workflow-os/definitions',
        loadComponent: () =>
          import('./panels/workflow-definitions.panel.component').then(m => m.PlatformAdminWorkflowDefinitionsComponent),
      },
      {
        path: 'workflow-os/instances',
        loadComponent: () =>
          import('./panels/workflow-instances.panel.component').then(m => m.PlatformAdminWorkflowInstancesComponent),
      },
      // ── Phase 2 Full-Stack-Per-OS lazy panels ────────────────────────
      { path: 'ai-os/records',                loadComponent: () => import('./panels/ai-os-records.panel.component').then(m => m.PlatformAdminAiOsRecordsComponent) },
      { path: 'ai-os/events',                 loadComponent: () => import('./panels/ai-os-events.panel.component').then(m => m.PlatformAdminAiOsEventsComponent) },
      { path: 'notification-os/records',      loadComponent: () => import('./panels/notification-os-records.panel.component').then(m => m.PlatformAdminNotificationOsRecordsComponent) },
      { path: 'notification-os/events',       loadComponent: () => import('./panels/notification-os-events.panel.component').then(m => m.PlatformAdminNotificationOsEventsComponent) },
      { path: 'integration-os/records',       loadComponent: () => import('./panels/integration-os-records.panel.component').then(m => m.PlatformAdminIntegrationOsRecordsComponent) },
      { path: 'integration-os/events',        loadComponent: () => import('./panels/integration-os-events.panel.component').then(m => m.PlatformAdminIntegrationOsEventsComponent) },
      { path: 'data-governance-os/records',   loadComponent: () => import('./panels/data-governance-os-records.panel.component').then(m => m.PlatformAdminDataGovernanceOsRecordsComponent) },
      { path: 'data-governance-os/events',    loadComponent: () => import('./panels/data-governance-os-events.panel.component').then(m => m.PlatformAdminDataGovernanceOsEventsComponent) },
      { path: 'billing-os/records',           loadComponent: () => import('./panels/billing-os-records.panel.component').then(m => m.PlatformAdminBillingOsRecordsComponent) },
      { path: 'billing-os/events',            loadComponent: () => import('./panels/billing-os-events.panel.component').then(m => m.PlatformAdminBillingOsEventsComponent) },
      { path: 'feature-flag-os/records',      loadComponent: () => import('./panels/feature-flag-os-records.panel.component').then(m => m.PlatformAdminFeatureFlagOsRecordsComponent) },
      { path: 'feature-flag-os/events',       loadComponent: () => import('./panels/feature-flag-os-events.panel.component').then(m => m.PlatformAdminFeatureFlagOsEventsComponent) },
      { path: 'security-secrets-os/records',  loadComponent: () => import('./panels/security-secrets-os-records.panel.component').then(m => m.PlatformAdminSecuritySecretsOsRecordsComponent) },
      { path: 'security-secrets-os/events',   loadComponent: () => import('./panels/security-secrets-os-events.panel.component').then(m => m.PlatformAdminSecuritySecretsOsEventsComponent) },
      { path: 'telemetry-os/records',         loadComponent: () => import('./panels/telemetry-os-records.panel.component').then(m => m.PlatformAdminTelemetryOsRecordsComponent) },
      { path: 'telemetry-os/events',          loadComponent: () => import('./panels/telemetry-os-events.panel.component').then(m => m.PlatformAdminTelemetryOsEventsComponent) },
      { path: 'schema-authoring-os/records',  loadComponent: () => import('./panels/schema-authoring-os-records.panel.component').then(m => m.PlatformAdminSchemaAuthoringOsRecordsComponent) },
      { path: 'schema-authoring-os/events',   loadComponent: () => import('./panels/schema-authoring-os-events.panel.component').then(m => m.PlatformAdminSchemaAuthoringOsEventsComponent) },
      { path: 'deployment-os/records',        loadComponent: () => import('./panels/deployment-os-records.panel.component').then(m => m.PlatformAdminDeploymentOsRecordsComponent) },
      { path: 'deployment-os/events',         loadComponent: () => import('./panels/deployment-os-events.panel.component').then(m => m.PlatformAdminDeploymentOsEventsComponent) },
      { path: 'release-os/records',           loadComponent: () => import('./panels/release-os-records.panel.component').then(m => m.PlatformAdminReleaseOsRecordsComponent) },
      { path: 'release-os/events',            loadComponent: () => import('./panels/release-os-events.panel.component').then(m => m.PlatformAdminReleaseOsEventsComponent) },
      { path: 'vendor-risk-os/records',       loadComponent: () => import('./panels/vendor-risk-os-records.panel.component').then(m => m.PlatformAdminVendorRiskOsRecordsComponent) },
      { path: 'vendor-risk-os/events',        loadComponent: () => import('./panels/vendor-risk-os-events.panel.component').then(m => m.PlatformAdminVendorRiskOsEventsComponent) },
      { path: 'marketplace-os/records',       loadComponent: () => import('./panels/marketplace-os-records.panel.component').then(m => m.PlatformAdminMarketplaceOsRecordsComponent) },
      { path: 'marketplace-os/events',        loadComponent: () => import('./panels/marketplace-os-events.panel.component').then(m => m.PlatformAdminMarketplaceOsEventsComponent) },
      { path: 'dr-os/records',                loadComponent: () => import('./panels/dr-os-records.panel.component').then(m => m.PlatformAdminDrOsRecordsComponent) },
      { path: 'dr-os/events',                 loadComponent: () => import('./panels/dr-os-events.panel.component').then(m => m.PlatformAdminDrOsEventsComponent) },
    ],
  },
];
