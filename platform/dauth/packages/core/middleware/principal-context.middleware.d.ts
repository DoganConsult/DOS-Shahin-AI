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
import type { ActorContext } from '@dos/db';
export declare function getPrincipalContextFromRequest(req: Request): ActorContext | undefined;
/**
 * Express middleware: attaches ctx to res.locals.actorContext so downstream
 * handlers can call withTenantClient(tenantId, res.locals.actorContext, ...).
 */
export declare function attachPrincipalContext(req: Request, res: Response, next: NextFunction): void;
