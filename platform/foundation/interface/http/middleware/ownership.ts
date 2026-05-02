/**
 * Ownership guard: allow user to act on their own profile, otherwise require
 * an admin / user-admin role. Throws UserServiceError on denial so the
 * bootstrap error handler serializes a consistent 403.
 */
import type { Request, Response, NextFunction } from 'express';
import { UserServiceError } from '../../../contracts/user-errors';

const ADMIN_ROLES = new Set(['admin', 'user_admin', 'super_admin']);

function actorRoles(req: Request): Set<string> {
  const u = req.user as { role?: string; roles?: string[] } | undefined;
  const out = new Set<string>();
  if (u?.role) out.add(u.role);
  for (const r of u?.roles ?? []) out.add(r);
  return out;
}

export function hasAdminRole(req: Request): boolean {
  const roles = actorRoles(req);
  for (const r of ADMIN_ROLES) if (roles.has(r)) return true;
  return false;
}

/**
 * Applied to routes of shape /users/:id/... — allows if param id === current
 * user id OR current user has admin role.
 */
export function requireSelfOrAdmin(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const targetId = req.params[paramName];
    const actorId = req.user?.userId;
    if (targetId && actorId && targetId === actorId) return next();
    if (hasAdminRole(req)) return next();
    next(new UserServiceError('UNAUTHORIZED_PROFILE_UPDATE', undefined, {
      target: targetId, actor: actorId,
    }));
  };
}

export function requireAdmin() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (hasAdminRole(req)) return next();
    next(new UserServiceError('UNAUTHORIZED_PROFILE_UPDATE', undefined, {
      actor: req.user?.userId, reason: 'admin_required',
    }));
  };
}
