// Guards
export { authGuard, grcAuthGuard } from './guards/grc-auth.guard';
export { adminGuard, grcAdminGuard } from './guards/grc-admin.guard';
export { roleGuard, grcRoleGuard } from './guards/grc-role.guard';
export { onboardingGuard } from '../../guards/onboarding.guard';
export { moduleAccessGuard } from './guards/module-access.guard';

// Interceptors
export { authInterceptor, grcAuthInterceptor } from './interceptors/grc-auth.interceptor';
export { csrfInterceptor } from './interceptors/csrf.interceptor';
export { CsrfTokenService } from './csrf/csrf-token.service';
export { SessionHealthService } from './csrf/session-health.service';
export type { SessionHealthState } from './csrf/session-health.service';

// Services
export { SessionService } from './session/session.service';
export type { SessionData } from './session/session.service';
export { AccessStore } from './access/access.store';
export type { ScopeBinding, UserPermissions } from './access/access.store';
export { AuthAuditService } from './audit/auth-audit.service';
export { enterprisePermissionGuard } from './guards/enterprise-permission.guard';

// Contracts
export { AccessSnapshot, hasPermission, hasRole, isModuleAllowed } from './contracts/access-snapshot.model';

// Directives
export { HasPermissionDirective } from './directives/has-permission.directive';

// MFA
export { MfaService } from './mfa/mfa.service';
export type { MfaMethodContract, MfaEnrollmentContract, MfaChallengeContract } from './mfa/mfa.contracts';

// Delegation
export { DelegationService } from './delegation/delegation.service';
export type { DelegationContract, DelegationRequestContract, DelegationScopeContract } from './delegation/delegation.contracts';

// Separation of Duties
export { SodService } from './sod/sod.service';
export type { SodRuleContract, SodViolationContract, SodCheckResultContract } from './sod/sod.contracts';

// Authority
export { AuthorityService } from './authority/authority.service';
export type { AuthorityContract, AuthorityCheckContract, AuthorityDecisionContract } from './authority/authority.contracts';

// Scope
export { ScopeService } from './scope/scope.service';
export type { ScopeAssignmentContract, ScopeResolutionContract } from './scope/scope.contracts';

// Lifecycle Auth
export { LifecycleAuthService } from './lifecycle/lifecycle-auth.service';
export type { LifecycleAuthRequestContract, LifecycleAuthDecisionContract } from './lifecycle/lifecycle-auth.contracts';

// DAuth REST client (1:1 with @dos/ports/dauth via /api/dauth/port/v1/*).
export { DAuthHttpClient } from './services/dauth-http.client';

// UI components.
export { DauthAccessInspectorComponent } from './components/access-inspector/dauth-access-inspector.component';
