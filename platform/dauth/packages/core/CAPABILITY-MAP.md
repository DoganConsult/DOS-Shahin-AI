# DAuth Capability Map

Canonical inventory of the DAuth control plane. Every row answers:
- **What** capability is here
- **Where** it lives (files / functions)
- **Who backs it** (native DAuth logic vs. external engine under a port)
- **How it is called** (public API / middleware / subscriber)

Update this file whenever a new service, port, or adapter lands under
`platform/dauth/packages/core/`. Ordering matches the directory layout.

> **Path correction (DAuth Session 1):** Earlier drafts pointed to
> `platform/core/current-source/dauth/`. The canonical home is
> `platform/dauth/packages/core/` — all relative links in this document
> resolve from there.

## 1 · Entry points

| API | File | Role |
|---|---|---|
| `can(input)` | [access/can.service.ts](access/can.service.ts) | **Single unified authorization entrypoint.** All new call sites use this. Returns `{ allowed, decisionId, reasonCodes, obligations, policyVersion, modelVersion }`. |
| `evaluateAccess(ctx)` | [access/decision-engine.ts](access/decision-engine.ts) | The 14-step pipeline itself. `can()` wraps this. Public export kept for tests + legacy call sites. |
| `authenticate(req, res, next)` | [middleware/session.middleware.ts](middleware/session.middleware.ts) | Express middleware — verifies JWT, sets `req.user`. |
| `requirePermission(code)` | [access/access.resolver.ts](access/access.resolver.ts) | Legacy permission guard — kept for migration, delegates to the engine internally. |

## 2 · Ports (standardized adapter interfaces)

All ports live under [ports/](ports/). Two adapters minimum each: `native/` (default) and one external engine.

| Port | Interface | Native backing | External engine |
|---|---|---|---|
| `TokenVerifier` | [ports/token-verifier.port.ts](ports/token-verifier.port.ts) | HS256 via [identity/token.service.ts](identity/token.service.ts) | Keycloak JWKS (RS256) |
| `IdentityAdapter` | [ports/identity.port.ts](ports/identity.port.ts) | [identity/iam-integration.service.ts](identity/iam-integration.service.ts) | Keycloak SCIM / Admin API |
| `AbacAdapter` | [ports/abac.port.ts](ports/abac.port.ts) | [sod/sod-engine.ts](sod/sod-engine.ts) + [lifecycle-auth/lifecycle-auth.service.ts](lifecycle-auth/lifecycle-auth.service.ts) + [policies/tenant-security-policy.service.ts](policies/tenant-security-policy.service.ts) | Cerbos PDP / OPA |
| `RebacAdapter` | [ports/rebac.port.ts](ports/rebac.port.ts) | [scope/scope-resolver.ts](scope/scope-resolver.ts) + scope/\*.adapter.ts | OpenFGA |
| `SecretsAdapter` | [ports/secrets.port.ts](ports/secrets.port.ts) | `process.env` | Vault / Azure KV / SOPS |

## 3 · Identity

| Capability | File | Functions |
|---|---|---|
| Login orchestration | [identity/auth-orchestrator.service.ts](identity/auth-orchestrator.service.ts) | `authenticateCredentials`, `issueLoginTokens`, `buildLoginResponse`, `handleMfaChallenge`, `completeMfaLogin`, `changePassword`, `resolveTenantMemberships`, `resolveEnterpriseAuthz`, `resolveLoginBootstrapData`, `emitLogin*` (21 fns) |
| JWT management | [identity/token.service.ts](identity/token.service.ts) | `generateAccessToken`, `verifyAccessToken`, `decodeTokenUnsafe`, `getAccessTokenExpirySeconds`, `generateRefreshToken`, `verifyRefreshToken`, `setRefreshTokenCookie`, `clearRefreshTokenCookie`, `resolveAccessTokenTtl` |
| Identity CRUD | [identity/identity.service.ts](identity/identity.service.ts) | `resolvePrincipalMinimal`, `resolvePrincipalByEmail`, `validateTenantMembership`, `isPrincipalActive`, `updateLastLogin`, `createIdentity` |
| Principal resolution | [identity/principal-resolution.service.ts](identity/principal-resolution.service.ts) | `resolvePrincipal`, `resolvePrincipalFromToken`, `resolvePrincipalFromSession`, `enrichPrincipal`, `getPrincipalContext`, `validatePrincipal`, `cachePrincipal`, `invalidatePrincipalCache` |
| External IAM | [identity/iam-integration.service.ts](identity/iam-integration.service.ts) | `listIamConnections`, `createIamConnection`, `linkIamIdentity`, `logIamSync` — **Keycloak adapter mount point** |
| Password policy | [identity/password-policy.ts](identity/password-policy.ts) | `validatePasswordPolicy`, `enforcePasswordExpiry` |
| Credential recovery | [identity/credential-recovery.service.ts](identity/credential-recovery.service.ts) | `requestPasswordReset`, `validateResetToken`, `completePasswordReset`, `requestEmailVerification`, `verifyEmail` |
| Invitation control | [identity/invitation-control.service.ts](identity/invitation-control.service.ts) | `createInvitation`, `validateInvitation`, `acceptInvitation`, `revokeInvitation`, `getPendingInvitations`, `expireStaleInvitations` |
| Login protection | [identity/login-protection.service.ts](identity/login-protection.service.ts) | `recordFailedAttempt`, `recordSuccessfulLogin`, `lockAccount`, `unlockAccount`, `isAccountLocked`, `getFailedAttemptCount` |

