/**
 * DAuth — Dogan-Auth canonical exports.
 * Single import surface for all auth concerns.
 *
 * Law 1: One canonical service per concern — no aliases, no stubs.
 * Law 9: Organized per §K: identity/, session→middleware/, actor/, access/, scope/,
 *         authority/, delegation/, sod/, audit/, middleware/, contracts/, lifecycle/, registry/.
 */

// Identity — tokens, sessions, authentication
export {
  generateAccessToken,
  verifyAccessToken,
  verifyAccessTokenViaPort,
  decodeTokenUnsafe,
  getAccessTokenExpirySeconds,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  type AuthPayload,
} from './identity/token.service';

// Adapter factories — Phase 2-4
export { getTokenVerifiers, resetTokenVerifierFactory } from './adapters/token-verifier.factory';
export { getIdentityAdapters, resetIdentityFactory } from './adapters/identity.factory';
export { getAbacAdapters, resetAbacFactory } from './adapters/abac.factory';
export { getRebacAdapters, resetRebacFactory } from './adapters/rebac.factory';

// Diagnostics — Phase 1.7 + Phase 5.2
export {
  explainDecision,
  type ExplainDecisionInput,
  type ExplainDecisionResult,
} from './diagnostics/dauth-diagnostics.service';
export {
  auditRls,
  assertRlsCompliant,
  type RlsAuditOptions,
  type RlsAuditResult,
  type RlsTableStatus,
} from './diagnostics/rls-audit.service';

// Simulator + Replay — Phase 6
export {
  simulateCan,
  simulateRoleGrant,
  type SimulateCanInput,
  type SimulateCanResult,
  type SimulateRoleGrantInput,
  type SimulateRoleGrantResult,
} from './diagnostics/policy-simulator.service';
export {
  replayDecision,
  type ReplayDecisionInput,
  type ReplayDecisionResult,
} from './audit/decision-replay.service';

// Events — Phase 4.4 tuple-sync subscriber
export { registerOpenFgaTupleSync } from './events/openfga-tuple-sync.subscriber';

// Middleware — session auth (§K: dauth/middleware/)
export {
  authenticate,
  authenticateToken,
  optionalAuthenticate,
} from './middleware/session.middleware';

// Access — permission evaluation, role checks
export {
  requirePermission,
  requireAnyPermission,
  requireSuperAdmin,
  invalidatePermissionCache,
} from './access/access.resolver';

// Decision engine — full 14-step pipeline (for direct use in tests/services)
export {
  evaluateAccess,
  type AccessDecisionContext,
  type AccessDecision,
} from './access/decision-engine';

// Phase C — adapter that registers the 14-step pipeline as the authz
// evaluator port consumed by dauth-shared middleware. Call
// `installNativeAuthzEvaluator()` once at service startup.
export {
  NativeAuthzEvaluator,
  installNativeAuthzEvaluator,
} from './access/native-authz-evaluator.adapter';

// Unified `can()` API — single authorization entrypoint (Phase 1)
export {
  can as dauthCan,
  type CanInput,
  type CanDecision,
  type CanOptions,
} from './access/can.service';

// Ports — standardized adapter interfaces (Phase 1.1)
export type {
  TokenVerifier,
  TokenVerifyResult,
  IdentityAdapter,
  ExternalPrincipal,
  IdentityLinkResult,
  SyncResult as IamSyncResult,
  AbacAdapter,
  AbacPrincipal,
  AbacResource,
  AbacRequest,
  AbacVerdict,
  RebacAdapter,
  RebacCheckRequest,
  RebacCheckResult,
  RebacListRequest,
  RebacListResult,
  RebacTupleWrite,
  SecretsAdapter,
} from './ports';
export { InvalidTokenError, MissingSecretError } from './ports';

// Reason code catalog (Phase 1.2)
export {
  DAUTH_REASON_CODES,
  reasonCodeForStep,
  isAllowCode,
  isDenyCode,
  isAbstainCode,
  type DauthReasonCode,
} from './contracts/reason-codes';

// Config safety guard (Phase 1.6)
export { assertDauthConfigSafe } from './dauth.config';

