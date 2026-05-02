export type { AccessDecisionContext, AccessDecision, AuthPayload, SodCheckResult, SodViolation, DelegationGrant } from '@dos/contracts';

import type { RequestHandler } from 'express';

export interface AuthMiddleware {
  authenticate: RequestHandler;
  optionalAuthenticate: RequestHandler;
  requirePermission: (permission: string) => RequestHandler;
  requireAnyPermission: (...permissions: string[]) => RequestHandler;
  requireSuperAdmin: RequestHandler;
}

// globalThis singleton — survives pnpm dual-instance module resolution
const GLOBAL_SDK_AUTH_KEY = Symbol.for('__dos_sdk_auth_middleware__');

export function setAuthMiddleware(middleware: AuthMiddleware): void {
  (globalThis as any)[GLOBAL_SDK_AUTH_KEY] = middleware;
}

export function getAuthMiddleware(): AuthMiddleware {
  const mw = (globalThis as any)[GLOBAL_SDK_AUTH_KEY] as AuthMiddleware | undefined;
  if (!mw) {
    throw new Error('[DOS-SDK] AuthMiddleware not initialized. Call setAuthMiddleware() during platform startup.');
  }
  return mw;
}

export const authenticate: RequestHandler = (req, res, next) => getAuthMiddleware().authenticate(req, res, next);

export const optionalAuthenticate: RequestHandler = (req, res, next) => getAuthMiddleware().optionalAuthenticate(req, res, next);

export function requirePermission(permission: string): RequestHandler {
  return getAuthMiddleware().requirePermission(permission);
}

export function requireAnyPermission(...permissions: string[]): RequestHandler {
  return getAuthMiddleware().requireAnyPermission(...permissions);
}

export const requireSuperAdmin: RequestHandler = (req, res, next) => getAuthMiddleware().requireSuperAdmin(req, res, next);
