import './interface/lifecycle-registration';

export { runMigrations } from './db/runner';
export type { RunMigrationsResult, MigrationRecord } from './db/runner';
export { FOUNDATION_POLICY } from './domain/policies/foundation.policies';
export { FOUNDATION_ENTITY_TYPES, FOUNDATION_STATUSES, FOUNDATION_DEFAULT_STATUS, FOUNDATION_LIMITS } from './infrastructure/persistence/foundation-constants';
export { FOUNDATION_EVENT_CONTRACT, FOUNDATION_PUBLISHED_EVENTS, FOUNDATION_CONSUMED_EVENTS, FOUNDATION_EVENT_ORDERING, FOUNDATION_EVENT_SECURITY, FOUNDATION_EVENT_CORRELATION } from './infrastructure/messaging/foundation.events';
export { toResponseDTO, toResponseDTOList, toAuditSafe } from './infrastructure/persistence/mappers/foundation.mapper';
export { foundationNodeCreateBody, foundationNodeUpdateBody, foundationListQuery } from './schemas/foundation.schemas';
export { getFoundationDiagnostics } from './interface/diagnostics/foundation-diagnostics.service';
export { default as foundationRoutes } from './interface/http/foundation.routes';
export { foundationGovernanceRouter as foundationGovernanceRoutes } from './interface/http/foundation-governance.routes';
export { default as foundationRolesRoutes } from './interface/http/foundation-roles.routes';
export { default as foundationUsersRoutes } from './interface/http/users.routes';
export { default as foundationDepartmentsRoutes } from './interface/http/departments.routes';
export { businessUnitsRouter as foundationBusinessUnitsRoutes } from './interface/http/business-units.routes';
export { organizationsRouter as foundationOrganizationsRoutes } from './interface/http/organizations.routes';
export { positionsRouter as foundationPositionsRoutes } from './interface/http/positions.routes';
export { locationsRouter as foundationLocationsRoutes } from './interface/http/locations.routes';
export { orgHierarchyRouter as foundationOrgHierarchyRoutes } from './interface/http/org-hierarchy.routes';
export { accessReviewRouter as foundationAccessReviewRoutes } from './interface/http/access-review.routes';
export { committeeManagementRouter as foundationCommitteeRoutes } from './interface/http/committee-management.routes';
export { userLifecycleRouter as foundationUserLifecycleRoutes } from './interface/http/user-lifecycle.routes';
export { bulkInviteRouter as foundationBulkInviteRoutes } from './interface/http/bulk-invite.routes';
export { ownershipMappingRouter as foundationOwnershipMappingRoutes } from './interface/http/ownership-mapping.routes';
export { sodCheckRouter as foundationSodCheckRoutes } from './interface/http/sod-check.routes';
export { delegationRouter as foundationDelegationRoutes } from './interface/http/delegation.routes';
export { default as foundationAdminRoutes } from './interface/admin/foundation-admin.routes';

// Zero-Blocker routes (invitations, audit-trail, profiles)
export { invitationsRouter } from './interface/http/invitations.routes';
export { auditTrailRouter } from './interface/http/audit-trail.routes';
export { profilesRouter } from './interface/http/profiles.routes';
export { privacyOpsRouter } from './interface/http/privacy-ops.routes';
export { foundationSuggestionsRouter } from './interface/http/foundation-suggestions.routes';

// Runtime aggregator factory (mounted at /api/foundation by host service).
// Accepts host-owned identity routers (user/team/role/department) as deps.
export {
  createFoundationAggregatorRouter,
  organizationsRouter,
  businessUnitsRouter,
  positionsRouter,
  locationsRouter,
  orgHierarchyRouter,
  committeeManagementRouter,
  ownershipMappingRouter,
  sodCheckRouter,
  foundationGovernanceRouter,
  userLifecycleRouter,
  bulkInviteRouter,
  accessReviewRouter,
  delegationRouter,
} from './interface/http/foundation-aggregator.routes';
export type { FoundationAggregatorDeps } from './interface/http/foundation-aggregator.routes';
export { foundationHealthRouter } from './interface/http/foundation-health.routes';
export { FOUNDATION_METRICS } from './infrastructure/observability/metrics';
export { bindFoundationPublisher } from './infrastructure/messaging/foundation.outbox-binder';
export { bindFoundationPorts, registerFoundation, onInstall, onActivate, onMigrate, onUninstall } from './bootstrap';
export type { FoundationHostBindings, RegisterFoundationOptions, RegisterFoundationResult } from './bootstrap';
export { bootstrapFoundationDefaults } from './application/bootstrap/foundation-bootstrap.service';
export type { FoundationBootstrapInput, FoundationBootstrapResult } from './application/bootstrap/foundation-bootstrap.service';
export type { EventBusLike } from './infrastructure/messaging/foundation.outbox-binder';
export { publish as publishFoundationEvent, setPublisher as setFoundationPublisher } from './infrastructure/messaging/foundation.publishers';

export { FOUNDATION_MODULE_PERMISSIONS } from './interface/security/foundation.permissions';
export { FOUNDATION_MODULE_ROLES } from './interface/security/foundation.roles';
export { FOUNDATION_SOD_RULES } from './interface/security/foundation.sod';
export { FOUNDATION_OWNERSHIP_RULES } from './interface/security/foundation.ownership';
export { FOUNDATION_PERMISSIONS as FOUNDATION_MODULE_ACTIONS, FOUNDATION_ACTIONS } from './interface/security/foundation.security';
export { FOUNDATION_APPROVAL_MATRIX } from './interface/security/foundation.approval-matrix';

export type { FoundationEntityType, FoundationStatus, FoundationNode, FoundationEventPayload } from './domain/types/foundation.types';
export type { FoundationNodeCreateDTO, FoundationNodeUpdateDTO, FoundationNodeResponseDTO, FoundationTreeResponseDTO } from './domain/types/foundation.dto';

// Public typed boundary — peer modules MUST import from `@dos/module-foundation/contracts`,
// but we also re-export the surface here so internal code can use the same names.
export {
  FOUNDATION_EVENT_NAMES,
  FOUNDATION_CONSUMED_EVENT_NAMES,
  FOUNDATION_PERMISSION_CODES,
  FOUNDATION_ERROR_CODES,
} from './contracts';
export type {
  FoundationEventName,
  FoundationConsumedEventName,
  FoundationPermissionCode,
  FoundationErrorCode,
  FoundationErrorBody,
  FoundationListQueryDTO,
  FoundationListResponseDTO,
  FoundationDiagnosticsDTO,
} from './contracts';


