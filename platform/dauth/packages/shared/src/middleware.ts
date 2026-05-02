import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { resolveJwtSigningSecret } from '@dos/platform-core';
import type {} from './express-augment';

export interface AuthMiddleware {
  authenticate: RequestHandler;
  optionalAuthenticate: RequestHandler;
  requirePermission: (permission: string) => RequestHandler;
  requireAnyPermission: (...permissions: string[]) => RequestHandler;
  requireSuperAdmin: RequestHandler;
}

// Use globalThis to survive pnpm dual-instance module resolution.
// When the bootstrap package and service code resolve @dos/auth to
// different physical paths, each gets its own module-scoped variables.
// globalThis ensures a single shared slot regardless of resolution path.
const GLOBAL_AUTH_KEY = Symbol.for('__dos_auth_middleware__');

export function setAuthMiddleware(middleware: AuthMiddleware): void {
  (globalThis as any)[GLOBAL_AUTH_KEY] = middleware;
}

export function getAuthMiddleware(): AuthMiddleware {
  const mw = (globalThis as any)[GLOBAL_AUTH_KEY] as AuthMiddleware | undefined;
  if (!mw) {
    throw new Error('[DOS-AUTH] AuthMiddleware not initialized. Call setAuthMiddleware() during platform startup.');
  }
  return mw;
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

/**
 * External auth guard for scoped JWT sessions (vendor portals, regulator portals, etc).
 * Verifies a scoped JWT whose `role` must be one of `allowedRoles`. Sets `req.externalScope`.
 *
 * Canonical location for the DAuth external-scope pattern. Mirrors
 * services/auth-service/src/middleware/session.middleware.ts so modules and
 * other services can import it from @dos/auth/middleware without reaching into
 * a service package.
 */
export function externalAuthGuard(allowedRoles: string[]): RequestHandler {
  return (req, res, next): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    const token = header.slice(7);
    try {
      const secret = resolveJwtSigningSecret('dos-auth:external-guard');
      const decoded = jwt.verify(token, secret) as Record<string, any>;

      const role = decoded.role as string;
      if (!role || !allowedRoles.includes(role)) {
        res.status(403).json({ error: `Role '${role}' is not permitted. Allowed: ${allowedRoles.join(', ')}` });
        return;
      }

      req.externalScope = {
        tenantId: decoded.tenantId as string,
        entityType: decoded.entityType as string,
        entityId: decoded.entityId as string,
        role,
        permissions: (decoded.permissions as string[]) ?? [],
      };
      req.tenantId = decoded.tenantId as string;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

// Phase C — rich-context middleware variants. These reach the registered
// authz evaluator port directly (no factory closure dependency); services
// import them by name and use them on state-transition routes.
export {
  requireDauth,
  requireOwnershipOf,
  type RequireDauthOptions,
  type RequireOwnershipOptions,
} from './canonical-middleware';

/**
 * Scope guard — ensures the external scope from externalAuthGuard matches
 * the requested entity id (e.g., req.params.id equals scope.entityId).
 */
export function scopeGuard(paramName: string = 'id'): RequestHandler {
  return (req, res, next): void => {
    const scope = req.externalScope;
    if (!scope) {
      res.status(401).json({ error: 'No external scope context' });
      return;
    }
    const requested = req.params[paramName];
    if (requested && requested !== scope.entityId) {
      res.status(403).json({ error: 'Access denied: scope mismatch' });
      return;
    }
    next();
  };
}
