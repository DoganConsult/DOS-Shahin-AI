export declare const USER_ERRORS: {
    readonly USER_NOT_FOUND: {
        readonly code: "USER_NOT_FOUND";
        readonly status: 404;
        readonly message: "User not found";
    };
    readonly USER_EMAIL_DUPLICATE: {
        readonly code: "USER_EMAIL_DUPLICATE";
        readonly status: 409;
        readonly message: "Email already in use";
    };
    readonly USER_INACTIVE: {
        readonly code: "USER_INACTIVE";
        readonly status: 410;
        readonly message: "User account inactive";
    };
    readonly UNAUTHORIZED_PROFILE_UPDATE: {
        readonly code: "UNAUTHORIZED_PROFILE_UPDATE";
        readonly status: 403;
        readonly message: "Not allowed to modify this profile";
    };
    readonly ROLE_NOT_FOUND: {
        readonly code: "ROLE_NOT_FOUND";
        readonly status: 404;
        readonly message: "Role not found";
    };
    readonly ROLE_ALREADY_ASSIGNED: {
        readonly code: "ROLE_ALREADY_ASSIGNED";
        readonly status: 409;
        readonly message: "Role already assigned";
    };
    readonly ROLE_ASSIGNMENT_NOT_FOUND: {
        readonly code: "ROLE_ASSIGNMENT_NOT_FOUND";
        readonly status: 404;
        readonly message: "Role assignment not found";
    };
    readonly TEAM_NOT_FOUND: {
        readonly code: "TEAM_NOT_FOUND";
        readonly status: 404;
        readonly message: "Team not found";
    };
    readonly TEAM_CODE_DUPLICATE: {
        readonly code: "TEAM_CODE_DUPLICATE";
        readonly status: 409;
        readonly message: "Team code already in use";
    };
    readonly TEAM_MEMBER_NOT_FOUND: {
        readonly code: "TEAM_MEMBER_NOT_FOUND";
        readonly status: 404;
        readonly message: "Team member not found";
    };
    readonly TEAM_MEMBER_DUPLICATE: {
        readonly code: "TEAM_MEMBER_DUPLICATE";
        readonly status: 409;
        readonly message: "User already in team";
    };
    readonly DEPARTMENT_NOT_FOUND: {
        readonly code: "DEPARTMENT_NOT_FOUND";
        readonly status: 404;
        readonly message: "Department not found";
    };
    readonly DEPARTMENT_CYCLE: {
        readonly code: "DEPARTMENT_CYCLE";
        readonly status: 409;
        readonly message: "Department hierarchy cycle";
    };
    readonly VIEW_PREF_NOT_FOUND: {
        readonly code: "VIEW_PREF_NOT_FOUND";
        readonly status: 404;
        readonly message: "View preference not found";
    };
    readonly VIEW_PREF_INVALID_KEY: {
        readonly code: "VIEW_PREF_INVALID_KEY";
        readonly status: 400;
        readonly message: "Invalid module or view key";
    };
    readonly VIEW_PREF_CONFIG_TOO_LARGE: {
        readonly code: "VIEW_PREF_CONFIG_TOO_LARGE";
        readonly status: 413;
        readonly message: "Configuration exceeds size limit";
    };
    readonly VIEW_PREF_SHARE_FORBIDDEN: {
        readonly code: "VIEW_PREF_SHARE_FORBIDDEN";
        readonly status: 403;
        readonly message: "Not allowed to share view preference";
    };
    readonly FOUNDATION_ENTITY_NOT_FOUND: {
        readonly code: "FOUNDATION_ENTITY_NOT_FOUND";
        readonly status: 404;
        readonly message: "Foundation entity not found";
    };
    readonly FOUNDATION_ENTITY_CONFLICT: {
        readonly code: "FOUNDATION_ENTITY_CONFLICT";
        readonly status: 409;
        readonly message: "Foundation entity conflict";
    };
    readonly VALIDATION_FAILED: {
        readonly code: "VALIDATION_FAILED";
        readonly status: 400;
        readonly message: "Validation failed";
    };
    readonly TENANT_CONTEXT_MISSING: {
        readonly code: "TENANT_CONTEXT_MISSING";
        readonly status: 400;
        readonly message: "Tenant context required";
    };
    readonly INTERNAL_ERROR: {
        readonly code: "INTERNAL_ERROR";
        readonly status: 500;
        readonly message: "Internal error";
    };
};
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
export declare class UserServiceError extends Error {
    readonly code: UserErrorCode;
    readonly status: number;
    readonly detail?: Record<string, unknown>;
    readonly correlationId: string;
    readonly timestamp: string;
    constructor(code: UserErrorCode, correlationId?: string, detail?: Record<string, unknown>);
    toJSON(): UserErrorBody;
}
export declare function buildUserError(code: UserErrorCode, correlationId?: string, detail?: Record<string, unknown>): UserErrorBody;
export declare function throwUserError(code: UserErrorCode, correlationId?: string, detail?: Record<string, unknown>): never;
