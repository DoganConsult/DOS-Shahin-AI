"use strict";
/**
 * DAuth — Dogan-Auth canonical exports.
 * Single import surface for all auth concerns.
 *
 * Law 1: One canonical service per concern — no aliases, no stubs.
 * Law 9: Organized per §K: identity/, session→middleware/, actor/, access/, scope/,
 *         authority/, delegation/, sod/, audit/, middleware/, contracts/, lifecycle/, registry/.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canPerform = exports.provisionAccessFromRole = exports.getAccessSnapshot = exports.preventSelfApproval = exports.evaluateModuleSodFromDefinitions = exports.evaluateModuleSod = exports.evaluateSod = exports.assertDauthConfigSafe = exports.isAbstainCode = exports.isDenyCode = exports.isAllowCode = exports.reasonCodeForStep = exports.DAUTH_REASON_CODES = exports.MissingSecretError = exports.InvalidTokenError = exports.dauthCan = exports.installNativeAuthzEvaluator = exports.NativeAuthzEvaluator = exports.evaluateAccess = exports.invalidatePermissionCache = exports.requireSuperAdmin = exports.requireAnyPermission = exports.requirePermission = exports.optionalAuthenticate = exports.authenticateToken = exports.authenticate = exports.registerOpenFgaTupleSync = exports.replayDecision = exports.simulateRoleGrant = exports.simulateCan = exports.assertRlsCompliant = exports.auditRls = exports.explainDecision = exports.resetRebacFactory = exports.getRebacAdapters = exports.resetAbacFactory = exports.getAbacAdapters = exports.resetIdentityFactory = exports.getIdentityAdapters = exports.resetTokenVerifierFactory = exports.getTokenVerifiers = exports.clearRefreshTokenCookie = exports.setRefreshTokenCookie = exports.verifyRefreshToken = exports.generateRefreshToken = exports.getAccessTokenExpirySeconds = exports.decodeTokenUnsafe = exports.verifyAccessTokenViaPort = exports.verifyAccessToken = exports.generateAccessToken = void 0;
exports.enableTotp = exports.disableMfa = exports.enableMfa = exports.verifyEmailChallenge = exports.createEmailChallenge = exports.isMfaRequired = exports.getMfaStatus = exports.createIdentity = exports.updateLastLogin = exports.isPrincipalActive = exports.validateTenantMembership = exports.resolvePrincipalByEmail = exports.resolvePrincipalMinimal = exports.resolvePrincipal = exports.invalidatePrincipalCache = exports.cachePrincipal = exports.validatePrincipal = exports.getPrincipalContext = exports.enrichPrincipal = exports.resolvePrincipalFromSession = exports.resolvePrincipalFromToken = exports.isSessionValid = exports.destroySession = exports.refreshSession = exports.createSession = exports.revokeAllUserTokens = exports.removeActiveJtiForUser = exports.registerActiveJtiForUser = exports.isTokenBlacklisted = exports.blacklistToken = exports.getRecentDenials = exports.getDecisionSummary = exports.getDecisionsByCorrelation = exports.queryDecisionLog = exports.logAuthDecision = exports.hasAnyAuthority = exports.resolveApprovalChain = exports.getAuthorityLevels = exports.getAuthorityChain = exports.hasAuthority = exports.getUserAuthorityLevel = exports.mergeScopes = exports.isWithinScope = exports.resolveScopeFromPosition = exports.resolveFullHierarchy = exports.resolveUserScope = exports.registerActor = exports.getActor = exports.evaluateLifecycleTransition = exports.accessSnapshotService = void 0;
exports.getActiveSessionsForUser = exports.createSessionRecord = exports.recordSessionActivity = exports.getSessionContext = exports.revokeSessionsByTenant = exports.revokeAllUserSessions = exports.revokeSession = exports.seedDynamicRbacData = exports.getActiveRolesForUser = exports.getEffectivePermissions = exports.getActivationRules = exports.enforceDelegationPolicy = exports.delegateWithCompetencyCheck = exports.processOooDelegations = exports.can = exports.emitRegistration = exports.emitLoginFailure = exports.emitLoginSuccess = exports.changePassword = exports.completeMfaLogin = exports.handleMfaChallenge = exports.buildLoginResponse = exports.issueLoginTokens = exports.resolveUserRole = exports.resolveUserRoles = exports.authenticateCredentials = exports.cleanupExpiredFamilies = exports.detectReplayAttack = exports.getActiveFamily = exports.revokeAllFamiliesForUser = exports.revokeRefreshFamily = exports.rotateRefreshToken = exports.createRefreshFamily = exports.buildAuthError = exports.AUTH_ERRORS = exports.revokeDelegation = exports.createDelegation = exports.getActiveDelegationsForUser = exports.getDelegations = exports.listDelegations = exports.getActionScope = exports.getScopeRequiredPermissions = exports.registerActionScopeMapping = exports.registerDelegationScope = exports.executeDelegatedAction = exports.generateDelegatedToken = exports.validateDelegation = exports.revokeDelegationGrant = exports.createDelegationGrant = exports.verifyTotp = void 0;
exports.getTeamMembers = exports.resolveTeamMembership = exports.resolveTeamScope = exports.resolveOrgHierarchyGraph = exports.getAllOrganizations = exports.isWithinOrgScope = exports.expandOrgScopeFlat = exports.expandOrgScope = exports.resolveOrgScope = exports.expireStaleAssignments = exports.getRoleAssignmentsByRole = exports.getUserRoleAssignments = exports.revokeRole = exports.assignRole = exports.revokePermissionFromRole = exports.assignPermissionToRole = exports.getPermissionsByRole = exports.deactivatePermission = exports.createPermission = exports.getPermission = exports.getPermissions = exports.validatePermissionFormat = exports.getUserAccessProfiles = exports.revokeAccessProfile = exports.assignAccessProfile = exports.getAccessProfile = exports.getAccessProfiles = exports.getRolePermissions = exports.deactivateFunctionalRole = exports.createFunctionalRole = exports.getFunctionalRole = exports.getFunctionalRoles = exports.expireStaleInvitations = exports.getPendingInvitations = exports.revokeInvitation = exports.acceptInvitation = exports.validateInvitation = exports.createInvitation = exports.getFailedAttemptCount = exports.isAccountLocked = exports.unlockAccount = exports.lockAccount = exports.recordSuccessfulLogin = exports.recordFailedAttempt = exports.verifyEmail = exports.requestEmailVerification = exports.completePasswordReset = exports.validateResetToken = exports.requestPasswordReset = exports.terminateExpiredSessions = void 0;
exports.resolveConflict = exports.getUnresolvedConflicts = exports.detectConflictsForUser = exports.grantSodWaiver = exports.deactivateSodPolicy = exports.createSodPolicy = exports.getSodPolicies = exports.evaluateDelegatedAccess = exports.resolveActingContext = exports.deleteDelegationRule = exports.upsertDelegationRule = exports.getDelegationRules = exports.incrementDailyActions = exports.evaluateDelegation = exports.validateDelegationRequest = exports.getDelegationPolicyForRole = exports.getDelegationPolicies = exports.isApprovalRequired = exports.deactivateApprovalRule = exports.createApprovalRule = exports.getRequiredApprovers = exports.getApprovalRule = exports.getApprovalRules = exports.recordSignOff = exports.canSignOff = exports.getSignOffRequirements = exports.hasDecisionAuthority = exports.revokeDecisionAuthority = exports.grantDecisionAuthority = exports.getUserDecisionAuthorities = exports.revokeRiskOwnership = exports.revokeControlOwnership = exports.assignRiskOwnership = exports.assignControlOwnership = exports.getOwnedEntityIds = exports.getEntityOwners = exports.isPrimaryOwner = exports.isEntityOwner = exports.resolveOwnershipScope = exports.getReportsToPosition = exports.getPositionsByDepartment = exports.getPositionDepartment = exports.isWithinPositionScope = exports.getSubordinatePositions = exports.getPositionHierarchy = exports.resolvePositionScope = exports.getTeamsByDepartment = exports.getTeamDepartment = exports.isWithinTeamScope = exports.expandTeamScope = void 0;
exports.invalidateSnapshotCache = exports.resolveCanonicalAccessSnapshot = exports.createRoleProfile = exports.getRoleProfileById = exports.listRoleProfiles = exports.logDecision = exports.getAuthorizationAuditLog = exports.logAuthorizationAudit = exports.requireRole = exports.getRegistryStats = exports.findSoDRules = exports.findApprovalRule = exports.findPermission = exports.getSecurityRegistry = exports.getAllModuleCodes = exports.getModuleSecurity = exports.registerModuleSecurity = exports.getScopeBindings = exports.isModuleVisible = exports.getLandingPage = exports.getAllowedModules = exports.hasAuthorityFromSnapshot = exports.hasRole = exports.hasPermission = exports.diffAccessContract = exports.getContractVersion = exports.getPermissionContract = exports.getNavigationContract = exports.getMinimalAccessContract = exports.buildFrontendAccessContract = exports.getSecurityPolicyDefaults = exports.updateTenantSecurityPolicy = exports.getTenantSecurityPolicy = exports.getAccessReviewHistory = exports.getPendingAccessReviews = exports.completeAccessReview = exports.createAccessReview = exports.getSecurityEventSummary = exports.getRecentFailedLogins = exports.getSecurityEvents = exports.logSecurityEvent = exports.getPendingDecisions = exports.rejectDecision = exports.approveDecision = exports.submitForChecking = exports.getMakerCheckerPolicy = exports.getEntityCreator = exports.isSelfApprovalAllowed = exports.checkSelfApproval = exports.runTenantWideSodAudit = void 0;
exports.buildDAuthAgentTools = exports.DAUTH_DSOC_MAP = exports.publishDAuthEvent = exports.resetDSOCPort = exports.setDSOCPort = exports.getDSOCPort = exports.createBackboneDSOCPort = exports.resetDAuthPort = exports.setDAuthPort = exports.tryGetDAuthPort = exports.getDAuthPort = exports.createDAuthPort = exports.JWT_SECRET = exports.getJwtSecret = exports.getDauthJobs = exports.expireStaleRoleAssignments = exports.runSodPeriodicScan = exports.cleanupExpiredSessions = exports.cleanupExpiredDelegations = exports.DAUTH_EVENTS = exports.DAUTH_CONFIG = exports.getExternalEntityIds = exports.hasExternalPermission = exports.isWithinExternalScope = exports.resolveExternalScope = exports.getEffectiveUserPermissions = exports.getEffectiveUserModules = exports.listSecurityAttestations = exports.createSecurityPostureSnapshot = exports.getLatestSecurityPosture = exports.clearSnapshotCache = void 0;
// Identity — tokens, sessions, authentication
var token_service_1 = require("./identity/token.service");
Object.defineProperty(exports, "generateAccessToken", { enumerable: true, get: function () { return token_service_1.generateAccessToken; } });
Object.defineProperty(exports, "verifyAccessToken", { enumerable: true, get: function () { return token_service_1.verifyAccessToken; } });
Object.defineProperty(exports, "verifyAccessTokenViaPort", { enumerable: true, get: function () { return token_service_1.verifyAccessTokenViaPort; } });
Object.defineProperty(exports, "decodeTokenUnsafe", { enumerable: true, get: function () { return token_service_1.decodeTokenUnsafe; } });
Object.defineProperty(exports, "getAccessTokenExpirySeconds", { enumerable: true, get: function () { return token_service_1.getAccessTokenExpirySeconds; } });
Object.defineProperty(exports, "generateRefreshToken", { enumerable: true, get: function () { return token_service_1.generateRefreshToken; } });
Object.defineProperty(exports, "verifyRefreshToken", { enumerable: true, get: function () { return token_service_1.verifyRefreshToken; } });
Object.defineProperty(exports, "setRefreshTokenCookie", { enumerable: true, get: function () { return token_service_1.setRefreshTokenCookie; } });
Object.defineProperty(exports, "clearRefreshTokenCookie", { enumerable: true, get: function () { return token_service_1.clearRefreshTokenCookie; } });
// Adapter factories — Phase 2-4
var token_verifier_factory_1 = require("./adapters/token-verifier.factory");
Object.defineProperty(exports, "getTokenVerifiers", { enumerable: true, get: function () { return token_verifier_factory_1.getTokenVerifiers; } });
Object.defineProperty(exports, "resetTokenVerifierFactory", { enumerable: true, get: function () { return token_verifier_factory_1.resetTokenVerifierFactory; } });
var identity_factory_1 = require("./adapters/identity.factory");
Object.defineProperty(exports, "getIdentityAdapters", { enumerable: true, get: function () { return identity_factory_1.getIdentityAdapters; } });
Object.defineProperty(exports, "resetIdentityFactory", { enumerable: true, get: function () { return identity_factory_1.resetIdentityFactory; } });
var abac_factory_1 = require("./adapters/abac.factory");
Object.defineProperty(exports, "getAbacAdapters", { enumerable: true, get: function () { return abac_factory_1.getAbacAdapters; } });
Object.defineProperty(exports, "resetAbacFactory", { enumerable: true, get: function () { return abac_factory_1.resetAbacFactory; } });
var rebac_factory_1 = require("./adapters/rebac.factory");
Object.defineProperty(exports, "getRebacAdapters", { enumerable: true, get: function () { return rebac_factory_1.getRebacAdapters; } });
Object.defineProperty(exports, "resetRebacFactory", { enumerable: true, get: function () { return rebac_factory_1.resetRebacFactory; } });
// Diagnostics — Phase 1.7 + Phase 5.2
var dauth_diagnostics_service_1 = require("./diagnostics/dauth-diagnostics.service");
Object.defineProperty(exports, "explainDecision", { enumerable: true, get: function () { return dauth_diagnostics_service_1.explainDecision; } });
var rls_audit_service_1 = require("./diagnostics/rls-audit.service");
Object.defineProperty(exports, "auditRls", { enumerable: true, get: function () { return rls_audit_service_1.auditRls; } });
Object.defineProperty(exports, "assertRlsCompliant", { enumerable: true, get: function () { return rls_audit_service_1.assertRlsCompliant; } });
// Simulator + Replay — Phase 6
var policy_simulator_service_1 = require("./diagnostics/policy-simulator.service");
Object.defineProperty(exports, "simulateCan", { enumerable: true, get: function () { return policy_simulator_service_1.simulateCan; } });
Object.defineProperty(exports, "simulateRoleGrant", { enumerable: true, get: function () { return policy_simulator_service_1.simulateRoleGrant; } });
var decision_replay_service_1 = require("./audit/decision-replay.service");
Object.defineProperty(exports, "replayDecision", { enumerable: true, get: function () { return decision_replay_service_1.replayDecision; } });
// Events — Phase 4.4 tuple-sync subscriber
var openfga_tuple_sync_subscriber_1 = require("./events/openfga-tuple-sync.subscriber");
Object.defineProperty(exports, "registerOpenFgaTupleSync", { enumerable: true, get: function () { return openfga_tuple_sync_subscriber_1.registerOpenFgaTupleSync; } });
// Middleware — session auth (§K: dauth/middleware/)
var session_middleware_1 = require("./middleware/session.middleware");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return session_middleware_1.authenticate; } });
Object.defineProperty(exports, "authenticateToken", { enumerable: true, get: function () { return session_middleware_1.authenticateToken; } });
Object.defineProperty(exports, "optionalAuthenticate", { enumerable: true, get: function () { return session_middleware_1.optionalAuthenticate; } });
// Access — permission evaluation, role checks
var access_resolver_1 = require("./access/access.resolver");
Object.defineProperty(exports, "requirePermission", { enumerable: true, get: function () { return access_resolver_1.requirePermission; } });
Object.defineProperty(exports, "requireAnyPermission", { enumerable: true, get: function () { return access_resolver_1.requireAnyPermission; } });
Object.defineProperty(exports, "requireSuperAdmin", { enumerable: true, get: function () { return access_resolver_1.requireSuperAdmin; } });
Object.defineProperty(exports, "invalidatePermissionCache", { enumerable: true, get: function () { return access_resolver_1.invalidatePermissionCache; } });
// Decision engine — full 14-step pipeline (for direct use in tests/services)
var decision_engine_1 = require("./access/decision-engine");
Object.defineProperty(exports, "evaluateAccess", { enumerable: true, get: function () { return decision_engine_1.evaluateAccess; } });
// Phase C — adapter that registers the 14-step pipeline as the authz
// evaluator port consumed by dauth-shared middleware. Call
// `installNativeAuthzEvaluator()` once at service startup.
var native_authz_evaluator_adapter_1 = require("./access/native-authz-evaluator.adapter");
Object.defineProperty(exports, "NativeAuthzEvaluator", { enumerable: true, get: function () { return native_authz_evaluator_adapter_1.NativeAuthzEvaluator; } });
Object.defineProperty(exports, "installNativeAuthzEvaluator", { enumerable: true, get: function () { return native_authz_evaluator_adapter_1.installNativeAuthzEvaluator; } });
// Unified `can()` API — single authorization entrypoint (Phase 1)
var can_service_1 = require("./access/can.service");
Object.defineProperty(exports, "dauthCan", { enumerable: true, get: function () { return can_service_1.can; } });
var ports_1 = require("./ports");
Object.defineProperty(exports, "InvalidTokenError", { enumerable: true, get: function () { return ports_1.InvalidTokenError; } });
Object.defineProperty(exports, "MissingSecretError", { enumerable: true, get: function () { return ports_1.MissingSecretError; } });
// Reason code catalog (Phase 1.2)
var reason_codes_1 = require("./contracts/reason-codes");
Object.defineProperty(exports, "DAUTH_REASON_CODES", { enumerable: true, get: function () { return reason_codes_1.DAUTH_REASON_CODES; } });
Object.defineProperty(exports, "reasonCodeForStep", { enumerable: true, get: function () { return reason_codes_1.reasonCodeForStep; } });
Object.defineProperty(exports, "isAllowCode", { enumerable: true, get: function () { return reason_codes_1.isAllowCode; } });
Object.defineProperty(exports, "isDenyCode", { enumerable: true, get: function () { return reason_codes_1.isDenyCode; } });
Object.defineProperty(exports, "isAbstainCode", { enumerable: true, get: function () { return reason_codes_1.isAbstainCode; } });
// Config safety guard (Phase 1.6)
var dauth_config_1 = require("./dauth.config");
Object.defineProperty(exports, "assertDauthConfigSafe", { enumerable: true, get: function () { return dauth_config_1.assertDauthConfigSafe; } });
// SoD — separation of duties evaluation (§10)
var sod_engine_1 = require("./sod/sod-engine");
Object.defineProperty(exports, "evaluateSod", { enumerable: true, get: function () { return sod_engine_1.evaluateSod; } });
Object.defineProperty(exports, "evaluateModuleSod", { enumerable: true, get: function () { return sod_engine_1.evaluateModuleSod; } });
Object.defineProperty(exports, "evaluateModuleSodFromDefinitions", { enumerable: true, get: function () { return sod_engine_1.evaluateModuleSodFromDefinitions; } });
Object.defineProperty(exports, "preventSelfApproval", { enumerable: true, get: function () { return sod_engine_1.preventSelfApproval; } });
// Access snapshot — replaces deleted enterprise-authz.service (§18.3 neutral naming)
var access_snapshot_service_1 = require("./access/access-snapshot.service");
Object.defineProperty(exports, "getAccessSnapshot", { enumerable: true, get: function () { return access_snapshot_service_1.getAccessSnapshot; } });
Object.defineProperty(exports, "provisionAccessFromRole", { enumerable: true, get: function () { return access_snapshot_service_1.provisionAccessFromRole; } });
Object.defineProperty(exports, "canPerform", { enumerable: true, get: function () { return access_snapshot_service_1.canPerform; } });
Object.defineProperty(exports, "accessSnapshotService", { enumerable: true, get: function () { return access_snapshot_service_1.accessSnapshotService; } });
// Lifecycle — state transition authorization (§11)
var lifecycle_auth_service_1 = require("./lifecycle-auth/lifecycle-auth.service");
Object.defineProperty(exports, "evaluateLifecycleTransition", { enumerable: true, get: function () { return lifecycle_auth_service_1.evaluateLifecycleTransition; } });
// Actor — actor registry (§3.1)
var actor_registry_1 = require("./actor/actor-registry");
Object.defineProperty(exports, "getActor", { enumerable: true, get: function () { return actor_registry_1.getActor; } });
Object.defineProperty(exports, "registerActor", { enumerable: true, get: function () { return actor_registry_1.registerActor; } });
// Scope — scope resolution (§8)
var scope_resolver_1 = require("./scope/scope-resolver");
Object.defineProperty(exports, "resolveUserScope", { enumerable: true, get: function () { return scope_resolver_1.resolveUserScope; } });
Object.defineProperty(exports, "resolveFullHierarchy", { enumerable: true, get: function () { return scope_resolver_1.resolveFullHierarchy; } });
Object.defineProperty(exports, "resolveScopeFromPosition", { enumerable: true, get: function () { return scope_resolver_1.resolveScopeFromPosition; } });
Object.defineProperty(exports, "isWithinScope", { enumerable: true, get: function () { return scope_resolver_1.isWithinScope; } });
Object.defineProperty(exports, "mergeScopes", { enumerable: true, get: function () { return scope_resolver_1.mergeScopes; } });
// Authority — decision authority levels (§7.4)
var authority_resolver_1 = require("./authority/authority-resolver");
Object.defineProperty(exports, "getUserAuthorityLevel", { enumerable: true, get: function () { return authority_resolver_1.getUserAuthorityLevel; } });
Object.defineProperty(exports, "hasAuthority", { enumerable: true, get: function () { return authority_resolver_1.hasAuthority; } });
Object.defineProperty(exports, "getAuthorityChain", { enumerable: true, get: function () { return authority_resolver_1.getAuthorityChain; } });
Object.defineProperty(exports, "getAuthorityLevels", { enumerable: true, get: function () { return authority_resolver_1.getAuthorityLevels; } });
Object.defineProperty(exports, "resolveApprovalChain", { enumerable: true, get: function () { return authority_resolver_1.resolveApprovalChain; } });
Object.defineProperty(exports, "hasAnyAuthority", { enumerable: true, get: function () { return authority_resolver_1.hasAnyAuthority; } });
// Audit — decision logging (§Q.1)
var decision_log_service_1 = require("./audit/decision-log.service");
Object.defineProperty(exports, "logAuthDecision", { enumerable: true, get: function () { return decision_log_service_1.logAuthDecision; } });
Object.defineProperty(exports, "queryDecisionLog", { enumerable: true, get: function () { return decision_log_service_1.queryDecisionLog; } });
Object.defineProperty(exports, "getDecisionsByCorrelation", { enumerable: true, get: function () { return decision_log_service_1.getDecisionsByCorrelation; } });
Object.defineProperty(exports, "getDecisionSummary", { enumerable: true, get: function () { return decision_log_service_1.getDecisionSummary; } });
Object.defineProperty(exports, "getRecentDenials", { enumerable: true, get: function () { return decision_log_service_1.getRecentDenials; } });
// Session — token blacklist (§5.1)
var token_blacklist_service_1 = require("./session/token-blacklist.service");
Object.defineProperty(exports, "blacklistToken", { enumerable: true, get: function () { return token_blacklist_service_1.blacklistToken; } });
Object.defineProperty(exports, "isTokenBlacklisted", { enumerable: true, get: function () { return token_blacklist_service_1.isTokenBlacklisted; } });
Object.defineProperty(exports, "registerActiveJtiForUser", { enumerable: true, get: function () { return token_blacklist_service_1.registerActiveJtiForUser; } });
Object.defineProperty(exports, "removeActiveJtiForUser", { enumerable: true, get: function () { return token_blacklist_service_1.removeActiveJtiForUser; } });
Object.defineProperty(exports, "revokeAllUserTokens", { enumerable: true, get: function () { return token_blacklist_service_1.revokeAllUserTokens; } });
// Session — session lifecycle (§2.6)
var session_service_1 = require("./session/session.service");
Object.defineProperty(exports, "createSession", { enumerable: true, get: function () { return session_service_1.createSession; } });
Object.defineProperty(exports, "refreshSession", { enumerable: true, get: function () { return session_service_1.refreshSession; } });
Object.defineProperty(exports, "destroySession", { enumerable: true, get: function () { return session_service_1.destroySession; } });
Object.defineProperty(exports, "isSessionValid", { enumerable: true, get: function () { return session_service_1.isSessionValid; } });
// Identity — principal resolution (§2.6)
var principal_resolution_service_1 = require("./identity/principal-resolution.service");
Object.defineProperty(exports, "resolvePrincipalFromToken", { enumerable: true, get: function () { return principal_resolution_service_1.resolvePrincipalFromToken; } });
Object.defineProperty(exports, "resolvePrincipalFromSession", { enumerable: true, get: function () { return principal_resolution_service_1.resolvePrincipalFromSession; } });
Object.defineProperty(exports, "enrichPrincipal", { enumerable: true, get: function () { return principal_resolution_service_1.enrichPrincipal; } });
Object.defineProperty(exports, "getPrincipalContext", { enumerable: true, get: function () { return principal_resolution_service_1.getPrincipalContext; } });
Object.defineProperty(exports, "validatePrincipal", { enumerable: true, get: function () { return principal_resolution_service_1.validatePrincipal; } });
Object.defineProperty(exports, "cachePrincipal", { enumerable: true, get: function () { return principal_resolution_service_1.cachePrincipal; } });
Object.defineProperty(exports, "invalidatePrincipalCache", { enumerable: true, get: function () { return principal_resolution_service_1.invalidatePrincipalCache; } });
var principal_resolution_service_2 = require("./identity/principal-resolution.service");
Object.defineProperty(exports, "resolvePrincipal", { enumerable: true, get: function () { return principal_resolution_service_2.resolvePrincipal; } });
// Identity — identity management
var identity_service_1 = require("./identity/identity.service");
Object.defineProperty(exports, "resolvePrincipalMinimal", { enumerable: true, get: function () { return identity_service_1.resolvePrincipalMinimal; } });
Object.defineProperty(exports, "resolvePrincipalByEmail", { enumerable: true, get: function () { return identity_service_1.resolvePrincipalByEmail; } });
Object.defineProperty(exports, "validateTenantMembership", { enumerable: true, get: function () { return identity_service_1.validateTenantMembership; } });
Object.defineProperty(exports, "isPrincipalActive", { enumerable: true, get: function () { return identity_service_1.isPrincipalActive; } });
Object.defineProperty(exports, "updateLastLogin", { enumerable: true, get: function () { return identity_service_1.updateLastLogin; } });
Object.defineProperty(exports, "createIdentity", { enumerable: true, get: function () { return identity_service_1.createIdentity; } });
// MFA — multi-factor authentication (§2.6)
var mfa_service_1 = require("./mfa/mfa.service");
Object.defineProperty(exports, "getMfaStatus", { enumerable: true, get: function () { return mfa_service_1.getMfaStatus; } });
Object.defineProperty(exports, "isMfaRequired", { enumerable: true, get: function () { return mfa_service_1.isMfaRequired; } });
Object.defineProperty(exports, "createEmailChallenge", { enumerable: true, get: function () { return mfa_service_1.createEmailChallenge; } });
Object.defineProperty(exports, "verifyEmailChallenge", { enumerable: true, get: function () { return mfa_service_1.verifyEmailChallenge; } });
Object.defineProperty(exports, "enableMfa", { enumerable: true, get: function () { return mfa_service_1.enableMfa; } });
Object.defineProperty(exports, "disableMfa", { enumerable: true, get: function () { return mfa_service_1.disableMfa; } });
Object.defineProperty(exports, "enableTotp", { enumerable: true, get: function () { return mfa_service_1.enableTotp; } });
Object.defineProperty(exports, "verifyTotp", { enumerable: true, get: function () { return mfa_service_1.verifyTotp; } });
// Delegation — centralized delegation (§9, §16)
var delegation_service_1 = require("./delegation/delegation.service");
Object.defineProperty(exports, "createDelegationGrant", { enumerable: true, get: function () { return delegation_service_1.createDelegationGrant; } });
Object.defineProperty(exports, "revokeDelegationGrant", { enumerable: true, get: function () { return delegation_service_1.revokeDelegationGrant; } });
Object.defineProperty(exports, "validateDelegation", { enumerable: true, get: function () { return delegation_service_1.validateDelegation; } });
Object.defineProperty(exports, "generateDelegatedToken", { enumerable: true, get: function () { return delegation_service_1.generateDelegatedToken; } });
Object.defineProperty(exports, "executeDelegatedAction", { enumerable: true, get: function () { return delegation_service_1.executeDelegatedAction; } });
Object.defineProperty(exports, "registerDelegationScope", { enumerable: true, get: function () { return delegation_service_1.registerDelegationScope; } });
Object.defineProperty(exports, "registerActionScopeMapping", { enumerable: true, get: function () { return delegation_service_1.registerActionScopeMapping; } });
Object.defineProperty(exports, "getScopeRequiredPermissions", { enumerable: true, get: function () { return delegation_service_1.getScopeRequiredPermissions; } });
Object.defineProperty(exports, "getActionScope", { enumerable: true, get: function () { return delegation_service_1.getActionScope; } });
Object.defineProperty(exports, "listDelegations", { enumerable: true, get: function () { return delegation_service_1.listDelegations; } });
Object.defineProperty(exports, "getDelegations", { enumerable: true, get: function () { return delegation_service_1.getDelegations; } });
Object.defineProperty(exports, "getActiveDelegationsForUser", { enumerable: true, get: function () { return delegation_service_1.getActiveDelegationsForUser; } });
Object.defineProperty(exports, "createDelegation", { enumerable: true, get: function () { return delegation_service_1.createDelegation; } });
Object.defineProperty(exports, "revokeDelegation", { enumerable: true, get: function () { return delegation_service_1.revokeDelegation; } });
// Contracts — canonical types (§O, §2.7.2)
var auth_errors_1 = require("./contracts/auth-errors");
Object.defineProperty(exports, "AUTH_ERRORS", { enumerable: true, get: function () { return auth_errors_1.AUTH_ERRORS; } });
Object.defineProperty(exports, "buildAuthError", { enumerable: true, get: function () { return auth_errors_1.buildAuthError; } });
// Session — refresh token family management (§2.6)
var refresh_service_1 = require("./session/refresh.service");
Object.defineProperty(exports, "createRefreshFamily", { enumerable: true, get: function () { return refresh_service_1.createRefreshFamily; } });
Object.defineProperty(exports, "rotateRefreshToken", { enumerable: true, get: function () { return refresh_service_1.rotateRefreshToken; } });
Object.defineProperty(exports, "revokeRefreshFamily", { enumerable: true, get: function () { return refresh_service_1.revokeRefreshFamily; } });
Object.defineProperty(exports, "revokeAllFamiliesForUser", { enumerable: true, get: function () { return refresh_service_1.revokeAllFamiliesForUser; } });
Object.defineProperty(exports, "getActiveFamily", { enumerable: true, get: function () { return refresh_service_1.getActiveFamily; } });
Object.defineProperty(exports, "detectReplayAttack", { enumerable: true, get: function () { return refresh_service_1.detectReplayAttack; } });
Object.defineProperty(exports, "cleanupExpiredFamilies", { enumerable: true, get: function () { return refresh_service_1.cleanupExpiredFamilies; } });
// Auth orchestrator — login/MFA/session flow coordination (Phase 1.3)
var auth_orchestrator_service_1 = require("./identity/auth-orchestrator.service");
Object.defineProperty(exports, "authenticateCredentials", { enumerable: true, get: function () { return auth_orchestrator_service_1.authenticateCredentials; } });
Object.defineProperty(exports, "resolveUserRoles", { enumerable: true, get: function () { return auth_orchestrator_service_1.resolveUserRoles; } });
Object.defineProperty(exports, "resolveUserRole", { enumerable: true, get: function () { return auth_orchestrator_service_1.resolveUserRole; } });
Object.defineProperty(exports, "issueLoginTokens", { enumerable: true, get: function () { return auth_orchestrator_service_1.issueLoginTokens; } });
Object.defineProperty(exports, "buildLoginResponse", { enumerable: true, get: function () { return auth_orchestrator_service_1.buildLoginResponse; } });
Object.defineProperty(exports, "handleMfaChallenge", { enumerable: true, get: function () { return auth_orchestrator_service_1.handleMfaChallenge; } });
Object.defineProperty(exports, "completeMfaLogin", { enumerable: true, get: function () { return auth_orchestrator_service_1.completeMfaLogin; } });
Object.defineProperty(exports, "changePassword", { enumerable: true, get: function () { return auth_orchestrator_service_1.changePassword; } });
Object.defineProperty(exports, "emitLoginSuccess", { enumerable: true, get: function () { return auth_orchestrator_service_1.emitLoginSuccess; } });
Object.defineProperty(exports, "emitLoginFailure", { enumerable: true, get: function () { return auth_orchestrator_service_1.emitLoginFailure; } });
Object.defineProperty(exports, "emitRegistration", { enumerable: true, get: function () { return auth_orchestrator_service_1.emitRegistration; } });
// Authorization matrix — canonical authz decision engine (Law 2)
var authorization_matrix_service_1 = require("./access/authorization-matrix.service");
Object.defineProperty(exports, "can", { enumerable: true, get: function () { return authorization_matrix_service_1.can; } });
// Delegation automation — OOO, competency-based, policy enforcement (Law 2)
var delegation_automation_service_1 = require("./delegation/delegation-automation.service");
Object.defineProperty(exports, "processOooDelegations", { enumerable: true, get: function () { return delegation_automation_service_1.processOooDelegations; } });
Object.defineProperty(exports, "delegateWithCompetencyCheck", { enumerable: true, get: function () { return delegation_automation_service_1.delegateWithCompetencyCheck; } });
Object.defineProperty(exports, "enforceDelegationPolicy", { enumerable: true, get: function () { return delegation_automation_service_1.enforceDelegationPolicy; } });
// Dynamic RBAC — module-based role activation (Law 3)
var dynamic_rbac_service_1 = require("./access/rbac/dynamic-rbac.service");
Object.defineProperty(exports, "getActivationRules", { enumerable: true, get: function () { return dynamic_rbac_service_1.getActivationRules; } });
Object.defineProperty(exports, "getEffectivePermissions", { enumerable: true, get: function () { return dynamic_rbac_service_1.getEffectivePermissions; } });
Object.defineProperty(exports, "getActiveRolesForUser", { enumerable: true, get: function () { return dynamic_rbac_service_1.getActiveRolesForUser; } });
// RBAC data seeding — provisioning-time role/permission seed (Law 3)
var seed_rbac_data_1 = require("./access/rbac/seed-rbac-data");
Object.defineProperty(exports, "seedDynamicRbacData", { enumerable: true, get: function () { return seed_rbac_data_1.seedDynamicRbacData; } });
// Session — selective/bulk revocation (§2.6)
var revocation_service_1 = require("./session/revocation.service");
Object.defineProperty(exports, "revokeSession", { enumerable: true, get: function () { return revocation_service_1.revokeSession; } });
Object.defineProperty(exports, "revokeAllUserSessions", { enumerable: true, get: function () { return revocation_service_1.revokeAllUserSessions; } });
Object.defineProperty(exports, "revokeSessionsByTenant", { enumerable: true, get: function () { return revocation_service_1.revokeSessionsByTenant; } });
// Session — session context tracking
var session_context_service_1 = require("./session/session-context.service");
Object.defineProperty(exports, "getSessionContext", { enumerable: true, get: function () { return session_context_service_1.getSessionContext; } });
Object.defineProperty(exports, "recordSessionActivity", { enumerable: true, get: function () { return session_context_service_1.recordSessionActivity; } });
Object.defineProperty(exports, "createSessionRecord", { enumerable: true, get: function () { return session_context_service_1.createSessionRecord; } });
Object.defineProperty(exports, "getActiveSessionsForUser", { enumerable: true, get: function () { return session_context_service_1.getActiveSessionsForUser; } });
Object.defineProperty(exports, "terminateExpiredSessions", { enumerable: true, get: function () { return session_context_service_1.terminateExpiredSessions; } });
// Identity — credential recovery (§3.1)
var credential_recovery_service_1 = require("./identity/credential-recovery.service");
Object.defineProperty(exports, "requestPasswordReset", { enumerable: true, get: function () { return credential_recovery_service_1.requestPasswordReset; } });
Object.defineProperty(exports, "validateResetToken", { enumerable: true, get: function () { return credential_recovery_service_1.validateResetToken; } });
Object.defineProperty(exports, "completePasswordReset", { enumerable: true, get: function () { return credential_recovery_service_1.completePasswordReset; } });
Object.defineProperty(exports, "requestEmailVerification", { enumerable: true, get: function () { return credential_recovery_service_1.requestEmailVerification; } });
Object.defineProperty(exports, "verifyEmail", { enumerable: true, get: function () { return credential_recovery_service_1.verifyEmail; } });
// Identity — login protection / brute-force (§N)
var login_protection_service_1 = require("./identity/login-protection.service");
Object.defineProperty(exports, "recordFailedAttempt", { enumerable: true, get: function () { return login_protection_service_1.recordFailedAttempt; } });
Object.defineProperty(exports, "recordSuccessfulLogin", { enumerable: true, get: function () { return login_protection_service_1.recordSuccessfulLogin; } });
Object.defineProperty(exports, "lockAccount", { enumerable: true, get: function () { return login_protection_service_1.lockAccount; } });
Object.defineProperty(exports, "unlockAccount", { enumerable: true, get: function () { return login_protection_service_1.unlockAccount; } });
Object.defineProperty(exports, "isAccountLocked", { enumerable: true, get: function () { return login_protection_service_1.isAccountLocked; } });
Object.defineProperty(exports, "getFailedAttemptCount", { enumerable: true, get: function () { return login_protection_service_1.getFailedAttemptCount; } });
// Identity — invitation control
var invitation_control_service_1 = require("./identity/invitation-control.service");
Object.defineProperty(exports, "createInvitation", { enumerable: true, get: function () { return invitation_control_service_1.createInvitation; } });
Object.defineProperty(exports, "validateInvitation", { enumerable: true, get: function () { return invitation_control_service_1.validateInvitation; } });
Object.defineProperty(exports, "acceptInvitation", { enumerable: true, get: function () { return invitation_control_service_1.acceptInvitation; } });
Object.defineProperty(exports, "revokeInvitation", { enumerable: true, get: function () { return invitation_control_service_1.revokeInvitation; } });
Object.defineProperty(exports, "getPendingInvitations", { enumerable: true, get: function () { return invitation_control_service_1.getPendingInvitations; } });
Object.defineProperty(exports, "expireStaleInvitations", { enumerable: true, get: function () { return invitation_control_service_1.expireStaleInvitations; } });
// Access — functional roles (§7)
var functional_role_service_1 = require("./access/functional-role.service");
Object.defineProperty(exports, "getFunctionalRoles", { enumerable: true, get: function () { return functional_role_service_1.getFunctionalRoles; } });
Object.defineProperty(exports, "getFunctionalRole", { enumerable: true, get: function () { return functional_role_service_1.getFunctionalRole; } });
Object.defineProperty(exports, "createFunctionalRole", { enumerable: true, get: function () { return functional_role_service_1.createFunctionalRole; } });
Object.defineProperty(exports, "deactivateFunctionalRole", { enumerable: true, get: function () { return functional_role_service_1.deactivateFunctionalRole; } });
Object.defineProperty(exports, "getRolePermissions", { enumerable: true, get: function () { return functional_role_service_1.getRolePermissions; } });
// Access — access profiles (§7)
var access_profile_service_1 = require("./access/access-profile.service");
Object.defineProperty(exports, "getAccessProfiles", { enumerable: true, get: function () { return access_profile_service_1.getAccessProfiles; } });
Object.defineProperty(exports, "getAccessProfile", { enumerable: true, get: function () { return access_profile_service_1.getAccessProfile; } });
Object.defineProperty(exports, "assignAccessProfile", { enumerable: true, get: function () { return access_profile_service_1.assignAccessProfile; } });
Object.defineProperty(exports, "revokeAccessProfile", { enumerable: true, get: function () { return access_profile_service_1.revokeAccessProfile; } });
Object.defineProperty(exports, "getUserAccessProfiles", { enumerable: true, get: function () { return access_profile_service_1.getUserAccessProfiles; } });
// Access — permissions CRUD (§7)
var permission_service_1 = require("./access/permission.service");
Object.defineProperty(exports, "validatePermissionFormat", { enumerable: true, get: function () { return permission_service_1.validatePermissionFormat; } });
Object.defineProperty(exports, "getPermissions", { enumerable: true, get: function () { return permission_service_1.getPermissions; } });
Object.defineProperty(exports, "getPermission", { enumerable: true, get: function () { return permission_service_1.getPermission; } });
Object.defineProperty(exports, "createPermission", { enumerable: true, get: function () { return permission_service_1.createPermission; } });
Object.defineProperty(exports, "deactivatePermission", { enumerable: true, get: function () { return permission_service_1.deactivatePermission; } });
Object.defineProperty(exports, "getPermissionsByRole", { enumerable: true, get: function () { return permission_service_1.getPermissionsByRole; } });
Object.defineProperty(exports, "assignPermissionToRole", { enumerable: true, get: function () { return permission_service_1.assignPermissionToRole; } });
Object.defineProperty(exports, "revokePermissionFromRole", { enumerable: true, get: function () { return permission_service_1.revokePermissionFromRole; } });
// Access — role assignments (§7)
var role_assignment_service_1 = require("./access/role-assignment.service");
Object.defineProperty(exports, "assignRole", { enumerable: true, get: function () { return role_assignment_service_1.assignRole; } });
Object.defineProperty(exports, "revokeRole", { enumerable: true, get: function () { return role_assignment_service_1.revokeRole; } });
Object.defineProperty(exports, "getUserRoleAssignments", { enumerable: true, get: function () { return role_assignment_service_1.getUserRoleAssignments; } });
Object.defineProperty(exports, "getRoleAssignmentsByRole", { enumerable: true, get: function () { return role_assignment_service_1.getRoleAssignmentsByRole; } });
Object.defineProperty(exports, "expireStaleAssignments", { enumerable: true, get: function () { return role_assignment_service_1.expireStaleAssignments; } });
// Scope adapters — org, team, position, ownership (§8)
var org_scope_adapter_1 = require("./scope/org-scope.adapter");
Object.defineProperty(exports, "resolveOrgScope", { enumerable: true, get: function () { return org_scope_adapter_1.resolveOrgScope; } });
Object.defineProperty(exports, "expandOrgScope", { enumerable: true, get: function () { return org_scope_adapter_1.expandOrgScope; } });
Object.defineProperty(exports, "expandOrgScopeFlat", { enumerable: true, get: function () { return org_scope_adapter_1.expandOrgScopeFlat; } });
Object.defineProperty(exports, "isWithinOrgScope", { enumerable: true, get: function () { return org_scope_adapter_1.isWithinOrgScope; } });
Object.defineProperty(exports, "getAllOrganizations", { enumerable: true, get: function () { return org_scope_adapter_1.getAllOrganizations; } });
Object.defineProperty(exports, "resolveOrgHierarchyGraph", { enumerable: true, get: function () { return org_scope_adapter_1.resolveOrgHierarchyGraph; } });
var team_scope_adapter_1 = require("./scope/team-scope.adapter");
Object.defineProperty(exports, "resolveTeamScope", { enumerable: true, get: function () { return team_scope_adapter_1.resolveTeamScope; } });
Object.defineProperty(exports, "resolveTeamMembership", { enumerable: true, get: function () { return team_scope_adapter_1.resolveTeamMembership; } });
Object.defineProperty(exports, "getTeamMembers", { enumerable: true, get: function () { return team_scope_adapter_1.getTeamMembers; } });
Object.defineProperty(exports, "expandTeamScope", { enumerable: true, get: function () { return team_scope_adapter_1.expandTeamScope; } });
Object.defineProperty(exports, "isWithinTeamScope", { enumerable: true, get: function () { return team_scope_adapter_1.isWithinTeamScope; } });
Object.defineProperty(exports, "getTeamDepartment", { enumerable: true, get: function () { return team_scope_adapter_1.getTeamDepartment; } });
Object.defineProperty(exports, "getTeamsByDepartment", { enumerable: true, get: function () { return team_scope_adapter_1.getTeamsByDepartment; } });
var position_scope_adapter_1 = require("./scope/position-scope.adapter");
Object.defineProperty(exports, "resolvePositionScope", { enumerable: true, get: function () { return position_scope_adapter_1.resolvePositionScope; } });
Object.defineProperty(exports, "getPositionHierarchy", { enumerable: true, get: function () { return position_scope_adapter_1.getPositionHierarchy; } });
Object.defineProperty(exports, "getSubordinatePositions", { enumerable: true, get: function () { return position_scope_adapter_1.getSubordinatePositions; } });
Object.defineProperty(exports, "isWithinPositionScope", { enumerable: true, get: function () { return position_scope_adapter_1.isWithinPositionScope; } });
Object.defineProperty(exports, "getPositionDepartment", { enumerable: true, get: function () { return position_scope_adapter_1.getPositionDepartment; } });
Object.defineProperty(exports, "getPositionsByDepartment", { enumerable: true, get: function () { return position_scope_adapter_1.getPositionsByDepartment; } });
Object.defineProperty(exports, "getReportsToPosition", { enumerable: true, get: function () { return position_scope_adapter_1.getReportsToPosition; } });
var ownership_scope_adapter_1 = require("./scope/ownership-scope.adapter");
Object.defineProperty(exports, "resolveOwnershipScope", { enumerable: true, get: function () { return ownership_scope_adapter_1.resolveOwnershipScope; } });
Object.defineProperty(exports, "isEntityOwner", { enumerable: true, get: function () { return ownership_scope_adapter_1.isEntityOwner; } });
Object.defineProperty(exports, "isPrimaryOwner", { enumerable: true, get: function () { return ownership_scope_adapter_1.isPrimaryOwner; } });
Object.defineProperty(exports, "getEntityOwners", { enumerable: true, get: function () { return ownership_scope_adapter_1.getEntityOwners; } });
Object.defineProperty(exports, "getOwnedEntityIds", { enumerable: true, get: function () { return ownership_scope_adapter_1.getOwnedEntityIds; } });
Object.defineProperty(exports, "assignControlOwnership", { enumerable: true, get: function () { return ownership_scope_adapter_1.assignControlOwnership; } });
Object.defineProperty(exports, "assignRiskOwnership", { enumerable: true, get: function () { return ownership_scope_adapter_1.assignRiskOwnership; } });
Object.defineProperty(exports, "revokeControlOwnership", { enumerable: true, get: function () { return ownership_scope_adapter_1.revokeControlOwnership; } });
Object.defineProperty(exports, "revokeRiskOwnership", { enumerable: true, get: function () { return ownership_scope_adapter_1.revokeRiskOwnership; } });
// Authority — decision authority management (§7.4)
var decision_authority_service_1 = require("./authority/decision-authority.service");
Object.defineProperty(exports, "getUserDecisionAuthorities", { enumerable: true, get: function () { return decision_authority_service_1.getUserDecisionAuthorities; } });
Object.defineProperty(exports, "grantDecisionAuthority", { enumerable: true, get: function () { return decision_authority_service_1.grantDecisionAuthority; } });
Object.defineProperty(exports, "revokeDecisionAuthority", { enumerable: true, get: function () { return decision_authority_service_1.revokeDecisionAuthority; } });
Object.defineProperty(exports, "hasDecisionAuthority", { enumerable: true, get: function () { return decision_authority_service_1.hasDecisionAuthority; } });
// Authority — sign-off authority (§7.4)
var sign_off_authority_service_1 = require("./authority/sign-off-authority.service");
Object.defineProperty(exports, "getSignOffRequirements", { enumerable: true, get: function () { return sign_off_authority_service_1.getSignOffRequirements; } });
Object.defineProperty(exports, "canSignOff", { enumerable: true, get: function () { return sign_off_authority_service_1.canSignOff; } });
Object.defineProperty(exports, "recordSignOff", { enumerable: true, get: function () { return sign_off_authority_service_1.recordSignOff; } });
// Authority — approval matrix (§7.4)
var approval_matrix_service_1 = require("./authority/approval-matrix.service");
Object.defineProperty(exports, "getApprovalRules", { enumerable: true, get: function () { return approval_matrix_service_1.getApprovalRules; } });
Object.defineProperty(exports, "getApprovalRule", { enumerable: true, get: function () { return approval_matrix_service_1.getApprovalRule; } });
Object.defineProperty(exports, "getRequiredApprovers", { enumerable: true, get: function () { return approval_matrix_service_1.getRequiredApprovers; } });
Object.defineProperty(exports, "createApprovalRule", { enumerable: true, get: function () { return approval_matrix_service_1.createApprovalRule; } });
Object.defineProperty(exports, "deactivateApprovalRule", { enumerable: true, get: function () { return approval_matrix_service_1.deactivateApprovalRule; } });
Object.defineProperty(exports, "isApprovalRequired", { enumerable: true, get: function () { return approval_matrix_service_1.isApprovalRequired; } });
// Delegation — delegation policy (§9)
var delegation_policy_service_1 = require("./delegation/delegation-policy.service");
Object.defineProperty(exports, "getDelegationPolicies", { enumerable: true, get: function () { return delegation_policy_service_1.getDelegationPolicies; } });
Object.defineProperty(exports, "getDelegationPolicyForRole", { enumerable: true, get: function () { return delegation_policy_service_1.getDelegationPolicyForRole; } });
Object.defineProperty(exports, "validateDelegationRequest", { enumerable: true, get: function () { return delegation_policy_service_1.validateDelegationRequest; } });
Object.defineProperty(exports, "evaluateDelegation", { enumerable: true, get: function () { return delegation_policy_service_1.evaluateDelegation; } });
Object.defineProperty(exports, "incrementDailyActions", { enumerable: true, get: function () { return delegation_policy_service_1.incrementDailyActions; } });
Object.defineProperty(exports, "getDelegationRules", { enumerable: true, get: function () { return delegation_policy_service_1.getDelegationRules; } });
Object.defineProperty(exports, "upsertDelegationRule", { enumerable: true, get: function () { return delegation_policy_service_1.upsertDelegationRule; } });
Object.defineProperty(exports, "deleteDelegationRule", { enumerable: true, get: function () { return delegation_policy_service_1.deleteDelegationRule; } });
// Delegation — acting on behalf of (§9, §16)
var acting_on_behalf_of_service_1 = require("./delegation/acting-on-behalf-of.service");
Object.defineProperty(exports, "resolveActingContext", { enumerable: true, get: function () { return acting_on_behalf_of_service_1.resolveActingContext; } });
Object.defineProperty(exports, "evaluateDelegatedAccess", { enumerable: true, get: function () { return acting_on_behalf_of_service_1.evaluateDelegatedAccess; } });
// SoD — policy management (§10)
var sod_policy_service_1 = require("./sod/sod-policy.service");
Object.defineProperty(exports, "getSodPolicies", { enumerable: true, get: function () { return sod_policy_service_1.getSodPolicies; } });
Object.defineProperty(exports, "createSodPolicy", { enumerable: true, get: function () { return sod_policy_service_1.createSodPolicy; } });
Object.defineProperty(exports, "deactivateSodPolicy", { enumerable: true, get: function () { return sod_policy_service_1.deactivateSodPolicy; } });
Object.defineProperty(exports, "grantSodWaiver", { enumerable: true, get: function () { return sod_policy_service_1.grantSodWaiver; } });
// SoD — conflict audit (§10)
var sod_conflict_audit_service_1 = require("./sod/sod-conflict-audit.service");
Object.defineProperty(exports, "detectConflictsForUser", { enumerable: true, get: function () { return sod_conflict_audit_service_1.detectConflictsForUser; } });
Object.defineProperty(exports, "getUnresolvedConflicts", { enumerable: true, get: function () { return sod_conflict_audit_service_1.getUnresolvedConflicts; } });
Object.defineProperty(exports, "resolveConflict", { enumerable: true, get: function () { return sod_conflict_audit_service_1.resolveConflict; } });
Object.defineProperty(exports, "runTenantWideSodAudit", { enumerable: true, get: function () { return sod_conflict_audit_service_1.runTenantWideSodAudit; } });
// Lifecycle — self-approval guard (§10, §11)
var self_approval_guard_1 = require("./lifecycle-auth/self-approval.guard");
Object.defineProperty(exports, "checkSelfApproval", { enumerable: true, get: function () { return self_approval_guard_1.checkSelfApproval; } });
Object.defineProperty(exports, "isSelfApprovalAllowed", { enumerable: true, get: function () { return self_approval_guard_1.isSelfApprovalAllowed; } });
Object.defineProperty(exports, "getEntityCreator", { enumerable: true, get: function () { return self_approval_guard_1.getEntityCreator; } });
// Lifecycle — maker-checker policy (§11)
var maker_checker_policy_service_1 = require("./lifecycle-auth/maker-checker-policy.service");
Object.defineProperty(exports, "getMakerCheckerPolicy", { enumerable: true, get: function () { return maker_checker_policy_service_1.getMakerCheckerPolicy; } });
Object.defineProperty(exports, "submitForChecking", { enumerable: true, get: function () { return maker_checker_policy_service_1.submitForChecking; } });
Object.defineProperty(exports, "approveDecision", { enumerable: true, get: function () { return maker_checker_policy_service_1.approveDecision; } });
Object.defineProperty(exports, "rejectDecision", { enumerable: true, get: function () { return maker_checker_policy_service_1.rejectDecision; } });
Object.defineProperty(exports, "getPendingDecisions", { enumerable: true, get: function () { return maker_checker_policy_service_1.getPendingDecisions; } });
// Audit — security events (§Q)
var security_event_service_1 = require("./audit/security-event.service");
Object.defineProperty(exports, "logSecurityEvent", { enumerable: true, get: function () { return security_event_service_1.logSecurityEvent; } });
Object.defineProperty(exports, "getSecurityEvents", { enumerable: true, get: function () { return security_event_service_1.getSecurityEvents; } });
Object.defineProperty(exports, "getRecentFailedLogins", { enumerable: true, get: function () { return security_event_service_1.getRecentFailedLogins; } });
Object.defineProperty(exports, "getSecurityEventSummary", { enumerable: true, get: function () { return security_event_service_1.getSecurityEventSummary; } });
// Audit — access reviews (§Q)
var access_review_service_1 = require("./audit/access-review.service");
Object.defineProperty(exports, "createAccessReview", { enumerable: true, get: function () { return access_review_service_1.createAccessReview; } });
Object.defineProperty(exports, "completeAccessReview", { enumerable: true, get: function () { return access_review_service_1.completeAccessReview; } });
Object.defineProperty(exports, "getPendingAccessReviews", { enumerable: true, get: function () { return access_review_service_1.getPendingAccessReviews; } });
Object.defineProperty(exports, "getAccessReviewHistory", { enumerable: true, get: function () { return access_review_service_1.getAccessReviewHistory; } });
// Policies — tenant security policy
var tenant_security_policy_service_1 = require("./policies/tenant-security-policy.service");
Object.defineProperty(exports, "getTenantSecurityPolicy", { enumerable: true, get: function () { return tenant_security_policy_service_1.getTenantSecurityPolicy; } });
Object.defineProperty(exports, "updateTenantSecurityPolicy", { enumerable: true, get: function () { return tenant_security_policy_service_1.updateTenantSecurityPolicy; } });
Object.defineProperty(exports, "getSecurityPolicyDefaults", { enumerable: true, get: function () { return tenant_security_policy_service_1.getSecurityPolicyDefaults; } });
// Frontend contracts — access contract serialization (Law 2, Law 4)
var frontend_access_contract_service_1 = require("./frontend-contracts/frontend-access-contract.service");
Object.defineProperty(exports, "buildFrontendAccessContract", { enumerable: true, get: function () { return frontend_access_contract_service_1.buildFrontendAccessContract; } });
Object.defineProperty(exports, "getMinimalAccessContract", { enumerable: true, get: function () { return frontend_access_contract_service_1.getMinimalAccessContract; } });
Object.defineProperty(exports, "getNavigationContract", { enumerable: true, get: function () { return frontend_access_contract_service_1.getNavigationContract; } });
Object.defineProperty(exports, "getPermissionContract", { enumerable: true, get: function () { return frontend_access_contract_service_1.getPermissionContract; } });
Object.defineProperty(exports, "getContractVersion", { enumerable: true, get: function () { return frontend_access_contract_service_1.getContractVersion; } });
Object.defineProperty(exports, "diffAccessContract", { enumerable: true, get: function () { return frontend_access_contract_service_1.diffAccessContract; } });
// Frontend contracts — access snapshot consumption (§17)
var access_snapshot_contract_1 = require("./frontend-contracts/access-snapshot.contract");
Object.defineProperty(exports, "hasPermission", { enumerable: true, get: function () { return access_snapshot_contract_1.hasPermission; } });
Object.defineProperty(exports, "hasRole", { enumerable: true, get: function () { return access_snapshot_contract_1.hasRole; } });
Object.defineProperty(exports, "hasAuthorityFromSnapshot", { enumerable: true, get: function () { return access_snapshot_contract_1.hasAuthority; } });
Object.defineProperty(exports, "getAllowedModules", { enumerable: true, get: function () { return access_snapshot_contract_1.getAllowedModules; } });
Object.defineProperty(exports, "getLandingPage", { enumerable: true, get: function () { return access_snapshot_contract_1.getLandingPage; } });
Object.defineProperty(exports, "isModuleVisible", { enumerable: true, get: function () { return access_snapshot_contract_1.isModuleVisible; } });
Object.defineProperty(exports, "getScopeBindings", { enumerable: true, get: function () { return access_snapshot_contract_1.getScopeBindings; } });
// Registry — module security metadata (§K: dauth/registry/)
var module_security_seeder_registry_1 = require("./registry/module-security-seeder.registry");
Object.defineProperty(exports, "registerModuleSecurity", { enumerable: true, get: function () { return module_security_seeder_registry_1.registerModuleSecurity; } });
Object.defineProperty(exports, "getModuleSecurity", { enumerable: true, get: function () { return module_security_seeder_registry_1.getModuleSecurity; } });
Object.defineProperty(exports, "getAllModuleCodes", { enumerable: true, get: function () { return module_security_seeder_registry_1.getAllModuleCodes; } });
Object.defineProperty(exports, "getSecurityRegistry", { enumerable: true, get: function () { return module_security_seeder_registry_1.getSecurityRegistry; } });
Object.defineProperty(exports, "findPermission", { enumerable: true, get: function () { return module_security_seeder_registry_1.findPermission; } });
Object.defineProperty(exports, "findApprovalRule", { enumerable: true, get: function () { return module_security_seeder_registry_1.findApprovalRule; } });
Object.defineProperty(exports, "findSoDRules", { enumerable: true, get: function () { return module_security_seeder_registry_1.findSoDRules; } });
Object.defineProperty(exports, "getRegistryStats", { enumerable: true, get: function () { return module_security_seeder_registry_1.getRegistryStats; } });
// Access — role-based access control (§7, deprecated — use requirePermission)
var access_resolver_2 = require("./access/access.resolver");
Object.defineProperty(exports, "requireRole", { enumerable: true, get: function () { return access_resolver_2.requireRole; } });
// Access — authorization audit logging (§Q)
var authorization_audit_service_1 = require("./access/authorization-audit.service");
Object.defineProperty(exports, "logAuthorizationAudit", { enumerable: true, get: function () { return authorization_audit_service_1.logAuthorizationAudit; } });
Object.defineProperty(exports, "getAuthorizationAuditLog", { enumerable: true, get: function () { return authorization_audit_service_1.getAuthorizationAuditLog; } });
Object.defineProperty(exports, "logDecision", { enumerable: true, get: function () { return authorization_audit_service_1.logDecision; } });
// Access — role profiles management (§7)
var role_profiles_service_1 = require("./access/role-profiles.service");
Object.defineProperty(exports, "listRoleProfiles", { enumerable: true, get: function () { return role_profiles_service_1.listRoleProfiles; } });
Object.defineProperty(exports, "getRoleProfileById", { enumerable: true, get: function () { return role_profiles_service_1.getRoleProfileById; } });
Object.defineProperty(exports, "createRoleProfile", { enumerable: true, get: function () { return role_profiles_service_1.createRoleProfile; } });
// Access — canonical access service (§7)
var canonical_access_service_1 = require("./access/canonical-access.service");
Object.defineProperty(exports, "resolveCanonicalAccessSnapshot", { enumerable: true, get: function () { return canonical_access_service_1.resolveAccessSnapshot; } });
Object.defineProperty(exports, "invalidateSnapshotCache", { enumerable: true, get: function () { return canonical_access_service_1.invalidateSnapshotCache; } });
Object.defineProperty(exports, "clearSnapshotCache", { enumerable: true, get: function () { return canonical_access_service_1.clearSnapshotCache; } });
// Access — security posture (§Q)
var security_posture_service_1 = require("./access/security-posture.service");
Object.defineProperty(exports, "getLatestSecurityPosture", { enumerable: true, get: function () { return security_posture_service_1.getLatestSecurityPosture; } });
Object.defineProperty(exports, "createSecurityPostureSnapshot", { enumerable: true, get: function () { return security_posture_service_1.createSecurityPostureSnapshot; } });
Object.defineProperty(exports, "listSecurityAttestations", { enumerable: true, get: function () { return security_posture_service_1.listSecurityAttestations; } });
Object.defineProperty(exports, "getEffectiveUserModules", { enumerable: true, get: function () { return security_posture_service_1.getEffectiveUserModules; } });
Object.defineProperty(exports, "getEffectiveUserPermissions", { enumerable: true, get: function () { return security_posture_service_1.getEffectiveUserPermissions; } });
// Scope — external scope adapter (§8, §2.9.3)
var external_scope_adapter_1 = require("./scope/external-scope.adapter");
Object.defineProperty(exports, "resolveExternalScope", { enumerable: true, get: function () { return external_scope_adapter_1.resolveExternalScope; } });
Object.defineProperty(exports, "isWithinExternalScope", { enumerable: true, get: function () { return external_scope_adapter_1.isWithinExternalScope; } });
Object.defineProperty(exports, "hasExternalPermission", { enumerable: true, get: function () { return external_scope_adapter_1.hasExternalPermission; } });
Object.defineProperty(exports, "getExternalEntityIds", { enumerable: true, get: function () { return external_scope_adapter_1.getExternalEntityIds; } });
// Admin — SLA config, escalation policy, runbooks (AS-BUILT §Diagnostics)
__exportStar(require("./admin/dauth-admin.service"), exports);
// Diagnostics — health checks and diagnostics (AS-BUILT §Diagnostics)
__exportStar(require("./diagnostics/dauth-diagnostics.service"), exports);
// Config — centralized DAuth configuration
var dauth_config_2 = require("./dauth.config");
Object.defineProperty(exports, "DAUTH_CONFIG", { enumerable: true, get: function () { return dauth_config_2.DAUTH_CONFIG; } });
// Contracts — DAuth event type constants and payload types
var dauth_events_contract_1 = require("./contracts/dauth-events.contract");
Object.defineProperty(exports, "DAUTH_EVENTS", { enumerable: true, get: function () { return dauth_events_contract_1.DAUTH_EVENTS; } });
// SCIM — user anonymization / GDPR-PDPL data erasure
__exportStar(require("./scim/user-anonymization.service"), exports);
// Events — event subscriber registration (platform bootstrap)
__exportStar(require("./events/dauth.subscribers"), exports);
// Jobs — scheduled background tasks (AS-BUILT §Scheduled Jobs)
var dauth_monitor_job_1 = require("./jobs/dauth-monitor.job");
Object.defineProperty(exports, "cleanupExpiredDelegations", { enumerable: true, get: function () { return dauth_monitor_job_1.cleanupExpiredDelegations; } });
Object.defineProperty(exports, "cleanupExpiredSessions", { enumerable: true, get: function () { return dauth_monitor_job_1.cleanupExpiredSessions; } });
// expireStaleInvitations — already exported from identity/invitation-control.service
Object.defineProperty(exports, "runSodPeriodicScan", { enumerable: true, get: function () { return dauth_monitor_job_1.runSodPeriodicScan; } });
Object.defineProperty(exports, "expireStaleRoleAssignments", { enumerable: true, get: function () { return dauth_monitor_job_1.expireStaleRoleAssignments; } });
Object.defineProperty(exports, "getDauthJobs", { enumerable: true, get: function () { return dauth_monitor_job_1.getDauthJobs; } });
// Re-export canonical secret accessor (throws in production if unset — Law 11)
var token_service_2 = require("./identity/token.service");
Object.defineProperty(exports, "getJwtSecret", { enumerable: true, get: function () { return token_service_2.getJwtSecret; } });
const token_service_3 = require("./identity/token.service");
/** @deprecated Use getJwtSecret() instead. Kept only for backward compat during migration. */
exports.JWT_SECRET = (0, token_service_3.getJwtSecret)();
// Platform-module port binding — `@dos/ports.DAuthPort` is the canonical
// contract other platform modules (DOS, DSOC, DNOC) and products use when
// calling into DAuth. `createDAuthPort()` builds a runtime implementation
// from the canonical DAuth services below.
var dauth_port_impl_1 = require("./dauth-port.impl");
Object.defineProperty(exports, "createDAuthPort", { enumerable: true, get: function () { return dauth_port_impl_1.createDAuthPort; } });
var dauth_port_registry_1 = require("./dauth-port.registry");
Object.defineProperty(exports, "getDAuthPort", { enumerable: true, get: function () { return dauth_port_registry_1.getDAuthPort; } });
Object.defineProperty(exports, "tryGetDAuthPort", { enumerable: true, get: function () { return dauth_port_registry_1.tryGetDAuthPort; } });
Object.defineProperty(exports, "setDAuthPort", { enumerable: true, get: function () { return dauth_port_registry_1.setDAuthPort; } });
Object.defineProperty(exports, "resetDAuthPort", { enumerable: true, get: function () { return dauth_port_registry_1.resetDAuthPort; } });
// DSOC publisher — DAuth emits security/audit events to DSOC via this port.
// Until DSOC exists, the backbone-based implementation publishes on
// `dsoc.audit.*` and `dsoc.alert.*` topics; the DSOC service subscribes there.
var dsoc_port_publisher_1 = require("./audit/dsoc-port.publisher");
Object.defineProperty(exports, "createBackboneDSOCPort", { enumerable: true, get: function () { return dsoc_port_publisher_1.createBackboneDSOCPort; } });
var dsoc_port_registry_1 = require("./audit/dsoc-port.registry");
Object.defineProperty(exports, "getDSOCPort", { enumerable: true, get: function () { return dsoc_port_registry_1.getDSOCPort; } });
Object.defineProperty(exports, "setDSOCPort", { enumerable: true, get: function () { return dsoc_port_registry_1.setDSOCPort; } });
Object.defineProperty(exports, "resetDSOCPort", { enumerable: true, get: function () { return dsoc_port_registry_1.resetDSOCPort; } });
// Canonical publisher used by every DAuth service to emit security events.
// Dual-routes to (a) the legacy event backbone for existing dauth.* subscribers
// and (b) the DSOCPort for the normalized dsoc.audit.* / dsoc.alert.* feed.
// Use this everywhere instead of importing `publish` from
// `@dos/platform-core/events` directly.
var publish_with_dsoc_1 = require("./events/publish-with-dsoc");
Object.defineProperty(exports, "publishDAuthEvent", { enumerable: true, get: function () { return publish_with_dsoc_1.publish; } });
Object.defineProperty(exports, "DAUTH_DSOC_MAP", { enumerable: true, get: function () { return publish_with_dsoc_1.DAUTH_DSOC_MAP; } });
// AI agent tools — buildDAuthAgentTools({ port }) returns 3 typed tools
// (check_access, check_authority, evaluate_sod) that the AI engine
// registers and calls with tenantId injected per-call.
var agent_tools_1 = require("./agent-tools");
Object.defineProperty(exports, "buildDAuthAgentTools", { enumerable: true, get: function () { return agent_tools_1.buildDAuthAgentTools; } });
//# sourceMappingURL=index.js.map