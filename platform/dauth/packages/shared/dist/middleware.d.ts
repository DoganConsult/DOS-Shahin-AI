import type { Request, Response, NextFunction, RequestHandler } from 'express';
export interface AuthMiddleware {
    authenticate: RequestHandler;
    optionalAuthenticate: RequestHandler;
    requirePermission: (permission: string) => RequestHandler;
    requireAnyPermission: (...permissions: string[]) => RequestHandler;
    requireSuperAdmin: RequestHandler;
}
export declare function setAuthMiddleware(middleware: AuthMiddleware): void;
export declare function getAuthMiddleware(): AuthMiddleware;
export declare const authenticate: RequestHandler;
export declare const optionalAuthenticate: RequestHandler;
export declare function requirePermission(permission: string): RequestHandler;
export declare function requireAnyPermission(...permissions: string[]): RequestHandler;
export declare const requireSuperAdmin: RequestHandler;
/**
 * Standalone tenant-ID enforcement — pure request-shape validation.
 * Does not require auth-service; checks req.tenantId or x-tenant-id header.
 */
export declare function requireTenantId(req: Request, res: Response, next: NextFunction): void;
/**
 * External auth guard for scoped JWT sessions (vendor portals, regulator portals, etc).
 * Verifies a scoped JWT whose `role` must be one of `allowedRoles`. Sets `req.externalScope`.
 *
 * Canonical location for the DAuth external-scope pattern. Mirrors
 * services/auth-service/src/middleware/session.middleware.ts so modules and
 * other services can import it from @dos/auth/middleware without reaching into
 * a service package.
 */
export declare function externalAuthGuard(allowedRoles: string[]): RequestHandler;
export { requireDauth, requireOwnershipOf, type RequireDauthOptions, type RequireOwnershipOptions, } from './canonical-middleware';
/**
 * Scope guard — ensures the external scope from externalAuthGuard matches
 * the requested entity id (e.g., req.params.id equals scope.entityId).
 */
export declare function scopeGuard(paramName?: string): RequestHandler;
