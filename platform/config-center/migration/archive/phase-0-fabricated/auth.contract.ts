/**
 * Auth Service HTTP Contracts
 * Owner: auth-service (port 4001)
 * Source: extracted from monolith DAuth platform
 */

// --- Request DTOs ---

export interface LoginRequest {
  email: string;
  password: string;
  tenantId?: string;
  mfaCode?: string;
}

export interface ValidateTokenRequest {
  token: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface CreateInvitationRequest {
  email: string;
  tenantId: string;
  roles: string[];
  expiresInHours?: number;
}

// --- Response DTOs ---

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AccessSnapshot {
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  authorities: string[];
  delegations: ActiveDelegation[];
  sodConstraints: SodConstraint[];
  accessProfileId: string;
  issuedAt: string;
  expiresAt: string;
}

export interface ActiveDelegation {
  delegationId: string;
  delegatorId: string;
  permissions: string[];
  expiresAt: string;
}

export interface SodConstraint {
  ruleId: string;
  conflictingPermissions: [string, string];
  resolution: 'deny' | 'approve' | 'audit';
}

// --- Standard Error Response ---

export interface ServiceErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: { service: string; timestamp: string; correlationId?: string };
}

// --- API Route Contracts (enriched per DOS-AIO-Specs Law 5) ---

export const AUTH_API_ROUTES = {
  login: {
    method: 'POST' as const, path: '/api/auth/login',
    contractVersion: 1, ownerService: 'auth-service',
    authMode: 'public' as const, permission: null,
    requestType: 'LoginRequest', responseType: 'TokenResponse',
    emitsEvent: 'dauth.login.succeeded', errorModel: 'ServiceErrorResponse',
  },
  logout: {
    method: 'POST' as const, path: '/api/auth/logout',
    contractVersion: 1, ownerService: 'auth-service',
    authMode: 'authenticated' as const, permission: null,
    requestType: null, responseType: 'void',
    emitsEvent: 'dauth.session.ended', errorModel: 'ServiceErrorResponse',
  },
  refresh: {
    method: 'POST' as const, path: '/api/auth/refresh',
    contractVersion: 1, ownerService: 'auth-service',
    authMode: 'public' as const, permission: null,
    requestType: 'RefreshTokenRequest', responseType: 'TokenResponse',
    emitsEvent: null, errorModel: 'ServiceErrorResponse',
  },
  validate: {
    method: 'POST' as const, path: '/api/auth/validate',
    contractVersion: 1, ownerService: 'auth-service',
    authMode: 'service' as const, permission: null,
    requestType: 'ValidateTokenRequest', responseType: 'AccessSnapshot',
    emitsEvent: null, errorModel: 'ServiceErrorResponse',
  },
  accessSnapshot: {
    method: 'GET' as const, path: '/api/auth/access-snapshot',
    contractVersion: 1, ownerService: 'auth-service',
    authMode: 'authenticated' as const, permission: 'auth:access_snapshot:read',
    requestType: null, responseType: 'AccessSnapshot',
    emitsEvent: null, errorModel: 'ServiceErrorResponse',
  },
  invite: {
    method: 'POST' as const, path: '/api/auth/invitations',
    contractVersion: 1, ownerService: 'auth-service',
    authMode: 'authenticated' as const, permission: 'auth:invitations:create',
    requestType: 'CreateInvitationRequest', responseType: 'StandardMutationResponse',
    emitsEvent: 'dauth.invitation.sent', errorModel: 'ServiceErrorResponse',
  },
  mfaSetup: {
    method: 'POST' as const, path: '/api/auth/mfa/setup',
    contractVersion: 1, ownerService: 'auth-service',
    authMode: 'authenticated' as const, permission: null,
    requestType: null, responseType: 'MfaSetupResponse',
    emitsEvent: 'dauth.mfa.enabled', errorModel: 'ServiceErrorResponse',
  },
  mfaVerify: {
    method: 'POST' as const, path: '/api/auth/mfa/verify',
    contractVersion: 1, ownerService: 'auth-service',
    authMode: 'authenticated' as const, permission: null,
    requestType: 'MfaVerifyRequest', responseType: 'TokenResponse',
    emitsEvent: 'dauth.mfa.verified', errorModel: 'ServiceErrorResponse',
  },
  rbacSeed: {
    method: 'POST' as const, path: '/api/auth/rbac/seed',
    contractVersion: 1, ownerService: 'auth-service',
    authMode: 'service' as const, permission: 'auth:rbac:seed',
    requestType: 'RbacSeedRequest', responseType: 'StandardMutationResponse',
    emitsEvent: 'dauth.access.changed', errorModel: 'ServiceErrorResponse',
  },
} as const;

// --- Additional Request/Response types referenced above ---

export interface MfaSetupResponse { secret: string; qrCodeUrl: string; backupCodes: string[]; }
export interface MfaVerifyRequest { code: string; }
export interface RbacSeedRequest { product: string; roles: Array<{ roleCode: string; permissions: string[] }>; }