## 4 · Session

| Capability | File | Functions |
|---|---|---|
| Session lifecycle | [session/session.service.ts](session/session.service.ts) | `createSession`, `refreshSession`, `destroySession`, `isSessionValid` |
| Refresh family (replay-attack detection) | [session/refresh.service.ts](session/refresh.service.ts) | `createRefreshFamily`, `rotateRefreshToken`, `revokeRefreshFamily`, `revokeAllFamiliesForUser`, `getActiveFamily`, `detectReplayAttack`, `cleanupExpiredFamilies` |
| Token blacklist | [session/token-blacklist.service.ts](session/token-blacklist.service.ts) | `blacklistToken`, `isTokenBlacklisted`, `registerActiveJtiForUser`, `removeActiveJtiForUser`, `revokeAllUserTokens` |
| Selective revocation | [session/revocation.service.ts](session/revocation.service.ts) | `revokeSession`, `revokeAllUserSessions`, `revokeSessionsByTenant` |
| Session context | [session/session-context.service.ts](session/session-context.service.ts) | `getSessionContext`, `recordSessionActivity`, `createSessionRecord`, `getActiveSessionsForUser`, `terminateExpiredSessions` |

## 5 · Access

| Capability | File | Functions |
|---|---|---|
| 14-step decision engine | [access/decision-engine.ts](access/decision-engine.ts) | `evaluateAccess`, `invalidatePermissionCache` |
| Unified can() API | [access/can.service.ts](access/can.service.ts) | `can` |
| Canonical snapshot | [access/canonical-access.service.ts](access/canonical-access.service.ts) | `resolveAccessSnapshot`, `invalidateSnapshotCache`, `clearSnapshotCache`, `getCachedBootstrapData` |
| Permissions CRUD | [access/permission.service.ts](access/permission.service.ts) | `validatePermissionFormat`, `getPermissions`, `getPermission`, `createPermission`, `deactivatePermission`, `getPermissionsByRole`, `assignPermissionToRole`, `revokePermissionFromRole` |
| Functional roles | [access/functional-role.service.ts](access/functional-role.service.ts) | `getFunctionalRoles`, `getFunctionalRole`, `createFunctionalRole`, `deactivateFunctionalRole`, `getRolePermissions` |
| Role assignments | [access/role-assignment.service.ts](access/role-assignment.service.ts) | `assignRole`, `revokeRole`, `getUserRoleAssignments`, `getRoleAssignmentsByRole`, `expireStaleAssignments` |
| Access profiles | [access/access-profile.service.ts](access/access-profile.service.ts) | `getAccessProfiles`, `getAccessProfile`, `assignAccessProfile`, `revokeAccessProfile`, `getUserAccessProfiles` |
| Dynamic RBAC | [access/rbac/dynamic-rbac.service.ts](access/rbac/dynamic-rbac.service.ts) | `getActivationRules`, `getEffectivePermissions`, `getActiveRolesForUser` |
| RBAC seeding | [access/rbac/seed-rbac-data.ts](access/rbac/seed-rbac-data.ts) | `seedDynamicRbacData` |
| RBAC bridge | [access/rbac/auth-system-bridge.service.ts](access/rbac/auth-system-bridge.service.ts) | `syncPermissionsToAccessProfiles`, `reconcileRbacOnModuleUpdate` |
| Authorization matrix | [access/authorization-matrix.service.ts](access/authorization-matrix.service.ts) | `can` (legacy — now superseded by access/can.service.ts; kept for back-compat) |
| Access snapshot | [access/access-snapshot.service.ts](access/access-snapshot.service.ts) | `getAccessSnapshot`, `provisionAccessFromRole`, `canPerform` |
| Authorization audit | [access/authorization-audit.service.ts](access/authorization-audit.service.ts) | `logAuthorizationAudit`, `getAuthorizationAuditLog`, `logDecision` |
| Security posture | [access/security-posture.service.ts](access/security-posture.service.ts) | `getLatestSecurityPosture`, `createSecurityPostureSnapshot`, `listSecurityAttestations`, `getEffectiveUserModules`, `getEffectiveUserPermissions` |

