export type { AccessDecisionContext, AccessDecision, AuthPayload, SodCheckResult, SodViolation, DelegationGrant } from '@dos/contracts';
import type { RequestHandler } from 'express';
export interface AuthMiddleware {
    authenticate: RequestHandler;
    optionalAuthenticate: RequestHandler;
    requirePermission: (permission: string) => RequestHandler;
    requireAnyPermission: (...permissions: string[]) => RequestHandler;
    requireSuperAdmin: RequestHandler;
}
export declare function setAuthMiddleware(middleware: AuthMiddleware): void;
export declare function getAuthMiddleware(): AuthMiddleware;
export declare const authenticate: RequestHandler;
export declare const optionalAuthenticate: RequestHandler;
export declare function requirePermission(permission: string): RequestHandler;
export declare function requireAnyPermission(...permissions: string[]): RequestHandler;
export declare const requireSuperAdmin: RequestHandler;
