/**
 * Auth adapter — thin re-export from @dos/auth canonical middleware.
 * The bootstrap wires the canonical JWT middleware automatically via
 * setAuthMiddleware(). All services share the same verification logic:
 * local jwt.verify + DB blacklist check + tenant isolation.
 */
export { authenticate, optionalAuthenticate, requirePermission, requireAnyPermission, requireSuperAdmin, requireTenantId, requireDauth, requireOwnershipOf } from '@dos/dauth-shared';
export type { RequireDauthOptions, RequireOwnershipOptions } from '@dos/dauth-shared';