## 6 · Scope

| Capability | File | Functions |
|---|---|---|
| Resolver | [scope/scope-resolver.ts](scope/scope-resolver.ts) | `resolveUserScope`, `resolveFullHierarchy`, `resolveScopeFromPosition`, `isWithinScope`, `mergeScopes` |
| Org adapter | [scope/org-scope.adapter.ts](scope/org-scope.adapter.ts) | `resolveOrgScope`, `expandOrgScope`, `expandOrgScopeFlat`, `isWithinOrgScope`, `getAllOrganizations`, `resolveOrgHierarchyGraph` |
| Team adapter | [scope/team-scope.adapter.ts](scope/team-scope.adapter.ts) | `resolveTeamScope`, `resolveTeamMembership`, `getTeamMembers`, `expandTeamScope`, `isWithinTeamScope`, `getTeamDepartment`, `getTeamsByDepartment` |
| Position adapter | [scope/position-scope.adapter.ts](scope/position-scope.adapter.ts) | `resolvePositionScope`, `getPositionHierarchy`, `getSubordinatePositions`, `isWithinPositionScope`, `getPositionDepartment`, `getPositionsByDepartment`, `getReportsToPosition` |
| Ownership adapter | [scope/ownership-scope.adapter.ts](scope/ownership-scope.adapter.ts) | `resolveOwnershipScope`, `isEntityOwner`, `isPrimaryOwner`, `getEntityOwners`, `getOwnedEntityIds`, `assignControlOwnership`, `assignRiskOwnership`, `revokeControlOwnership`, `revokeRiskOwnership` |
| External adapter | [scope/external-scope.adapter.ts](scope/external-scope.adapter.ts) | `resolveExternalScope`, `isWithinExternalScope`, `hasExternalPermission`, `getExternalEntityIds` |

## 7 · Authority

| Capability | File | Functions |
|---|---|---|
| Authority resolver | [authority/authority-resolver.ts](authority/authority-resolver.ts) | `getUserAuthorityLevel`, `hasAuthority`, `getAuthorityChain`, `getAuthorityLevels`, `resolveApprovalChain`, `hasAnyAuthority` |
| Decision authority | [authority/decision-authority.service.ts](authority/decision-authority.service.ts) | `getUserDecisionAuthorities`, `grantDecisionAuthority`, `revokeDecisionAuthority`, `hasDecisionAuthority` |
| Sign-off authority | [authority/sign-off-authority.service.ts](authority/sign-off-authority.service.ts) | `getSignOffRequirements`, `canSignOff`, `recordSignOff` |
| Approval matrix | [authority/approval-matrix.service.ts](authority/approval-matrix.service.ts) | `getApprovalRules`, `getApprovalRule`, `getRequiredApprovers`, `createApprovalRule`, `deactivateApprovalRule`, `isApprovalRequired` |

## 8 · SoD

