/**
 * Ownership guard: allow user to act on their own profile, otherwise require
 * an admin / user-admin role. Throws UserServiceError on denial so the
 * bootstrap error handler serializes a consistent 403.
 */
import type { Request, Response, NextFunction } from 'express';
export declare function hasAdminRole(req: Request): boolean;
/**
 * Applied to routes of shape /users/:id/... — allows if param id === current
 * user id OR current user has admin role.
 */
export declare function requireSelfOrAdmin(paramName?: string): (req: Request, res: Response, next: NextFunction) => void;
export declare function requireAdmin(): (req: Request, _res: Response, next: NextFunction) => void;
