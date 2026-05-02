export declare const AUTH_ERRORS: {
    readonly UNAUTHENTICATED: {
        readonly code: "UNAUTHENTICATED";
        readonly status: 401;
        readonly message: "Not authenticated";
    };
    readonly INVALID_TOKEN: {
        readonly code: "INVALID_TOKEN";
        readonly status: 401;
        readonly message: "Invalid token";
    };
    readonly EXPIRED_TOKEN: {
        readonly code: "EXPIRED_TOKEN";
        readonly status: 401;
        readonly message: "Token expired";
    };
    readonly SESSION_REVOKED: {
        readonly code: "SESSION_REVOKED";
        readonly status: 401;
        readonly message: "Session revoked";
    };
    readonly FORBIDDEN: {
        readonly code: "FORBIDDEN";
        readonly status: 403;
        readonly message: "Access denied";
    };
    readonly TENANT_MEMBERSHIP_MISSING: {
        readonly code: "TENANT_MEMBERSHIP_MISSING";
        readonly status: 403;
        readonly message: "No active tenant membership";
    };
    readonly TENANT_INACTIVE: {
        readonly code: "TENANT_INACTIVE";
        readonly status: 403;
        readonly message: "Tenant not active";
    };
    readonly USER_INACTIVE: {
        readonly code: "USER_INACTIVE";
        readonly status: 403;
        readonly message: "User account inactive";
    };
    readonly SOD_BLOCKED: {
        readonly code: "SOD_BLOCKED";
        readonly status: 403;
        readonly message: "SoD conflict blocks this action";
    };
    readonly SELF_APPROVAL_BLOCKED: {
        readonly code: "SELF_APPROVAL_BLOCKED";
        readonly status: 403;
        readonly message: "Self-approval not permitted";
    };
    readonly LIFECYCLE_DENIED: {
        readonly code: "LIFECYCLE_DENIED";
        readonly status: 403;
        readonly message: "Lifecycle transition denied";
    };
    readonly CLEARANCE_DENIED: {
        readonly code: "CLEARANCE_DENIED";
        readonly status: 403;
        readonly message: "Insufficient clearance level";
    };
    readonly MODULE_NOT_LICENSED: {
        readonly code: "MODULE_NOT_LICENSED";
        readonly status: 403;
        readonly message: "Module not licensed";
    };
    readonly AUTH_ERROR: {
        readonly code: "AUTH_ERROR";
        readonly status: 500;
        readonly message: "Authorization service unavailable";
    };
};
export type AuthErrorCode = keyof typeof AUTH_ERRORS;
export interface AuthErrorBody {
    code: AuthErrorCode;
    status: number;
    message: string;
    timestamp: string;
    correlationId: string;
    detail?: Record<string, unknown>;
}
export interface AuthErrorBase {
    code: AuthErrorCode;
    status: number;
    message: string;
    timestamp: string;
    correlationId: string;
}
export interface UnauthenticatedError extends AuthErrorBase {
    code: 'UNAUTHENTICATED';
    status: 401;
}
export interface ForbiddenError extends AuthErrorBase {
    code: 'FORBIDDEN';
    status: 403;
    requiredPermission?: string;
    requiredRole?: string;
}
export interface TokenExpiredError extends AuthErrorBase {
    code: 'EXPIRED_TOKEN';
    status: 401;
    expiredAt: string;
}
export interface SessionRevokedError extends AuthErrorBase {
    code: 'SESSION_REVOKED';
    status: 401;
    revokedAt: string;
}
export interface TenantInactiveError extends AuthErrorBase {
    code: 'TENANT_INACTIVE';
    status: 403;
    tenantId: string;
    tenantStatus: string;
}
export interface SoDBlockedError extends AuthErrorBase {
    code: 'SOD_BLOCKED';
    status: 403;
    conflictingRoleA: string;
    conflictingRoleB: string;
    ruleId: string;
}
export interface SelfApprovalBlockedError extends AuthErrorBase {
    code: 'SELF_APPROVAL_BLOCKED';
    status: 403;
    entityType: string;
    entityId: string;
}
export interface LifecycleDeniedError extends AuthErrorBase {
    code: 'LIFECYCLE_DENIED';
    status: 403;
    fromState: string;
    toState: string;
    failedCheck: string;
}
export interface ClearanceDeniedError extends AuthErrorBase {
    code: 'CLEARANCE_DENIED';
    status: 403;
    requiredLevel: string;
    currentLevel: string;
}
export interface ModuleNotLicensedError extends AuthErrorBase {
    code: 'MODULE_NOT_LICENSED';
    status: 403;
    moduleCode: string;
}
export interface InvalidTokenError extends AuthErrorBase {
    code: 'INVALID_TOKEN';
    status: 401;
}
export interface UserInactiveError extends AuthErrorBase {
    code: 'USER_INACTIVE';
    status: 403;
    userId: string;
}
export interface TenantMembershipMissingError extends AuthErrorBase {
    code: 'TENANT_MEMBERSHIP_MISSING';
    status: 403;
    tenantId: string;
}
export interface AuthServiceError extends AuthErrorBase {
    code: 'AUTH_ERROR';
    status: 500;
}
export type AuthErrorResponse = UnauthenticatedError | InvalidTokenError | ForbiddenError | TokenExpiredError | SessionRevokedError | TenantInactiveError | TenantMembershipMissingError | UserInactiveError | SoDBlockedError | SelfApprovalBlockedError | LifecycleDeniedError | ClearanceDeniedError | ModuleNotLicensedError | AuthServiceError;
export declare function buildAuthError(code: AuthErrorCode, correlationId?: string, detail?: Record<string, unknown>): AuthErrorBody;
