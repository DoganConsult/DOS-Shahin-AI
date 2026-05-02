import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type {} from './express-augment';

export interface AuthMiddleware {
  authenticate: RequestHandler;
  optionalAuthenticate: RequestHandler;
  requirePermission: (permission: string) => RequestHandler;
  requireAnyPermission: (...permissions: string[]) => RequestHandler;
  requireSuperAdmin: RequestHandler;
}

let _authMiddleware: AuthMiddleware | null = null;

export function setAuthMiddleware(middleware: AuthMiddleware): void {
  _authMiddleware = middleware;
}

export function getAuthMiddleware(): AuthMiddleware {
  if (!_authMiddleware) {
    throw new Error('[DOS-AUTH] AuthMiddleware not initialized. Call setAuthMiddleware() during platform startup.');
  }
  return _authMiddleware;
}

export const authenticate: RequestHandler = (req, res, next) => {
  return getAuthMiddleware().authenticate(req, res, next);
};

export const optionalAuthenticate: RequestHandler = (req, res, next) => {
  return getAuthMiddleware().optionalAuthenticate(req, res, next);
};

export function requirePermission(permission: string): RequestHandler {
  return (req, res, next) => getAuthMiddleware().requirePermission(permission)(req, res, next);
}

export function requireAnyPermission(...permissions: string[]): RequestHandler {
  return (req, res, next) => getAuthMiddleware().requireAnyPermission(...permissions)(req, res, next);
}

export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  return getAuthMiddleware().requireSuperAdmin(req, res, next);
};

/**
 * Standalone tenant-ID enforcement — pure request-shape validation.
 * Does not require auth-service; checks req.tenantId or x-tenant-id header.
 */
export function requireTenantId(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.tenantId || req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant context required', code: 'MISSING_TENANT' });
    return;
  }
  req.tenantId = tenantId;
  next();
}
