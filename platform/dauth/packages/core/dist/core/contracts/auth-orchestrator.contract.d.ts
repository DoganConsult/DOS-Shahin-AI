/**
 * Auth orchestrator contract — login/MFA/session flow response shapes.
 * Defines the HTTP response structures for POST /login, POST /mfa/verify, etc.
 */
import type { AccessSnapshot } from './access-snapshot.types';
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
