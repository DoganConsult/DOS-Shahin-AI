/**
 * DAuth — Principal context extraction.
 *
 * Converts an authenticated request (session.middleware has populated req.user)
 * into an ActorContext shape consumable by withTenantClient + downstream
 * services. Keeps the GUC-mapping concern out of every service call site.
 */
import type { Request, Response, NextFunction } from 'express';
import type { ActorContext } from '@dos/db';
export declare function getPrincipalContextFromRequest(req: Request): ActorContext | undefined;
export declare function attachPrincipalContext(req: Request, res: Response, next: NextFunction): void;
