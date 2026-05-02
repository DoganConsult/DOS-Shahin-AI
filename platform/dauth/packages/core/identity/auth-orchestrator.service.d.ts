import type { AccessSnapshot } from '../contracts/access-snapshot.types';
export interface AuthenticatedUser {
    user_id: string;
    email: string;
    tenant_id: string;
    role: string;
    name: string;
    status: string;
    onboarding_complete: boolean;
    member_onboarded: boolean;
    is_super_admin: boolean;
    must_change_password: boolean;
}
export interface LoginTokens {
    accessToken: string;
    refreshToken: string;
    accessJti: string | undefined;
}
export interface LoginResponsePayload {
    token: string;
    userId: string;
    tenantId: string;
    role: string;
    roles: string[];
    onboardingComplete: boolean;
    memberOnboarded: boolean;
    orgName: string;
    userName: string;
    isSuperAdmin: boolean;
    defaultLandingPage: string;
    roleModules: string[];
    dashboardWidgets: string[];
    _moduleAuthority: string;
    enterpriseAuthz: AccessSnapshot | null;
    sessionId: string | null;
    sessionIdleTimeoutMinutes?: number;
    tenantMemberships?: Array<{
        tenantId: string;
        role: string;
        isPrimary: boolean;
        orgName: string;
    }>;
}
export interface MfaChallengeResponse {
    mfaRequired: true;
    mfaType: string;
    userId: string;
    message: string;
}
/**
 * Look up user by email, verify password with bcrypt.
 * Returns user row or null if credentials are invalid.
 * Does NOT record login attempts — caller handles that based on result.
 */
export declare function authenticateCredentials(email: string, password: string): Promise<AuthenticatedUser | null>;
/**
 * Look up a user by email without verifying password.
 * Used for anti-enumeration: we need to know if user exists to record failed attempts.
 */
export declare function lookupUserByEmail(email: string): Promise<AuthenticatedUser | null>;
/**
 * Query roles from tenant schema for a user. Falls back to the user's base role.
 */
export declare function resolveUserRoles(userId: string, tenantId: string, fallbackRole: string): Promise<string[]>;
/**
 * Resolve a single effective role (first from roles list).
 */
export declare function resolveUserRole(userId: string, tenantId: string, fallbackRole: string): Promise<string>;
/**
 * Generate access + refresh tokens, persist session, register JTI.
 * Returns the token pair and the access JTI.
 */
export declare function issueLoginTokens(user: {
    user_id: string;
    email: string;
    tenant_id: string;
    is_super_admin: boolean;
}, effectiveRole: string, rememberMe: boolean, ip: string, userAgent: string): Promise<LoginTokens>;
/**
 * Build the standard login response object.
 * All deprecated fields are preserved for backward compatibility.
 */
export declare function buildLoginResponse(user: {
    user_id: string;
    tenant_id: string;
    name: string;
    onboarding_complete: boolean;
    member_onboarded: boolean;
    is_super_admin: boolean;
}, token: string, allRoles: string[], effectiveRole: string, enterpriseAuthz: AccessSnapshot | null, sessionId: string | null, orgName: string, tenantMemberships: Array<{
    tenantId: string;
    role: string;
    isPrimary: boolean;
    orgName: string;
}>, sessionIdleTimeoutMinutes?: number): LoginResponsePayload;
/**
 * Create an MFA challenge for a user with MFA enabled.
 * For email MFA, generates a code (caller is responsible for sending it).
 * Returns the MFA challenge response and the email code (if email MFA).
 */
export declare function handleMfaChallenge(user: {
    user_id: string;
    email: string;
    tenant_id: string;
    name: string;
}, mfaRecord: {
    mfa_type: string;
    enabled: boolean;
}): Promise<{
    response: MfaChallengeResponse;
    emailCode?: string;
}>;
/**
 * After MFA verification, fetch user, resolve roles, issue tokens, build response.
 * MFA code verification itself is done by the caller (route handler) since it
 * needs access to auth-enhanced.service verifyTOTP which is a product-layer function.
 *
 * This function handles the post-verification flow:
 * look up user, check status, resolve roles, fetch context, issue tokens, build response.
 */
export declare function completeMfaLogin(userId: string, rememberMe: boolean, ip: string, userAgent: string): Promise<{
    user: AuthenticatedUser;
    tokens: LoginTokens;
    allRoles: string[];
    effectiveRole: string;
    orgName: string;
    tenantMemberships: Array<{
        tenantId: string;
        role: string;
        isPrimary: boolean;
        orgName: string;
    }>;
    enterpriseAuthz: AccessSnapshot | null;
    sessionId: string | null;
} | null>;
/**
 * Validate current password, enforce password policy, hash new password, update DB, issue new tokens.
 */
export declare function changePassword(userId: string, tenantId: string, currentPassword: string, newPassword: string, minLength: number, bcryptRounds: number): Promise<{
    success: true;
    token: string;
} | {
    success: false;
    error: string;
    statusCode: number;
}>;
/**
 * Resolve organization name from tenant ID.
 */
export declare function resolveOrgName(tenantId: string): Promise<string>;
export declare function resolveLoginBootstrapData(tenantId: string, userId: string, onboardingComplete: boolean): Promise<{
    orgName: string;
    tenantMemberships: Array<{
        tenantId: string;
        role: string;
        isPrimary: boolean;
        orgName: string;
    }>;
    enterpriseAuthz: AccessSnapshot | null;
    sessionId: string | null;
}>;
/**
 * Resolve tenant memberships for multi-tenant users.
 */
export declare function resolveTenantMemberships(userId: string): Promise<Array<{
    tenantId: string;
    role: string;
    isPrimary: boolean;
    orgName: string;
}>>;
/**
 * Resolve enterprise authorization snapshot for a user.
 */
export declare function resolveEnterpriseAuthz(tenantId: string, userId: string): Promise<AccessSnapshot | null>;
/**
 * Resolve an active onboarding session ID for incomplete onboarding.
 */
export declare function resolveOnboardingSessionId(userId: string, onboardingComplete: boolean): Promise<string | null>;
/**
 * Check if MFA is enabled for a user. Returns the MFA record or null.
 */
export declare function checkMfaEnabled(userId: string): Promise<{
    mfa_type: string;
    enabled: boolean;
} | null>;
/**
 * Update last login timestamp and increment login count.
 */
export declare function recordLoginTimestamp(email: string): Promise<void>;
/**
 * Check user account status. Returns null if OK, or the status string if blocked.
 */
export declare function checkAccountStatus(status: string): 'suspended' | 'inactive' | null;
/**
 * Build must-change-password response (temporary token, no full login).
 */
export declare function buildMustChangePasswordResponse(user: {
    user_id: string;
    email: string;
    tenant_id: string;
    role: string;
}): {
    mustChangePassword: true;
    token: string;
    userId: string;
    tenantId: string;
    role: string;
    message: string;
};
export declare function emitLoginSuccess(tenantId: string, userId: string, ip: string, mfa: boolean): Promise<void>;
export declare function emitLoginFailure(tenantId: string | null, email: string, ip: string, reason: string): Promise<void>;
export declare function emitRegistration(tenantId: string, userId: string, email: string): Promise<void>;
