export const AUTH_ERRORS = {
  UNAUTHENTICATED: { code: 'UNAUTHENTICATED', status: 401, message: 'Not authenticated' },
  INVALID_TOKEN: { code: 'INVALID_TOKEN', status: 401, message: 'Invalid token' },
  EXPIRED_TOKEN: { code: 'EXPIRED_TOKEN', status: 401, message: 'Token expired' },
  SESSION_REVOKED: { code: 'SESSION_REVOKED', status: 401, message: 'Session revoked' },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403, message: 'Access denied' },
  TENANT_MEMBERSHIP_MISSING: { code: 'TENANT_MEMBERSHIP_MISSING', status: 403, message: 'No active tenant membership' },
  TENANT_INACTIVE: { code: 'TENANT_INACTIVE', status: 403, message: 'Tenant not active' },
  USER_INACTIVE: { code: 'USER_INACTIVE', status: 403, message: 'User account inactive' },
  SOD_BLOCKED: { code: 'SOD_BLOCKED', status: 403, message: 'SoD conflict blocks this action' },
  SELF_APPROVAL_BLOCKED: { code: 'SELF_APPROVAL_BLOCKED', status: 403, message: 'Self-approval not permitted' },
  LIFECYCLE_DENIED: { code: 'LIFECYCLE_DENIED', status: 403, message: 'Lifecycle transition denied' },
  CLEARANCE_DENIED: { code: 'CLEARANCE_DENIED', status: 403, message: 'Insufficient clearance level' },
  MODULE_NOT_LICENSED: { code: 'MODULE_NOT_LICENSED', status: 403, message: 'Module not licensed' },
  AUTH_ERROR: { code: 'AUTH_ERROR', status: 500, message: 'Authorization service unavailable' },
} as const;

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

export type AuthErrorResponse =
  | UnauthenticatedError
  | InvalidTokenError
  | ForbiddenError
  | TokenExpiredError
  | SessionRevokedError
  | TenantInactiveError
  | TenantMembershipMissingError
  | UserInactiveError
  | SoDBlockedError
  | SelfApprovalBlockedError
  | LifecycleDeniedError
  | ClearanceDeniedError
  | ModuleNotLicensedError
  | AuthServiceError;

function createCorrelationId(): string {
  return `auth-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function buildAuthError(
  code: AuthErrorCode,
  correlationId?: string,
  detail?: Record<string, unknown>,
): AuthErrorBody {
  const entry = AUTH_ERRORS[code];
  return {
    code,
    status: entry.status,
    message: entry.message,
    timestamp: new Date().toISOString(),
    correlationId: correlationId ?? createCorrelationId(),
    ...(detail ? { detail } : {}),
  };
}
