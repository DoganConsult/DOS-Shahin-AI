import type { PrincipalIdentity, PrincipalType } from './identity.service';
/**
 * Resolve a full principal identity from user ID and tenant ID.
 * Validates tenant membership and returns null if user is not a member.
 */
export declare function resolvePrincipal(userId: string, tenantId: string): Promise<PrincipalIdentity | null>;
/**
 * Extract principal from a JWT access token.
 * Verifies the token signature, then resolves the full principal from the database.
 * Throws 'INVALID_TOKEN' if the token is invalid or principal cannot be resolved.
 */
export declare function resolvePrincipalFromToken(token: string): Promise<PrincipalIdentity>;
/**
 * Extract principal from a session ID.
 * Looks up the session in the sessions table, then resolves the full principal.
 * Throws 'SESSION_NOT_FOUND' if session does not exist or is revoked/expired.
 */
export declare function resolvePrincipalFromSession(sessionId: string): Promise<PrincipalIdentity>;
/**
 * Enrich a principal with optional fields such as roles, permissions, scopes, and authorities.
 * Supported enrichment keys: 'roles', 'permissions', 'scopes', 'authorities', 'accessProfiles'.
 * Returns a new object with the enrichment data attached.
 */
export declare function enrichPrincipal(principal: PrincipalIdentity, enrichments: string[]): Promise<PrincipalIdentity & {
    roles?: string[];
    permissions?: string[];
    scopes?: Array<{
        scopeType: string;
        scopeId: string;
        roleCode: string;
    }>;
    authorities?: string[];
    accessProfiles?: string[];
}>;
/**
 * Get full principal context including actor type, memberships, and status.
 * Returns a comprehensive context object suitable for authorization decisions.
 */
export declare function getPrincipalContext(userId: string, tenantId: string): Promise<{
    principal: PrincipalIdentity;
    memberships: Array<{
        tenantId: string;
        role: string;
        membershipType: string;
        status: string;
    }>;
    actorType: PrincipalType;
    isSuperAdmin: boolean;
    activeTenantCount: number;
} | null>;
/**
 * Validate that a principal is active and not locked.
 * Returns true only if the principal exists, has 'active' status,
 * and has an active tenant membership.
 */
export declare function validatePrincipal(principal: PrincipalIdentity): Promise<boolean>;
/**
 * Cache a resolved principal with an optional TTL.
 * Uses in-memory cache keyed by tenantId:userId.
 */
export declare function cachePrincipal(principal: PrincipalIdentity, ttlSeconds?: number): void;
/**
 * Invalidate the cached principal for a specific user+tenant pair.
 * Should be called when a user's identity, roles, or memberships change.
 */
export declare function invalidatePrincipalCache(userId: string, tenantId: string): void;
