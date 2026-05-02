/**
 * DAuth Session Middleware — single canonical auth middleware.
 * Replaces deleted middleware/auth.ts authenticate/optionalAuthenticate.
 *
 * Law 1: One canonical service per concern.
 * Law 9: Organized by concern (dauth/), not implementation pattern.
 */
import { Request, Response, NextFunction } from 'express';
export type { AuthPayload } from '../identity/token.service';
/**
 * Check if a token JTI is blacklisted (revoked).
 * Delegates to platform token-blacklist service. Fail-closed if unavailable (Law 11).
 * Exported for test injection.
 */
export declare let checkBlacklist: (jti: string) => Promise<boolean>;
/** Override blacklist checker (for testing only). */
export declare function _setBlacklistChecker(fn: (jti: string) => Promise<boolean>): void;
/**
 * JWT authentication middleware.
 * Verifies Bearer token, checks blacklist, enforces tenant isolation.
 */
export declare function authenticate(req: Request, res: Response, next: NextFunction): Promise<void>;
/** Backward-compatible alias */
export declare const authenticateToken: typeof authenticate;
/**
 * Optional auth: if Bearer present, verify and set user/tenantId; otherwise pass through.
 * Use for routes that work both authenticated and unauthenticated.
 * Revoked tokens are rejected even on optional routes to prevent replay attacks.
 */
export declare function optionalAuthenticate(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * External auth guard for scoped JWT sessions (vendor portals, regulator portals).
 * Verifies a scoped JWT whose `role` must be one of `allowedRoles`.
 * Sets `req.externalScope` with { tenantId, entityType, entityId, role, permissions }.
 */
export declare function externalAuthGuard(allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Scope guard middleware — ensures the external scope matches
 * the requested entity (e.g., organization param matches scope entityId).
 */
export declare function scopeGuard(paramName?: string): (req: Request, res: Response, next: NextFunction) => void;