// SoD — separation of duties evaluation (§10)
export {
  evaluateSod,
  evaluateModuleSod,
  evaluateModuleSodFromDefinitions,
  preventSelfApproval,
  type SodCheckResult,
  type SodOutcome,
  type SodViolation,
  type ModuleSodViolation,
  type ModuleSodDefinition,
} from './sod/sod-engine';

// Access snapshot — replaces deleted enterprise-authz.service (§18.3 neutral naming)
export {
  getAccessSnapshot,
  provisionAccessFromRole,
  canPerform,
  accessSnapshotService,
} from './access/access-snapshot.service';

// Lifecycle — state transition authorization (§11)
export {
  evaluateLifecycleTransition,
  type LifecycleAuthResult,
} from './lifecycle-auth/lifecycle-auth.service';

// Actor — actor registry (§3.1)
export { getActor, registerActor, type Actor, type ActorType } from './actor/actor-registry';

// Scope — scope resolution (§8)
export { resolveUserScope, resolveFullHierarchy, resolveScopeFromPosition, isWithinScope, mergeScopes, type EffectiveScope, type FullScopeHierarchy } from './scope/scope-resolver';

// Authority — decision authority levels (§7.4)
export { getUserAuthorityLevel, hasAuthority, getAuthorityChain, getAuthorityLevels, resolveApprovalChain, hasAnyAuthority } from './authority/authority-resolver';

// Audit — decision logging (§Q.1)
export { logAuthDecision, queryDecisionLog, getDecisionsByCorrelation, getDecisionSummary, getRecentDenials, type DecisionLogFilter, type DecisionLogEntry, type DecisionSummary } from './audit/decision-log.service';

// Session — token blacklist (§5.1)
export {
  blacklistToken,
  isTokenBlacklisted,
  registerActiveJtiForUser,
  removeActiveJtiForUser,
  revokeAllUserTokens,
} from './session/token-blacklist.service';

// Session — session lifecycle (§2.6)
export {
  createSession,
  refreshSession,
  destroySession,
  isSessionValid,
  type SessionCreateInput,
  type SessionTokens,
} from './session/session.service';

// Identity — principal resolution (§2.6)
export {
  resolvePrincipalFromToken,
  resolvePrincipalFromSession,
  enrichPrincipal,
  getPrincipalContext,
  validatePrincipal,
  cachePrincipal,
  invalidatePrincipalCache,
} from './identity/principal-resolution.service';
export { resolvePrincipal } from './identity/principal-resolution.service';

// Identity — identity management
export {
  resolvePrincipalMinimal,
  resolvePrincipalByEmail,
  validateTenantMembership,
  isPrincipalActive,
  updateLastLogin,
  createIdentity,
  type PrincipalIdentity,
  type PrincipalType,
  type CreateIdentityInput,
} from './identity/identity.service';

// MFA — multi-factor authentication (§2.6)
export {
  getMfaStatus,
  isMfaRequired,
  createEmailChallenge,
  verifyEmailChallenge,
  enableMfa,
  disableMfa,
  enableTotp,
  verifyTotp,
  type MfaType,
  type MfaStatus,
} from './mfa/mfa.service';

// Delegation — centralized delegation (§9, §16)
export {
  createDelegationGrant,
  revokeDelegationGrant,
  validateDelegation,
  generateDelegatedToken,
  executeDelegatedAction,
  registerDelegationScope,
  registerActionScopeMapping,
  getScopeRequiredPermissions,
  getActionScope,
  listDelegations,
  getDelegations,
  getActiveDelegationsForUser,
  createDelegation,
  revokeDelegation,
  type DelegationGrant,
  type DelegationScope,
} from './delegation/delegation.service';

