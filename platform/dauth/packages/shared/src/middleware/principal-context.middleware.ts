/**
 * DAuth — Principal context extraction.
 *
 * Converts an authenticated request (session.middleware has populated req.user)
 * into an ActorContext shape consumable by withTenantClient + downstream
 * services. Keeps the GUC-mapping concern out of every service call site.
 */

import type { Request, Response, NextFunction } from 'express';
import type { ActorContext, ActorPrincipalType } from '@dos/db';

const ALLOWED: ReadonlySet<ActorPrincipalType> = new Set([
  'human',
  'agent',
  'service_account',
  'external',
]);

function normalizePrincipalType(raw: unknown): ActorPrincipalType {
  if (typeof raw === 'string' && ALLOWED.has(raw as ActorPrincipalType)) {
    return raw as ActorPrincipalType;
  }
  if (raw === 'service') return 'service_account';
  return 'human';
}

export function getPrincipalContextFromRequest(req: Request): ActorContext | undefined {
  const user = (req as Request & { user?: Record<string, unknown> }).user;
  if (!user) return undefined;
  const principalType = normalizePrincipalType(user.principalType);
  const actorId =
    typeof user.actorId === 'string'
      ? user.actorId
      : typeof user.userId === 'string'
        ? user.userId
        : undefined;
  const userId = typeof user.userId === 'string' ? user.userId : undefined;
  return { principalType, actorId, userId };
}

export function attachPrincipalContext(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ctx = getPrincipalContextFromRequest(req);
  if (ctx) {
    (res.locals as Record<string, unknown>).actorContext = ctx;
  }
  next();
}
