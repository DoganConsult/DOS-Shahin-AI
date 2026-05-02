/**
 * user-service canonical error codes. Shape mirrors auth-service/domain/contracts/auth-errors.ts
 * so downstream clients get a consistent envelope.
 */
import { randomUUID } from 'node:crypto';

export const USER_ERRORS = {
  USER_NOT_FOUND:              { code: 'USER_NOT_FOUND',              status: 404, message: 'User not found' },
  USER_EMAIL_DUPLICATE:        { code: 'USER_EMAIL_DUPLICATE',        status: 409, message: 'Email already in use' },
  USER_INACTIVE:               { code: 'USER_INACTIVE',               status: 410, message: 'User account inactive' },
  UNAUTHORIZED_PROFILE_UPDATE: { code: 'UNAUTHORIZED_PROFILE_UPDATE', status: 403, message: 'Not allowed to modify this profile' },

  ROLE_NOT_FOUND:              { code: 'ROLE_NOT_FOUND',              status: 404, message: 'Role not found' },
  ROLE_ALREADY_ASSIGNED:       { code: 'ROLE_ALREADY_ASSIGNED',       status: 409, message: 'Role already assigned' },
  ROLE_ASSIGNMENT_NOT_FOUND:   { code: 'ROLE_ASSIGNMENT_NOT_FOUND',   status: 404, message: 'Role assignment not found' },

  TEAM_NOT_FOUND:              { code: 'TEAM_NOT_FOUND',              status: 404, message: 'Team not found' },
  TEAM_CODE_DUPLICATE:         { code: 'TEAM_CODE_DUPLICATE',         status: 409, message: 'Team code already in use' },
  TEAM_MEMBER_NOT_FOUND:       { code: 'TEAM_MEMBER_NOT_FOUND',       status: 404, message: 'Team member not found' },
  TEAM_MEMBER_DUPLICATE:       { code: 'TEAM_MEMBER_DUPLICATE',       status: 409, message: 'User already in team' },

  DEPARTMENT_NOT_FOUND:        { code: 'DEPARTMENT_NOT_FOUND',        status: 404, message: 'Department not found' },
  DEPARTMENT_CYCLE:            { code: 'DEPARTMENT_CYCLE',            status: 409, message: 'Department hierarchy cycle' },

  VIEW_PREF_NOT_FOUND:         { code: 'VIEW_PREF_NOT_FOUND',         status: 404, message: 'View preference not found' },
  VIEW_PREF_INVALID_KEY:       { code: 'VIEW_PREF_INVALID_KEY',       status: 400, message: 'Invalid module or view key' },
  VIEW_PREF_CONFIG_TOO_LARGE:  { code: 'VIEW_PREF_CONFIG_TOO_LARGE',  status: 413, message: 'Configuration exceeds size limit' },
  VIEW_PREF_SHARE_FORBIDDEN:   { code: 'VIEW_PREF_SHARE_FORBIDDEN',   status: 403, message: 'Not allowed to share view preference' },

  FOUNDATION_ENTITY_NOT_FOUND: { code: 'FOUNDATION_ENTITY_NOT_FOUND', status: 404, message: 'Foundation entity not found' },
  FOUNDATION_ENTITY_CONFLICT:  { code: 'FOUNDATION_ENTITY_CONFLICT',  status: 409, message: 'Foundation entity conflict' },

  VALIDATION_FAILED:           { code: 'VALIDATION_FAILED',           status: 400, message: 'Validation failed' },
  TENANT_CONTEXT_MISSING:      { code: 'TENANT_CONTEXT_MISSING',      status: 400, message: 'Tenant context required' },
  INTERNAL_ERROR:              { code: 'INTERNAL_ERROR',              status: 500, message: 'Internal error' },
} as const;

export type UserErrorCode = keyof typeof USER_ERRORS;

export interface UserErrorBody {
  code: UserErrorCode;
  status: number;
  message: string;
  timestamp: string;
  correlationId: string;
  detail?: Record<string, unknown>;
}

/**
 * Error object that route handlers can throw. The bootstrap error handler
 * serializes `{ code, status, message, correlationId, detail }` back to the client.
 */
export class UserServiceError extends Error {
  public readonly code: UserErrorCode;
  public readonly status: number;
  public readonly detail?: Record<string, unknown>;
  public readonly correlationId: string;
  public readonly timestamp: string;

  constructor(code: UserErrorCode, correlationId?: string, detail?: Record<string, unknown>) {
    const entry = USER_ERRORS[code];
    super(entry.message);
    this.name = 'UserServiceError';
    this.code = code;
    this.status = entry.status;
    this.detail = detail;
    this.correlationId = correlationId ?? randomUUID();
    this.timestamp = new Date().toISOString();
  }

  toJSON(): UserErrorBody {
    return {
      code: this.code,
      status: this.status,
      message: this.message,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      ...(this.detail ? { detail: this.detail } : {}),
    };
  }
}

export function buildUserError(
  code: UserErrorCode,
  correlationId?: string,
  detail?: Record<string, unknown>,
): UserErrorBody {
  return new UserServiceError(code, correlationId, detail).toJSON();
}

export function throwUserError(
  code: UserErrorCode,
  correlationId?: string,
  detail?: Record<string, unknown>,
): never {
  throw new UserServiceError(code, correlationId, detail);
}