// Contracts — canonical types (§O, §2.7.2)
export { AUTH_ERRORS, buildAuthError, type AuthErrorCode, type AuthErrorBody } from './contracts/auth-errors';
export { type FullAccessSnapshot, type ActorInfo, type TenantMembership, type ScopeBinding as AccessScopeBinding, type LandingHint, type AuditTraceMeta } from './contracts/access-snapshot.contract';
export { type AccessSnapshot } from './contracts/access-snapshot.types';
export type { SessionCreateRequest, SessionTokenPair, SessionInfo, TokenPayload, RefreshRequest, RefreshResponse, RevocationRequest, RevocationResult } from './contracts/session.contract';
export type { PrincipalContext, AuthenticatedRequestContext, ActorContext } from './contracts/principal-context.contract';
export type { ScopeType, ScopeBinding, ScopeResolutionRequest, ScopeResolutionResult, ScopeHierarchyNode, ScopeCheckRequest, ScopeCheckResult, OwnershipScopeRequest, OwnershipScopeResult } from './contracts/scope-resolution.contract';
export type { AuthorityCheckRequest, AuthorityCheckResult, SignOffRequirement, SignOffResult, ApprovalChainNode, ApprovalChainResult } from './contracts/authority-decision.contract';
export type { SodCheckRequest, SodCheckResult as SodCheckResultContract, SodViolation as SodViolationContract, SodAssignmentCheckRequest, SodAssignmentCheckResult, SodPolicyDefinition, SodWaiverRequest } from './contracts/sod-decision.contract';

// Types — shared DAuth type definitions
export {
  type SessionStatus,
  type RefreshTokenFamilyStatus,
  type InvitationStatus,
  type SecurityEventType,
  type SessionContext,
  type RefreshTokenFamily,
  type SecurityPolicyConfig,
  type AccessReviewRequest,
  type MakerCheckerDecision,
} from './types/dauth.types';

// Session — refresh token family management (§2.6)
export {
  createRefreshFamily,
  rotateRefreshToken,
  revokeRefreshFamily,
  revokeAllFamiliesForUser,
  getActiveFamily,
  detectReplayAttack,
  cleanupExpiredFamilies,
} from './session/refresh.service';

// Auth orchestrator — login/MFA/session flow coordination (Phase 1.3)
export {
  authenticateCredentials,
  resolveUserRoles,
  resolveUserRole,
  issueLoginTokens,
  buildLoginResponse,
  handleMfaChallenge,
  completeMfaLogin,
  changePassword,
  emitLoginSuccess,
  emitLoginFailure,
  emitRegistration,
  type AuthenticatedUser,
  type LoginResponsePayload,
  type MfaChallengeResponse,
} from './identity/auth-orchestrator.service';

// Authorization matrix — canonical authz decision engine (Law 2)
export {
  can,
  type AuthorizationCheckInput,
  type AuthorizationDecision,
} from './access/authorization-matrix.service';

// Delegation automation — OOO, competency-based, policy enforcement (Law 2)
export {
  processOooDelegations,
  delegateWithCompetencyCheck,
  enforceDelegationPolicy,
  type OooDelegationResult,
  type DelegationResult,
  type PolicyEnforcementResult,
} from './delegation/delegation-automation.service';

// Dynamic RBAC — module-based role activation (Law 3)
export {
  getActivationRules,
  getEffectivePermissions,
  getActiveRolesForUser,
  type ActivationRule,
  type EffectivePermission,
} from './access/rbac/dynamic-rbac.service';

// RBAC data seeding — provisioning-time role/permission seed (Law 3)
export { seedDynamicRbacData, type SeedResult } from './access/rbac/seed-rbac-data';

// Session — selective/bulk revocation (§2.6)
export {
  revokeSession,
  revokeAllUserSessions,
  revokeSessionsByTenant,
} from './session/revocation.service';

// Session — session context tracking
export {
  getSessionContext,
  recordSessionActivity,
  createSessionRecord,
  getActiveSessionsForUser,
  terminateExpiredSessions,
} from './session/session-context.service';

// Identity — credential recovery (§3.1)
export {
  requestPasswordReset,
  validateResetToken,
  completePasswordReset,
  requestEmailVerification,
  verifyEmail,
} from './identity/credential-recovery.service';

// Identity — login protection / brute-force (§N)
export {
  recordFailedAttempt,
  recordSuccessfulLogin,
  lockAccount,
  unlockAccount,
  isAccountLocked,
  getFailedAttemptCount,
} from './identity/login-protection.service';

