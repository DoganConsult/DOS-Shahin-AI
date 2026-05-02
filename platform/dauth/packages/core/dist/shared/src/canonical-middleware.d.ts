/**
 * Canonical JWT authentication middleware — extracted from
 * services/auth-service/src/middleware/session.middleware.ts.
 *
 * Factory function that creates an AuthMiddleware implementation
 * using local JWT verification (no HTTP round-trip to auth-service).
 *
 * Verification routing:
 *   1. Default path — resolve the TokenVerifier stack from
 *      `@dos/auth/token-verifier-factory`. Under `DAUTH_KEYCLOAK_ENFORCE=true`
 *      this places the Keycloak RS256 verifier as primary; otherwise the
 *      native HS256 verifier remains primary.
 *   2. Fallback path — when the factory has not been initialised yet
 *      (bootstrap race: service-bootstrap wires this middleware before
 *      `bootstrapDauth` runs) OR when the factory explicitly throws,
 *      drop to raw `jsonwebtoken.verify(token, getSecret())` with HS256.
 *   3. Legacy-token kill-switch — when `DAUTH_ACCEPT_NATIVE_HS256=false` AND
 *      the verified token's header `alg` is HS256 AND `DAUTH_KEYCLOAK_ENFORCE=true`,
 *      reject the request with 401 `LEGACY_TOKEN_REJECTED` even though the
 *      signature verified. This is the mechanism by which we cut over to
 *      Keycloak-only RS256 tokens without waiting for every DAuth-issued
 *      session to expire.
 *
 * Law 1: One canonical service per concern.
 */
import type { RequestHandler } from 'express';
import type { AuthMiddleware } from './middleware';
export interface CanonicalMiddlewareOptions {
    /**
     * Override JWT secret resolution.  Defaults to process.env.JWT_SECRET
     * with a dev-only fallback of 'dev-secret'.
     */
    getSecret?: () => string;
    /**
     * Optional blacklist checker — returns true when JTI is revoked.
     * When omitted the middleware skips blacklist checking (suitable
     * for services without DB access to the token_blacklist table).
     */
    isBlacklisted?: (jti: string) => Promise<boolean>;
}
export declare function createCanonicalAuthMiddleware(opts?: CanonicalMiddlewareOptions): AuthMiddleware;
export interface RequireDauthOptions {
    /** Permission code, e.g. 'risk.record.approve' */
    permission: string;
    /** Module bucket — used by ABAC and entitlement checks. */
    moduleCode?: string;
    /** Entity type the action targets, e.g. 'risk', 'policy', 'invoice'. */
    entityType?: string;
    /**
     * Path-param name carrying the entity id. The middleware reads
     * `req.params[entityIdParam]` at request time. If unset, no entity id is
     * forwarded to the evaluator.
     */
    entityIdParam?: string;
    /** Authority tier required (e.g. 'L2', 'manager'). */
    authorityRequired?: string;
    /** Lifecycle transition `from` state. */
    lifecycleFromState?: string;
    /** Lifecycle transition `to` state. */
    lifecycleToState?: string;
    /** Free-form ABAC attributes — merged onto the evaluation context. */
    attributes?: Record<string, unknown>;
}
/**
 * `requireDauth(...)` — explicit-context authorization middleware.
 *
 * Usage:
 *   router.post('/policies/:id/approve',
 *     authenticate,
 *     requireTenantId,
 *     requireDauth({
 *       permission: 'policy.record.approve',
 *       moduleCode: 'policy',
 *       entityType: 'policy',
 *       entityIdParam: 'id',
 *       lifecycleFromState: 'submitted',
 *       lifecycleToState: 'approved',
 *       authorityRequired: 'L2',
 *     }),
 *     handler);
 *
 * The evaluator port resolves at request time, so services that load
 * dauth-core get the full 14-step pipeline; services that don't get the
 * legacy fallback. Same fail-closed behavior as `requirePermission`.
 */
export declare function requireDauth(opts: RequireDauthOptions): RequestHandler;
export interface RequireOwnershipOptions {
    permission: string;
    entityType: string;
    entityIdParam: string;
    moduleCode?: string;
}
/**
 * `requireOwnershipOf(...)` — convenience wrapper that pre-fills
 * `ownershipRequired: true` so the evaluator's ABAC step enforces
 * actor-must-own-entity. The native evaluator reads ownership from
 * `dos.ownership_mappings` (Foundation) and the entity's owner column.
 */
export declare function requireOwnershipOf(opts: RequireOwnershipOptions): RequestHandler;
