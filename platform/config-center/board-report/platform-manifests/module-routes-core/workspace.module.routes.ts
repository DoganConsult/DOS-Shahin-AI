import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const workspaceModuleRouteGroup: ModuleRouteGroup = {
  children: {}
};

export const workspaceStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'workspace-home': { loadComponent: () => import('../../pages/workspace-home/workspace-home.component').then(m => m.WorkspaceHomeComponent), moduleCode: 'workspace', data: { preload: true } },
  'dashboard': { redirectTo: 'workspace-home', pathMatch: 'full' },
  'profile': { loadComponent: () => import('../../pages/profile/profile.component').then(m => m.ProfileComponent), requiredPermission: 'profile:read', moduleCode: 'workspace' },
  'policies': { redirectTo: 'governance/policies', pathMatch: 'full' },
  'team': { loadComponent: () => import('../../pages/team/team.component').then(m => m.TeamComponent), requiredPermission: 'users.account.manage', moduleCode: 'workspace' },
  'workflow-designer': { redirectTo: '/workflow/builder', pathMatch: 'full' },
  'admin-hub': { loadComponent: () => import('../../features/admin/pages/admin-hub/admin-hub.component').then(m => m.AdminHubComponent), requiredPermission: 'users.account.manage', moduleCode: 'workspace' },
  'admin': { loadComponent: () => import('../../features/admin/pages/admin-dashboard-page/admin-dashboard.component').then(m => m.AdminDashboardComponent), requiredPermission: 'admin:read', moduleCode: 'workspace', adminOnly: true },
  'admin/packs': { loadComponent: () => import('../../features/admin/pack-installer-page.component').then(m => m.PackInstallerPageComponent), requiredPermission: 'admin:read', moduleCode: 'workspace', adminOnly: true },
  'admin/provisioning/orchestrator': { loadComponent: () => import('../../features/admin/provisioning-orchestrator-page.component').then(m => m.ProvisioningOrchestratorPageComponent), requiredPermission: 'admin:read', moduleCode: 'workspace', adminOnly: true },
  'admin/packs/review': { loadComponent: () => import('../../features/admin/pack-policy-review-page.component').then(m => m.PackPolicyReviewPageComponent), requiredPermission: 'admin:read', moduleCode: 'workspace', adminOnly: true },
  'admin/trial-extensions': { loadComponent: () => import('../../features/admin/trial-extension-admin-page.component').then(m => m.TrialExtensionAdminPageComponent), requiredPermission: 'admin:read', moduleCode: 'workspace', adminOnly: true },
  'admin/subscriptions': { loadComponent: () => import('../../features/admin/subscriptions/subscription-admin.component').then(m => m.SubscriptionAdminComponent), requiredPermission: 'admin:read', moduleCode: 'workspace', adminOnly: true },
  'admin/workspace-audit': { loadComponent: () => import('../../features/admin/workspace-audit-page.component').then(m => m.WorkspaceAuditPageComponent), requiredPermission: 'admin:read', moduleCode: 'workspace', adminOnly: true },
  'admin/sessions': { loadComponent: () => import('../../features/admin/active-sessions.component').then(m => m.ActiveSessionsComponent), requiredPermission: 'admin:read', moduleCode: 'workspace', adminOnly: true },
  'foundation/permissions': { loadComponent: () => import('@foundation-module/ui').then(m => m.FoundationPermissionMatrixComponent), requiredPermission: 'foundation.admin', moduleCode: 'workspace', adminOnly: true },
  'executive/overview': { loadComponent: () => import('../../features/executive/executive-overview-page.component').then(m => m.ExecutiveOverviewPageComponent), requiredPermission: 'workspace:read', moduleCode: 'workspace' },
  'exceptions': { redirectTo: 'compliance/exceptions', pathMatch: 'full' },
  'findings': { loadComponent: () => import('@app/features/compliance/pages/findings-exceptions/findings/findings.component').then(m => m.FindingsComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'assets': { redirectTo: 'asset/register', pathMatch: 'full' },
  'cadence-calendar': { loadComponent: () => import('../../pages/cadence-calendar/cadence-calendar.component').then(m => m.CadenceCalendarComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'tenant-config': { loadComponent: () => import('../../pages/tenant-config/tenant-config.component').then(m => m.TenantConfigComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'tier-management': { loadComponent: () => import('../../features/admin/pages/tier-management/tier-management.component').then(m => m.TierManagementComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'pricing': { loadComponent: () => import('../../pages/pricing/pricing.component').then(m => m.PricingComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'billing': { loadComponent: () => import('../../features/admin/pages/billing/billing.component').then(m => m.BillingComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'role-profiles': { loadComponent: () => import('../../pages/role-profiles/role-profiles.component').then(m => m.RoleProfilesComponent), requiredPermission: 'admin.system.write', moduleCode: 'workspace' },
  'training-data': { loadComponent: () => import('../../features/training/pages/training-data/training-data.component').then(m => m.TrainingDataComponent), requiredPermission: 'admin.system.write', moduleCode: 'workspace', adminOnly: true },
  'notifications': { loadComponent: () => import('../../pages/notification-center/notification-center.component').then(m => m.NotificationCenterComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'activity-feed': { loadComponent: () => import('../../pages/activity-feed/activity-feed.component').then(m => m.ActivityFeedComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'comments': { loadComponent: () => import('../../pages/comment/comment.component').then(m => m.CommentComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'contract-tests': { loadComponent: () => import('../../pages/contract-tests/contract-tests.component').then(m => m.ContractTestsComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'jobs': { loadComponent: () => import('../../pages/jobs/jobs.component').then(m => m.JobsComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'quick-accelerator': { loadComponent: () => import('../../pages/quick-grc-accelerator/quick-grc-accelerator.component').then(m => m.QuickGrcAcceleratorComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'platform-config': { loadComponent: () => import('../../features/admin/pages/platform-config/platform-config.component').then(m => m.PlatformConfigComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'platform-email-approvals': { loadComponent: () => import('../../features/admin/pages/platform-email-approvals/platform-email-approvals.component').then(m => m.PlatformEmailApprovalsComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'content-manager': { loadComponent: () => import('../../pages/content-manager/content-manager.component').then(m => m.ContentManagerComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'bulk-actions': { loadComponent: () => import('../../pages/bulk-actions/bulk-actions.component').then(m => m.BulkActionsComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'activity-stream': { loadComponent: () => import('../../pages/activity-stream/activity-stream.component').then(m => m.ActivityStreamComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'notification-preferences': { loadComponent: () => import('../../pages/notification-prefs/notification-prefs.component').then(m => m.NotificationPrefsComponent), requiredPermission: 'profile.record.read', moduleCode: 'workspace' },
  'account-settings': { loadComponent: () => import('@foundation-module/ui').then(m => m.AccountSettingsComponent), requiredPermission: 'profile.record.read', moduleCode: 'workspace' },
  'security-settings': { loadComponent: () => import('../../pages/security-settings/security-settings.component').then(m => m.SecuritySettingsComponent), requiredPermission: 'profile.record.read', moduleCode: 'workspace' },
  'profile-detail': { loadComponent: () => import('../../pages/profile-detail/profile-detail.component').then(m => m.ProfileDetailComponent), requiredPermission: 'profile.record.read', moduleCode: 'workspace' },
  'field-rbac': { loadComponent: () => import('../../pages/field-rbac/field-rbac.component').then(m => m.FieldRBACComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'custom-objects': { loadComponent: () => import('../../pages/custom-objects/custom-objects.component').then(m => m.CustomObjectsComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'bulk-import': { loadComponent: () => import('../../pages/bulk-import/bulk-import.component').then(m => m.BulkImportComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'email-commands': { loadComponent: () => import('../../pages/email-commands/email-commands.component').then(m => m.EmailCommandsComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'locations': { loadComponent: () => import('../../pages/locations/locations.component').then(m => m.LocationsComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'products': { loadComponent: () => import('../../pages/products/products.component').then(m => m.ProductsComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'workflow-builder': { redirectTo: '/workflow/builder', pathMatch: 'full' },
  'sla-management': { loadComponent: () => import('@workflow-module/ui').then(m => m.SLAManagementComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'sla-monitoring': { loadComponent: () => import('@workflow-module/ui').then(m => m.SlaMonitoringComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'job-monitor': { loadComponent: () => import('../../pages/job-monitor/job-monitor.component').then(m => m.JobMonitorComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'raci-matrix': { loadComponent: () => import('../../features/governance/pages/raci-matrix/raci-matrix.component').then(m => m.RACIMatrixComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'business-calendar': { loadComponent: () => import('../../pages/business-calendar/business-calendar.component').then(m => m.BusinessCalendarComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'ninety-day-plan': { loadComponent: () => import('../../pages/ninety-day-plan/ninety-day-plan.component').then(m => m.NinetyDayPlanComponent), requiredPermission: 'workspace.config.read', moduleCode: 'workspace' },
  'provisioning-dashboard': { loadComponent: () => import('../../pages/provisioning-dashboard/provisioning-dashboard.component').then(m => m.ProvisioningDashboardComponent), requiredPermission: 'admin.system.read', moduleCode: 'workspace', adminOnly: true },
  'setup': { loadComponent: () => import('../../pages/setup-wizard/setup-wizard.component').then(m => m.SetupWizardPageComponent) },
  'service-health': { loadComponent: () => import('../../pages/service-health/service-health.component').then(m => m.ServiceHealthComponent), requiredPermission: 'admin:read', moduleCode: 'workspace', adminOnly: true },
  'feature-explorer': { loadComponent: () => import('../../pages/feature-explorer/feature-explorer.component').then(m => m.FeatureExplorerComponent), requiredPermission: 'workspace:read', moduleCode: 'workspace' },
  'form-builder': { loadComponent: () => import('../../pages/form-builder/form-builder.component').then(m => m.FormBuilderComponent), requiredPermission: 'admin:read', moduleCode: 'workspace', adminOnly: true },
  'placeholder': { loadComponent: () => import('../../pages/placeholder/placeholder.component').then(m => m.PlaceholderComponent) },
  'mobile-dashboard': { loadComponent: () => import('../../features/mobile/components/mobile-dashboard.component').then(m => m.MobileDashboardComponent), requiredPermission: 'workspace:read', moduleCode: 'workspace' },
  // DNOC AI Operations + DSOC AI Security single-pane dashboards (Wave 5.D).
  // Backed by /api/dnoc/ai/* and /api/dsoc/ai/* aggregator endpoints in ai-engine.
  'dnoc/ai-ops': { loadComponent: () => import('../../features/dnoc/pages/dnoc-ai-operations.component').then(m => m.DnocAiOperationsComponent), requiredPermission: 'admin:read', moduleCode: 'workspace', adminOnly: true },
  'dsoc/ai-security': { loadComponent: () => import('../../features/dsoc/pages/dsoc-ai-security.component').then(m => m.DsocAiSecurityComponent), requiredPermission: 'admin:read', moduleCode: 'workspace', adminOnly: true },
  // AI Trace Surfaces — saved-dashboard equivalent for surface-tagged Langfuse views.
  'dnoc/ai-trace-surfaces': { loadComponent: () => import('../../features/dnoc/pages/dnoc-ai-trace-surfaces.component').then(m => m.DnocAiTraceSurfacesComponent), requiredPermission: 'admin:read', moduleCode: 'workspace', adminOnly: true },
  // AI Employees Phase 1 — HR-style org chart treating the 13 agents as real staff.
  // Visible to anyone with ai.copilot.read (tenant_admin / compliance_officer /
  // platform_admin / ai_ops_oncall). Not adminOnly — managers need to see staff
  // that report to them.
  'hr/ai-employees': { loadComponent: () => import('../../features/hr/pages/ai-employees.component').then(m => m.AiEmployeesComponent), requiredPermission: 'ai.copilot.read', moduleCode: 'workspace' },
  // AI Employees Phase 2 — Manager Inbox: every report from agents that
  // report to the caller's role(s).
  'hr/manager-inbox': { loadComponent: () => import('../../features/hr/pages/manager-inbox.component').then(m => m.ManagerInboxComponent), requiredPermission: 'ai.copilot.read', moduleCode: 'workspace' },
  // AI Employee profile (deep-link, BambooHR-style) — full per-agent view
  // with KPI trend, activity timeline, and reports list.
  'hr/ai-employees/:agentId': { loadComponent: () => import('../../features/hr/pages/ai-employee-profile.component').then(m => m.AiEmployeeProfileComponent), requiredPermission: 'ai.copilot.read', moduleCode: 'workspace' },
  // Sales Copilot Leads — visitor leads captured by A13 from the public
  // landing page, with state-machine workflow (new → routed → contacted
  // → converted | rejected). Audit-trailed end-to-end.
  'sales/copilot-leads': { loadComponent: () => import('../../features/sales/pages/copilot-leads.component').then(m => m.CopilotLeadsComponent), requiredPermission: 'ai.copilot.read', moduleCode: 'workspace' }
};