// Identity — invitation control
export {
  createInvitation,
  validateInvitation,
  acceptInvitation,
  revokeInvitation,
  getPendingInvitations,
  expireStaleInvitations,
  type Invitation,
} from './identity/invitation-control.service';

// Access — functional roles (§7)
export {
  getFunctionalRoles,
  getFunctionalRole,
  createFunctionalRole,
  deactivateFunctionalRole,
  getRolePermissions,
  type FunctionalRole,
} from './access/functional-role.service';

// Access — access profiles (§7)
export {
  getAccessProfiles,
  getAccessProfile,
  assignAccessProfile,
  revokeAccessProfile,
  getUserAccessProfiles,
  type AccessProfile,
} from './access/access-profile.service';

// Access — permissions CRUD (§7)
export {
  validatePermissionFormat,
  getPermissions,
  getPermission,
  createPermission,
  deactivatePermission,
  getPermissionsByRole,
  assignPermissionToRole,
  revokePermissionFromRole,
  type Permission,
  type CreatePermissionInput,
} from './access/permission.service';

// Access — role assignments (§7)
export {
  assignRole,
  revokeRole,
  getUserRoleAssignments,
  getRoleAssignmentsByRole,
  expireStaleAssignments,
  type RoleAssignment,
} from './access/role-assignment.service';

// Scope adapters — org, team, position, ownership (§8)
export { resolveOrgScope, expandOrgScope, expandOrgScopeFlat, isWithinOrgScope, getAllOrganizations, resolveOrgHierarchyGraph } from './scope/org-scope.adapter';
export { resolveTeamScope, resolveTeamMembership, getTeamMembers, expandTeamScope, isWithinTeamScope, getTeamDepartment, getTeamsByDepartment } from './scope/team-scope.adapter';
export { resolvePositionScope, getPositionHierarchy, getSubordinatePositions, isWithinPositionScope, getPositionDepartment, getPositionsByDepartment, getReportsToPosition } from './scope/position-scope.adapter';
export { resolveOwnershipScope, isEntityOwner, isPrimaryOwner, getEntityOwners, getOwnedEntityIds, assignControlOwnership, assignRiskOwnership, revokeControlOwnership, revokeRiskOwnership, type OwnershipRecord } from './scope/ownership-scope.adapter';

// Authority — decision authority management (§7.4)
export {
  getUserDecisionAuthorities,
  grantDecisionAuthority,
  revokeDecisionAuthority,
  hasDecisionAuthority,
  type DecisionAuthority,
} from './authority/decision-authority.service';

// Authority — sign-off authority (§7.4)
export {
  getSignOffRequirements,
  canSignOff,
  recordSignOff,
  type SignOffRequirement as SignOffRequirementDetail,
} from './authority/sign-off-authority.service';

// Authority — approval matrix (§7.4)
export {
  getApprovalRules,
  getApprovalRule,
  getRequiredApprovers,
  createApprovalRule,
  deactivateApprovalRule,
  isApprovalRequired,
  type ApprovalRule,
  type RequiredApproval,
  type CreateApprovalRuleInput,
} from './authority/approval-matrix.service';

// Delegation — delegation policy (§9)
export {
  getDelegationPolicies,
  getDelegationPolicyForRole,
  validateDelegationRequest,
  evaluateDelegation,
  incrementDailyActions,
  getDelegationRules,
  upsertDelegationRule,
  deleteDelegationRule,
  type DelegationPolicy,
  type DelegationRule,
  type DelegationCheckResult,
} from './delegation/delegation-policy.service';

// Delegation — acting on behalf of (§9, §16)
export {
  resolveActingContext,
  evaluateDelegatedAccess,
  type ActingOnBehalfOfContext,
} from './delegation/acting-on-behalf-of.service';

// SoD — policy management (§10)
export {
  getSodPolicies,
  createSodPolicy,
  deactivateSodPolicy,
  grantSodWaiver,
  type SodPolicy,
} from './sod/sod-policy.service';

// SoD — conflict audit (§10)
export {
  detectConflictsForUser,
  getUnresolvedConflicts,
  resolveConflict,
  runTenantWideSodAudit,
  type SodConflictRecord,
} from './sod/sod-conflict-audit.service';