| Capability | File | Functions |
|---|---|---|
| SoD engine | [sod/sod-engine.ts](sod/sod-engine.ts) | `evaluateSod`, `evaluateModuleSod`, `evaluateModuleSodFromDefinitions`, `preventSelfApproval` |
| SoD policy CRUD | [sod/sod-policy.service.ts](sod/sod-policy.service.ts) | `getSodPolicies`, `createSodPolicy`, `deactivateSodPolicy`, `grantSodWaiver` |
| Conflict audit | [sod/sod-conflict-audit.service.ts](sod/sod-conflict-audit.service.ts) | `detectConflictsForUser`, `getUnresolvedConflicts`, `resolveConflict`, `runTenantWideSodAudit` |
| Agent SoD | [sod/agent-sod-engine.ts](sod/agent-sod-engine.ts) | `evaluateAgentSod`, `validateAgentSodCompliance` |

## 9 · Lifecycle

| Capability | File | Functions |
|---|---|---|
| Transition auth | [lifecycle-auth/lifecycle-auth.service.ts](lifecycle-auth/lifecycle-auth.service.ts) | `evaluateLifecycleTransition` |
| Maker-checker | [lifecycle-auth/maker-checker-policy.service.ts](lifecycle-auth/maker-checker-policy.service.ts) | `getMakerCheckerPolicy`, `submitForChecking`, `approveDecision`, `rejectDecision`, `getPendingDecisions` |
| Self-approval guard | [lifecycle-auth/self-approval.guard.ts](lifecycle-auth/self-approval.guard.ts) | `checkSelfApproval`, `isSelfApprovalAllowed`, `getEntityCreator` |

## 10 · Delegation

| Capability | File | Functions |
|---|---|---|
| Core delegation (28 fns) | [delegation/delegation.service.ts](delegation/delegation.service.ts) | `registerDelegationScope`, `registerActionScopeMapping`, `getScopeRequiredPermissions`, `getActionScope`, `createDelegationGrant`, `revokeDelegationGrant`, `validateDelegation`, `generateDelegatedToken`, `requireExplicitGrant`, `executeDelegatedAction`, `recordDelegatedAction`, `getActiveGrants`, `getDelegationHistory`, `listDelegations`, `getDelegationById`, `createDelegation`, `requestDelegation`, `approveDelegation`, `rejectDelegation`, `updateDelegation`, `revokeDelegation`, `getExpiringDelegations`, `getActiveDelegationsForUser`, `detectAuthorityConflicts`, `listAuthorityLevels`, `upsertAuthorityLevel`, `expireOverdueDelegations` |
| Delegation policy | [delegation/delegation-policy.service.ts](delegation/delegation-policy.service.ts) | `getDelegationPolicies`, `getDelegationPolicyForRole`, `validateDelegationRequest`, `evaluateDelegation`, `incrementDailyActions`, `getDelegationRules`, `upsertDelegationRule`, `deleteDelegationRule` |
| Delegation automation | [delegation/delegation-automation.service.ts](delegation/delegation-automation.service.ts) | `processOooDelegations`, `delegateWithCompetencyCheck`, `enforceDelegationPolicy` |
| Acting on behalf of | [delegation/acting-on-behalf-of.service.ts](delegation/acting-on-behalf-of.service.ts) | `resolveActingContext`, `evaluateDelegatedAccess` |

## 11 · MFA / CSRF / Actor / Admin / Agents

| Capability | File | Functions |
|---|---|---|
| MFA | [mfa/mfa.service.ts](mfa/mfa.service.ts) | `getMfaStatus`, `isMfaRequired`, `generateEmailCode`, `createEmailChallenge`, `verifyEmailChallenge`, `enableMfa`, `disableMfa`, `enableTotp`, `verifyTotp` |
| CSRF policy | [csrf/csrf-policy.service.ts](csrf/csrf-policy.service.ts) | `getCsrfPolicy`, `updateCsrfPolicy`, `getCsrfPolicyDefaults` |
| CSRF audit | [csrf/csrf-audit.service.ts](csrf/csrf-audit.service.ts) | `logCsrfViolation`, `getCsrfAuditLog` |
| CSRF diagnostics | [csrf/csrf-diagnostics.service.ts](csrf/csrf-diagnostics.service.ts) | `getCsrfDiagnostics` |
| CSRF cleanup job | [csrf/csrf-cleanup.job.ts](csrf/csrf-cleanup.job.ts) | `cleanupExpiredCsrfTokens` |
| Agent credentials | [actor/agent-credentials.service.ts](actor/agent-credentials.service.ts) | `issueAgentCredential`, `verifyAgentCredential`, `revokeAgentCredential`, `listAgentCredentials`, `rotateAgentCredential` |
| Actor registry | [actor/actor-registry.ts](actor/actor-registry.ts) | `getActor`, `registerActor` |
| Admin config | [admin/dauth-admin.service.ts](admin/dauth-admin.service.ts) | `getDauthSlaConfig`, `updateDauthSlaConfig`, `getDauthEscalationPolicy`, `getDauthRunbookLinks`, `getDauthAdminOverview` |
| AI-aware SoD | [agents/policies/agent-sod-delegation.service.ts](agents/policies/agent-sod-delegation.service.ts) | `validateAgentSodComplianceOnDelegation`, `evaluateAgentSodRisk` |

