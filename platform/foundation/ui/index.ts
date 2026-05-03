// Foundation Module — public UI barrel.
// Authoritative source for all Foundation Angular pages, components, services.
// Consumed by Shahin-AI Website/frontend via tsconfig path '@foundation-module/ui'.

// Pages (23 routes)
//
// @deprecated 2026-05-04 — Template-Only Routing rule §3.1.
// These bespoke Foundation*Component classes are no longer reachable from
// any Shahin SPA URL. The foundation children block in
// products/shahin-ai/app/src/app/app.routes.ts now resolves every page
// through @platform/shell `DynamicTemplatePageComponent`, which renders
// one of the 32 canonical archetypes from
// platform/core/platform/shell/templates/. These exports remain only to
// keep build/spec compatibility; physical deletion is staged in the next
// follow-up wave (`foundation-page-deletion`). Do NOT add new
// Foundation*Component pages here.
export { FoundationAccessReviewComponent } from './pages/foundation-access-review.component';
export { FoundationAuditComponent } from './pages/foundation-audit.component';
export { FoundationBusinessUnitsComponent } from './pages/foundation-business-units.component';
export { FoundationCommitteesComponent } from './pages/foundation-committees.component';
export { FoundationDataProcessingComponent } from './pages/foundation-data-processing.component';
export { FoundationDelegationsComponent } from './pages/foundation-delegations.component';
export { FoundationDepartmentsComponent } from './pages/foundation-departments.component';
export { FoundationLocationsComponent } from './pages/foundation-locations.component';
export { FoundationOperationsReadinessComponent } from './pages/foundation-operations-readiness.component';
export { FoundationOrganizationComponent } from './pages/foundation-organization.component';
export { FoundationOverviewComponent } from './pages/foundation-overview.component';
export { FoundationOverviewPageComponent } from './pages/foundation-overview-page.component';
export { FoundationOwnershipMappingComponent } from './pages/foundation-ownership-mapping.component';
export { FoundationPermissionMatrixComponent } from './pages/foundation-permission-matrix.component';
export { FoundationPoliciesComponent } from './pages/foundation-policies.component';
export { FoundationPositionsComponent } from './pages/foundation-positions.component';
export { FoundationReferenceDataComponent } from './pages/foundation-reference-data.component';
export { FoundationRoleDetailComponent } from './pages/foundation-role-detail.component';
export { FoundationRecordsPageComponent } from './pages/foundation-records-page.component';
export { FoundationReportsPageComponent } from './pages/foundation-reports-page.component';
export { FoundationRolesComponent } from './pages/foundation-roles.component';
export { FoundationSettingsComponent } from './pages/foundation-settings.component';
export { FoundationSettingsPageComponent } from './pages/foundation-settings-page.component';
export { FoundationTeamsComponent } from './pages/foundation-teams.component';
export { FoundationUsersComponent } from './pages/foundation-users.component';
export { FoundationWorkflowsPageComponent } from './pages/foundation-workflows-page.component';

// Phase-1 Module Enrollment — Standard 5-Page Template (Carbon-only)
export { FoundationHomeComponent } from './pages/foundation-home.component';
export { FoundationRegisterComponent } from './pages/foundation-register.component';
export { FoundationDetailComponent } from './pages/foundation-detail.component';
export { FoundationModuleSettingsComponent } from './pages/foundation-module-settings.component';
export { FoundationModuleAuditComponent } from './pages/foundation-module-audit.component';

// Phase F-FOUND — canonical 21-page contract additions.
// Backed by stubs in pages/; exposed here so the dynamic-page-host loader
// in platform/dos/registry/component-map.ts can resolve every contract key.
export { FoundationDiagnosticsPage }   from './pages/foundation-diagnostics.component';
export { FoundationUserLifecyclePage } from './pages/foundation-user-lifecycle.component';
export { FoundationSodConfigPage }     from './pages/foundation-sod-config.component';
// Hierarchy visualization page is the org-canvas component.
export { FoundationOrgCanvasComponent } from './components/foundation-org-canvas.component';
// Audit trail page key resolves to the existing FoundationAuditComponent.
export { FoundationAuditComponent as FoundationAuditTrailPage } from './pages/foundation-audit.component';

// Shared chrome
export { FoundationPageShellComponent } from './components/foundation-page-shell.component';

// Services
export { FoundationApiService } from './services/foundation-api.service';

// Dynamic UI signature widgets (stubs — replace with full implementations)
export {
  FoundationOnboardingKanbanComponent,
  FoundationProbationQueueComponent,
  FoundationLifecycleTimelineComponent,
  FoundationAuthorityMatrixComponent,
  FoundationSodRulesComponent,
  FoundationSodViolationsComponent,
  FoundationPolicyAcksComponent,
  FoundationTrainingBoardComponent,
  FoundationCoiDeclarationsComponent,
} from './widgets/foundation-signature-widgets.stub';

// Adapters
export * from './pages/foundation-permission-matrix.adapters';
export * from './pages/foundation-reference-data.adapters';
