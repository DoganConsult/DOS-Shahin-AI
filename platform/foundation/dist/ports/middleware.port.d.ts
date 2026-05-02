/**
 * Middleware port — outbound interface wrapping HTTP utility middlewares.
 * Default impls are inert pass-throughs so the module is testable standalone;
 * host wires real `asyncHandler/validate/auditMiddleware/setAuditData/moduleStack`
 * from `@dos/platform-core/http` (or any equivalent) via `bindMiddlewarePort`.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
export type AsyncHandlerFn = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void) => RequestHandler;
export type ValidateFn = (schemas: {
    body?: unknown;
    query?: unknown;
    params?: unknown;
}) => RequestHandler;
export type AuditMiddlewareFn = (moduleCode: string) => RequestHandler;
export type SetAuditDataFn = (res: Response, data: Record<string, unknown>) => void;
export type ModuleStackFn = (moduleCode: string) => RequestHandler;
export declare function bindMiddlewarePort(impl: {
    asyncHandler?: AsyncHandlerFn;
    validate?: ValidateFn;
    auditMiddleware?: AuditMiddlewareFn;
    setAuditData?: SetAuditDataFn;
    moduleStack?: ModuleStackFn;
}): void;
export declare const asyncHandler: AsyncHandlerFn;
export declare const validate: ValidateFn;
export declare const auditMiddleware: AuditMiddlewareFn;
export declare const setAuditData: SetAuditDataFn;
export declare const moduleStack: ModuleStackFn;
export declare function scopeContext(_req: Request, _res: Response, next: NextFunction): void;