// Lifecycle — self-approval guard (§10, §11)
export {
  checkSelfApproval,
  isSelfApprovalAllowed,
  getEntityCreator,
} from './lifecycle-auth/self-approval.guard';

// Lifecycle — maker-checker policy (§11)
export {
  getMakerCheckerPolicy,
  submitForChecking,
  approveDecision,
  rejectDecision,
  getPendingDecisions,
  type MakerCheckerPolicy,
} from './lifecycle-auth/maker-checker-policy.service';

// Audit — security events (§Q)
export {
  logSecurityEvent,
  getSecurityEvents,
  getRecentFailedLogins,
  getSecurityEventSummary,
  type SecurityEvent,
} from './audit/security-event.service';

// Audit — access reviews (§Q)
export {
  createAccessReview,
  completeAccessReview,
  getPendingAccessReviews,
  getAccessReviewHistory,
} from './audit/access-review.service';

// Policies — tenant security policy
export {
  getTenantSecurityPolicy,
  updateTenantSecurityPolicy,
  getSecurityPolicyDefaults,
} from './policies/tenant-security-policy.service';

// Frontend contracts — access contract serialization (Law 2, Law 4)
export {
  buildFrontendAccessContract,
  getMinimalAccessContract,
  getNavigationContract,
  getPermissionContract,
  getContractVersion,
  diffAccessContract,
  type FrontendAccessContract,
  type MinimalAccessContract,
  type NavigationContract,
  type PermissionContract,
  type AccessContractDiff,
} from './frontend-contracts/frontend-access-contract.service';

// Frontend contracts — access snapshot consumption (§17)
export {
  hasPermission,
  hasRole,
  hasAuthority as hasAuthorityFromSnapshot,
  getAllowedModules,
  getLandingPage,
  isModuleVisible,
  getScopeBindings,
} from './frontend-contracts/access-snapshot.contract';

// Registry — module security metadata (§K: dauth/registry/)
export {
  registerModuleSecurity,
  getModuleSecurity,
  getAllModuleCodes,
  getSecurityRegistry,
  findPermission,
  findApprovalRule,
  findSoDRules,
  getRegistryStats,
  type ModuleSecurityEntry,
} from './registry/module-security-seeder.registry';

// Access — role-based access control (§7, deprecated — use requirePermission)
export { requireRole } from './access/access.resolver';

// Access — authorization audit logging (§Q)
export {
  logAuthorizationAudit,
  getAuthorizationAuditLog,
  logDecision,
} from './access/authorization-audit.service';

// Access — role profiles management (§7)
export {
  listRoleProfiles,
  getRoleProfileById,
  createRoleProfile,
} from './access/role-profiles.service';

// Access — canonical access service (§7)
export {
  resolveAccessSnapshot as resolveCanonicalAccessSnapshot,
  invalidateSnapshotCache,
  clearSnapshotCache,
} from './access/canonical-access.service';

// Access — security posture (§Q)
export {
  getLatestSecurityPosture,
  createSecurityPostureSnapshot,
  listSecurityAttestations,
  getEffectiveUserModules,
  getEffectiveUserPermissions,
} from './access/security-posture.service';

// Scope — external scope adapter (§8, §2.9.3)
export {
  resolveExternalScope,
  isWithinExternalScope,
  hasExternalPermission,
  getExternalEntityIds,
  type ExternalScope,
} from './scope/external-scope.adapter';

// Contracts — auth error contract shapes (§2.7.3)
export type {
  AuthErrorBase,
  AuthErrorResponse,
  UnauthenticatedError,
  ForbiddenError,
  TokenExpiredError,
  SessionRevokedError,
  TenantInactiveError,
  SoDBlockedError,
  SelfApprovalBlockedError,
  LifecycleDeniedError,
  AuthorityInsufficientError,
  DelegationInvalidError,
  ClearanceDeniedError,
  ModuleNotLicensedError,
} from './contracts/auth-error.contract';

// Contracts — lifecycle auth contract shapes (§2.7.2)
export type {
  LifecycleTransitionRequest,
  TransitionCheckResult,
  LifecycleAuthDecision,
} from './contracts/lifecycle-auth.contract';

