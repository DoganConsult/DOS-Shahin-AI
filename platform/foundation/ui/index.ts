// Foundation Module — public UI barrel.
// Authoritative source for all Foundation Angular pages, components, services.
// Consumed by Shahin-AI Website/frontend via tsconfig path '@foundation-module/ui'.

// Pages (23 routes)
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
export { FoundationOwnershipMappingComponent } from './pages/foundation-ownership-mapping.component';
export { FoundationPermissionMatrixComponent } from './pages/foundation-permission-matrix.component';
export { FoundationPoliciesComponent } from './pages/foundation-policies.component';
export { FoundationPositionsComponent } from './pages/foundation-positions.component';
export { FoundationReferenceDataComponent } from './pages/foundation-reference-data.component';
export { FoundationRoleDetailComponent } from './pages/foundation-role-detail.component';
export { FoundationRolesComponent } from './pages/foundation-roles.component';
export { FoundationSettingsComponent } from './pages/foundation-settings.component';
export { FoundationTeamsComponent } from './pages/foundation-teams.component';
export { FoundationUsersComponent } from './pages/foundation-users.component';

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
