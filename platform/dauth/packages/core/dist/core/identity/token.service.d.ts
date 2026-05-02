import type { PrincipalType } from './identity.service';
export interface AuthPayload {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
    role_code?: string;
    is_super_admin?: boolean;
    permissions?: string[];
    jti?: string;
    language?: string;
    departmentId?: string;
    name?: string;
    role_profile?: string;
    roles?: string[];
    archetypes?: string[];
    orgUnitIds?: string[];
    mustChangePassword?: boolean;
    principalType?: PrincipalType;
    actorId?: string;
    scopes?: string[];
}
export type { PrincipalType } from './identity.service';
export interface GenerateTokenOptions {
    expiresIn?: string;
}
export declare function resolveAccessTokenTtl(principalType?: PrincipalType): string;
export declare function getJwtSecret(): string;
export declare function generateAccessToken(payload: AuthPayload, opts?: GenerateTokenOptions): string;
export declare function verifyAccessToken(token: string): AuthPayload;
/**
 * Async token verification that flows through the TokenVerifier port.
 * Enables Keycloak shadow/enforce mode without forcing every call site to
 * become async. Shadow mismatches are logged but do not affect the returned
 * payload — the decision ledger records divergences separately via the
 * decision-engine shadow-run path.
 *
 * New code should prefer this over `verifyAccessToken`.
 */
export declare function verifyAccessTokenViaPort(token: string): Promise<AuthPayload>;
export declare function decodeTokenUnsafe(token: string): {
    jti?: string;
    exp?: number;
    iat?: number;
} | null;
export declare function getAccessTokenExpirySeconds(principalType?: PrincipalType): number;
export declare function generateRefreshToken(userId: string, tenantId: string, rememberMe?: boolean): string;
export declare function verifyRefreshToken(token: string): {
    userId: string;
    tenantId: string;
    jti?: string;
} | null;
import type { Response } from 'express';
export declare function setRefreshTokenCookie(res: Response, refreshToken: string, rememberMe?: boolean): void;
export declare function clearRefreshTokenCookie(res: Response): void;