// Contracts — delegation contract shapes (§2.7.2)
export type {
  DelegationScopeCode,
  DelegationGrantRequest,
  DelegationGrant as DelegationGrantContract,
  DelegationRevocation,
  DelegationValidation,
} from './contracts/delegation.contract';

// Admin — SLA config, escalation policy, runbooks (AS-BUILT §Diagnostics)
export * from './admin/dauth-admin.service';

// Diagnostics — health checks and diagnostics (AS-BUILT §Diagnostics)
export * from './diagnostics/dauth-diagnostics.service';

// Config — centralized DAuth configuration
export { DAUTH_CONFIG } from './dauth.config';

// Contracts — DAuth event type constants and payload types
export { DAUTH_EVENTS, type DauthEventType, type DauthEventPayload } from './contracts/dauth-events.contract';

// SCIM — user anonymization / GDPR-PDPL data erasure
export * from './scim/user-anonymization.service';

// Events — event subscriber registration (platform bootstrap)
export * from './events/dauth.subscribers';

// Jobs — scheduled background tasks (AS-BUILT §Scheduled Jobs)
export {
  cleanupExpiredDelegations,
  cleanupExpiredSessions,
  // expireStaleInvitations — already exported from identity/invitation-control.service
  runSodPeriodicScan,
  expireStaleRoleAssignments,
  getDauthJobs,
} from './jobs/dauth-monitor.job';

// Re-export canonical secret accessor (throws in production if unset — Law 11)
export { getJwtSecret } from './identity/token.service';
import { getJwtSecret as _getJwtSecret } from './identity/token.service';
/** @deprecated Use getJwtSecret() instead. Kept only for backward compat during migration. */
export const JWT_SECRET = _getJwtSecret();

// Platform-module port binding — `@dos/ports.DAuthPort` is the canonical
// contract other platform modules (DOS, DSOC, DNOC) and products use when
// calling into DAuth. `createDAuthPort()` builds a runtime implementation
// from the canonical DAuth services below.
export { createDAuthPort } from './dauth-port.impl';
export type { DAuthPortDependencies } from './dauth-port.impl';
export {
  getDAuthPort,
  tryGetDAuthPort,
  setDAuthPort,
  resetDAuthPort,
} from './dauth-port.registry';
export type {
  DAuthPort,
  DAuthPrincipal,
  DAuthSession,
  DAuthAccessRequest,
  DAuthAccessResult,
  DAuthAuthorityCheck,
  DAuthDelegationContext,
  DAuthSoDResult,
  DAuthDecision,
} from '@dos/ports/dauth';

// DSOC publisher — DAuth emits security/audit events to DSOC via this port.
// Until DSOC exists, the backbone-based implementation publishes on
// `dsoc.audit.*` and `dsoc.alert.*` topics; the DSOC service subscribes there.
export { createBackboneDSOCPort } from './audit/dsoc-port.publisher';
export type { BackbonePublisher } from './audit/dsoc-port.publisher';
export {
  getDSOCPort,
  setDSOCPort,
  resetDSOCPort,
} from './audit/dsoc-port.registry';

// Canonical publisher used by every DAuth service to emit security events.
// Dual-routes to (a) the legacy event backbone for existing dauth.* subscribers
// and (b) the DSOCPort for the normalized dsoc.audit.* / dsoc.alert.* feed.
// Use this everywhere instead of importing `publish` from
// `@dos/platform-core/events` directly.
export { publish as publishDAuthEvent, DAUTH_DSOC_MAP } from './events/publish-with-dsoc';
export type { DAuthEventRoute } from './events/publish-with-dsoc';
export type {
  DSOCPort,
  DSOCAuditEvent,
  DSOCSeverity,
  DSOCEventCategory,
  DSOCPostureSnapshot,
} from '@dos/ports/dsoc';

// AI agent tools — buildDAuthAgentTools({ port }) returns 3 typed tools
// (check_access, check_authority, evaluate_sod) that the AI engine
// registers and calls with tenantId injected per-call.
export { buildDAuthAgentTools } from './agent-tools';
export type { DAuthAgentToolsDeps } from './agent-tools';
