/**
 * Foundation auth port — pure module-local contract.
 * No external/vendor imports. Host wires the real impl via
 * `infrastructure/auth.adapter.ts#bindDauthShared(impl)`.
 *
 * Defaults are no-op middleware that pass through, so the module
 * typechecks and boots standalone (host is expected to bind real auth
 * before mounting routes in production).
 */
import type { RequestHandler } from 'express';
export interface AuthPort {
    authenticate: RequestHandler;
    optionalAuthenticate: RequestHandler;
    requirePermission: (...perms: (string | string[])[]) => RequestHandler;
    requireAnyPermission: (...perms: (string | string[])[]) => RequestHandler;
    requireAllPermissions: (...perms: (string | string[])[]) => RequestHandler;
    requireSuperAdmin: RequestHandler;
    requireTenantId: RequestHandler;
}
export declare const authPort: AuthPort;
export declare function bindAuthPort(impl: Partial<AuthPort>): void;
export declare const authenticate: RequestHandler;
export declare const optionalAuthenticate: RequestHandler;
export declare const requirePermission: (...perms: (string | string[])[]) => RequestHandler;
export declare const requireAnyPermission: (...perms: (string | string[])[]) => RequestHandler;
export declare const requireAllPermissions: (...perms: (string | string[])[]) => RequestHandler;
export declare const requireSuperAdmin: RequestHandler;
export declare const requireTenantId: RequestHandler;