## 12 · Audit / Policies / Registry

| Capability | File | Functions |
|---|---|---|
| Decision ledger | [audit/decision-log.service.ts](audit/decision-log.service.ts) | `logAuthDecision`, `queryDecisionLog`, `getDecisionsByCorrelation`, `getDecisionSummary`, `getRecentDenials` |
| Security events | [audit/security-event.service.ts](audit/security-event.service.ts) | `logSecurityEvent`, `getSecurityEvents`, `getRecentFailedLogins`, `getSecurityEventSummary` |
| Access reviews | [audit/access-review.service.ts](audit/access-review.service.ts) | `createAccessReview`, `completeAccessReview`, `getPendingAccessReviews`, `getAccessReviewHistory` |
| Tenant security policy | [policies/tenant-security-policy.service.ts](policies/tenant-security-policy.service.ts) | `getTenantSecurityPolicy`, `updateTenantSecurityPolicy`, `getSecurityPolicyDefaults` |
| Module security registry | [registry/module-security-seeder.registry.ts](registry/module-security-seeder.registry.ts) | `registerModuleSecurity`, `getModuleSecurity`, `getAllModuleCodes`, `getSecurityRegistry`, `findPermission`, `findApprovalRule`, `findSoDRules`, `getRegistryStats` |

## 13 · Diagnostics / Jobs / Frontend contracts

| Capability | File | Functions |
|---|---|---|
| Diagnostics | [diagnostics/dauth-diagnostics.service.ts](diagnostics/dauth-diagnostics.service.ts) | `runDauthDiagnostics`, `explainDecision`, `getDauthHealthSummary` |
| Scheduled jobs | [jobs/dauth-monitor.job.ts](jobs/dauth-monitor.job.ts) | `cleanupExpiredDelegations`, `cleanupExpiredSessions`, `runSodPeriodicScan`, `expireStaleRoleAssignments`, `getDauthJobs` |
| Frontend contract | [frontend-contracts/frontend-access-contract.service.ts](frontend-contracts/frontend-access-contract.service.ts) | `buildFrontendAccessContract`, `getMinimalAccessContract`, `getNavigationContract`, `getPermissionContract`, `getContractVersion`, `diffAccessContract` |
| Snapshot contract helpers | [frontend-contracts/access-snapshot.contract.ts](frontend-contracts/access-snapshot.contract.ts) | `hasPermission`, `hasRole`, `hasAuthority`, `getAllowedModules`, `getLandingPage`, `isModuleVisible`, `getScopeBindings` |

## 14 · Events / Contracts

| Capability | File | Functions |
|---|---|---|
| DAuth event type constants | [contracts/dauth-events.contract.ts](contracts/dauth-events.contract.ts) | `DAUTH_EVENTS` |
| Reason code catalog | [contracts/reason-codes.ts](contracts/reason-codes.ts) | `DAUTH_REASON_CODES`, `reasonCodeForStep`, `isAllowCode`, `isDenyCode`, `isAbstainCode` |
| Subscribers | [events/dauth.subscribers.ts](events/dauth.subscribers.ts) | `registerDauthSubscribers` |

---

## What stays inside DAuth forever

Even after Keycloak + Cerbos + OpenFGA + Vault are wired:

1. `can()` / `evaluateAccess` — the final allow/deny is always DAuth's.
2. Tenant membership validation (`validateTenantMembership`).
3. `activeModules` / entitlement logic — commercial surface.
4. Onboarding state.
5. Workflow state integration.
6. AI quota/permission/data-sensitivity guards.
7. Decision reason codes.
8. Frontend access contract.
9. RLS context setting (`app.current_tenant_id`, `app.current_user_id`, `app.is_platform_admin`).
10. Business-action audit semantics.
