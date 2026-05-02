/**
 * DAuth Contract — Auth Error Response Shapes
 *
 * Typed interfaces for every canonical auth error code defined in auth-errors.ts.
 * Each interface carries the error code as a string literal for discriminated unions.
 *
 * Consumers can use AuthErrorResponse as a union type for exhaustive error handling.
 */
import type { AuthErrorCode } from './auth-errors';
/** Base shape shared by all auth error responses. */
export interface AuthErrorBase {
    code: AuthErrorCode;
    status: number;
    message: string;
    timestamp: string;
    correlationId: string;
}
/** 401 — No valid session or token provided. */
export interface UnauthenticatedError extends AuthErrorBase {
    code: 'UNAUTHENTICATED';
    status: 401;
}
/** 403 — Authenticated but lacks required permission. */
export interface ForbiddenError extends AuthErrorBase {
    code: 'FORBIDDEN';
    status: 403;
    requiredPermission?: string;
    requiredRole?: string;
}
/** 401 — Access token has expired. */
export interface TokenExpiredError extends AuthErrorBase {
    code: 'EXPIRED_TOKEN';
    status: 401;
    expiredAt: string;
}
/** 401 — Session was explicitly revoked. */
export interface SessionRevokedError extends AuthErrorBase {
    code: 'SESSION_REVOKED';
    status: 401;
    revokedAt: string;
}
/** 403 — Tenant is suspended or deactivated. */
export interface TenantInactiveError extends AuthErrorBase {
    code: 'TENANT_INACTIVE';
    status: 403;
    tenantId: string;
    tenantStatus: string;
}
/** 403 — Separation of Duties conflict blocks the action. */
export interface SoDBlockedError extends AuthErrorBase {
    code: 'SOD_BLOCKED';
    status: 403;
    conflictingRoleA: string;
    conflictingRoleB: string;
    ruleId: string;
}
/** 403 — Self-approval prevention triggered. */
export interface SelfApprovalBlockedError extends AuthErrorBase {
    code: 'SELF_APPROVAL_BLOCKED';
    status: 403;
    entityType: string;
    entityId: string;
}
/** 403 — Lifecycle state transition denied. */
export interface LifecycleDeniedError extends AuthErrorBase {
    code: 'LIFECYCLE_DENIED';
    status: 403;
    fromState: string;
    toState: string;
    failedCheck: string;
}
/** 403 — Insufficient clearance level for the requested resource. */
export interface ClearanceDeniedError extends AuthErrorBase {
    code: 'CLEARANCE_DENIED';
    status: 403;
    requiredLevel: string;
    currentLevel: string;
}
/** 403 — Insufficient authority level for the requested action. */
export interface AuthorityInsufficientError extends AuthErrorBase {
    code: 'AUTHORITY_INSUFFICIENT';
    status: 403;
    requiredAuthority: string;
    currentAuthority?: string;
}
/** 403 — Delegation is invalid, expired, or out of scope. */
export interface DelegationInvalidError extends AuthErrorBase {
    code: 'DELEGATION_INVALID';
    status: 403;
    delegationId?: string;
    reason: string;
}
/** 403 — Module is not licensed for this tenant. */
export interface ModuleNotLicensedError extends AuthErrorBase {
    code: 'MODULE_NOT_LICENSED';
    status: 403;
    moduleCode: string;
}
/** 401 — Token signature invalid or malformed. */
export interface InvalidTokenError extends AuthErrorBase {
    code: 'INVALID_TOKEN';
    status: 401;
}
/** 403 — User account is inactive or disabled. */
export interface UserInactiveError extends AuthErrorBase {
    code: 'USER_INACTIVE';
    status: 403;
    userId: string;
}
/** 403 — User has no active membership in the tenant. */
export interface TenantMembershipMissingError extends AuthErrorBase {
    code: 'TENANT_MEMBERSHIP_MISSING';
    status: 403;
    tenantId: string;
}
/** 500 — Authorization subsystem unavailable. */
export interface AuthServiceError extends AuthErrorBase {
    code: 'AUTH_ERROR';
    status: 500;
}
/** Discriminated union of all typed auth error responses. */
export type AuthErrorResponse = UnauthenticatedError | InvalidTokenError | ForbiddenError | TokenExpiredError | SessionRevokedError | TenantInactiveError | TenantMembershipMissingError | UserInactiveError | SoDBlockedError | SelfApprovalBlockedError | LifecycleDeniedError | AuthorityInsufficientError | DelegationInvalidError | ClearanceDeniedError | ModuleNotLicensedError | AuthServiceError;
