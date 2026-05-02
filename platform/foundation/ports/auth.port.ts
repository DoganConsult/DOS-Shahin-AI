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

const passthrough: RequestHandler = (_req, _res, next) => next();
const passthroughFactory = (..._args: unknown[]): RequestHandler => passthrough;

export const authPort: AuthPort = {
  authenticate: passthrough,
  optionalAuthenticate: passthrough,
  requirePermission: passthroughFactory,
  requireAnyPermission: passthroughFactory,
  requireAllPermissions: passthroughFactory,
  requireSuperAdmin: passthrough,
  requireTenantId: passthrough,
};

export function bindAuthPort(impl: Partial<AuthPort>): void {
  Object.assign(authPort, impl);
}

export const authenticate: RequestHandler = (req, res, next) =>
  authPort.authenticate(req, res, next);
export const optionalAuthenticate: RequestHandler = (req, res, next) =>
  authPort.optionalAuthenticate(req, res, next);
export const requirePermission = (...perms: (string | string[])[]): RequestHandler =>
  authPort.requirePermission(...perms);
export const requireAnyPermission = (...perms: (string | string[])[]): RequestHandler =>
  authPort.requireAnyPermission(...perms);
export const requireAllPermissions = (...perms: (string | string[])[]): RequestHandler =>
  authPort.requireAllPermissions(...perms);
export const requireSuperAdmin: RequestHandler = (req, res, next) =>
  authPort.requireSuperAdmin(req, res, next);
export const requireTenantId: RequestHandler = (req, res, next) =>
  authPort.requireTenantId(req, res, next);
