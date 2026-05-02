/**
 * Foundation module component registry.
 * Maps pageCode component names to lazy-load factories.
 * Consumed by Dynamic UI drift gate (tests/smoke/dynamic-ui-drift.test.mjs)
 * and the platform SPA router to validate that every contract page has a
 * resolvable Angular component.
 */

export const FOUNDATION_COMPONENT_MAP: Record<string, () => Promise<unknown>> = {
  'FoundationOverviewComponent':       () => import('../pages/foundation-overview.component'),
  'FoundationOrganizationComponent':   () => import('../pages/foundation-organization.component'),
  'FoundationBusinessUnitsComponent':  () => import('../pages/foundation-business-units.component'),
  'FoundationDepartmentsComponent':    () => import('../pages/foundation-departments.component'),
  'FoundationPositionsComponent':      () => import('../pages/foundation-positions.component'),
  'FoundationLocationsComponent':      () => import('../pages/locations/locations.component'),
  'FoundationUsersComponent':          () => import('../pages/foundation-users.component'),
  'FoundationTeamsComponent':          () => import('../pages/foundation-teams.component'),
  'FoundationRolesComponent':          () => import('../pages/foundation-roles.component'),
  'FoundationPermissionMatrixComponent': () => import('../pages/foundation-permission-matrix.component'),
  'FoundationCommitteesComponent':     () => import('../pages/foundation-committees.component'),
  'FoundationDelegationsComponent':    () => import('../pages/foundation-delegations.component'),
  'FoundationAccessReviewComponent':   () => import('../pages/foundation-access-review.component'),
  'FoundationDataProcessingComponent': () => import('../pages/foundation-data-processing.component'),
  'FoundationAuditTrailPage':          () => import('../pages/foundation-audit-trail.component'),
  'FoundationOwnershipMappingComponent': () => import('../pages/foundation-ownership-mapping.component'),
  'FoundationSodConfigComponent':      () => import('../pages/foundation-sod-config.component'),
  'FoundationOrgCanvasComponent':      () => import('../components/foundation-org-canvas.component'),
  'FoundationUserLifecyclePage':       () => import('../pages/foundation-user-lifecycle.component'),
  'FoundationReferenceDataComponent':  () => import('../pages/foundation-reference-data.component'),
  'FoundationDiagnosticsPage':         () => import('../pages/foundation-diagnostics.component'),
};
