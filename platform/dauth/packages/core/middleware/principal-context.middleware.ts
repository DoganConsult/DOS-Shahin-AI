/**
 * DAuth — Principal context extraction.
 *
 * Converts an authenticated request (session.middleware has populated req.user)
 * into an ActorContext shape consumable by withTenantClient + downstream
 * services. Keeps the GUC-mapping concern out of every service call site.
 *
 * Usage:
 *   import { getPrincipalContextFromRequest } from '@dos/dauth-shared';
 *   const ctx = getPrincipalContextFromRequest(req);
 *   await withTenantClient(tenantId, ctx, async (client) => { ... });
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
  // Backwards-compat: legacy JWTs may carry 'service'; coerce to service_account.
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

/**
 * Express middleware: attaches ctx to res.locals.actorContext so downstream
 * handlers can call withTenantClient(tenantId, res.locals.actorContext, ...).
 */
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
