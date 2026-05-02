import type { PrincipalType } from '../identity/identity.service';

export interface SessionCreateRequest {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  rememberMe?: boolean;
  permissions?: string[];
  roles?: string[];
  language?: string;
  departmentId?: string;
  meta?: { ipAddress?: string; userAgent?: string };
}

export interface SessionTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  tenantId: string;
  principalType: PrincipalType;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastActivityAt: string;
  status: 'active' | 'expired' | 'revoked' | 'locked';
}

/**
 * TokenPayload — canonical decoded JWT payload shape.
 * Must stay aligned with AuthPayload in identity/token.service.ts.
 * All fields present in AuthPayload that affect runtime decisions are included here.
 */
export interface TokenPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  role_code?: string;
  jti: string;
  principalType?: PrincipalType;
  permissions?: string[];
  roles?: string[];
  is_super_admin?: boolean;
  mustChangePassword?: boolean;
  language?: string;
  departmentId?: string;
  name?: string;
  role_profile?: string;
  archetypes?: string[];
  orgUnitIds?: string[];
  iat: number;
  exp: number;
}

export interface RefreshRequest {
  refreshToken?: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RevocationRequest {
  userId: string;
  jti?: string;
  reason: string;
  revokedBy: string;
}

export interface RevocationResult {
  tokensRevoked: number;
  familiesRevoked: number;
}
