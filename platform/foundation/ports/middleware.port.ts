/**
 * Middleware port — outbound interface wrapping HTTP utility middlewares.
 * Default impls are inert pass-throughs so the module is testable standalone;
 * host wires real `asyncHandler/validate/auditMiddleware/setAuditData/moduleStack`
 * from `@dos/platform-core/http` (or any equivalent) via `bindMiddlewarePort`.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';

export type AsyncHandlerFn = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void,
) => RequestHandler;

export type ValidateFn = (schemas: { body?: unknown; query?: unknown; params?: unknown }) => RequestHandler;

export type AuditMiddlewareFn = (moduleCode: string) => RequestHandler;

export type SetAuditDataFn = (res: Response, data: Record<string, unknown>) => void;

export type ModuleStackFn = (moduleCode: string) => RequestHandler;

const defaultAsyncHandler: AsyncHandlerFn = (fn) => async (req, res, next) => {
  try {
    await Promise.resolve(fn(req, res, next));
  } catch (err) {
    next(err);
  }
};

const defaultValidate: ValidateFn = () => (_req, _res, next) => next();
const defaultAudit: AuditMiddlewareFn = () => (_req, _res, next) => next();
const defaultSetAudit: SetAuditDataFn = (res, data) => {
  (res as any).__auditData = { ...((res as any).__auditData ?? {}), ...data };
};
const defaultModuleStack: ModuleStackFn = (moduleCode) => (req, _res, next) => {
  (req as any).moduleCode = moduleCode;
  next();
};

let _asyncHandler: AsyncHandlerFn = defaultAsyncHandler;
let _validate: ValidateFn = defaultValidate;
let _auditMiddleware: AuditMiddlewareFn = defaultAudit;
let _setAuditData: SetAuditDataFn = defaultSetAudit;
let _moduleStack: ModuleStackFn = defaultModuleStack;

export function bindMiddlewarePort(impl: {
  asyncHandler?: AsyncHandlerFn;
  validate?: ValidateFn;
  auditMiddleware?: AuditMiddlewareFn;
  setAuditData?: SetAuditDataFn;
  moduleStack?: ModuleStackFn;
}) {
  if (impl.asyncHandler) _asyncHandler = impl.asyncHandler;
  if (impl.validate) _validate = impl.validate;
  if (impl.auditMiddleware) _auditMiddleware = impl.auditMiddleware;
  if (impl.setAuditData) _setAuditData = impl.setAuditData;
  if (impl.moduleStack) _moduleStack = impl.moduleStack;
}

export const asyncHandler: AsyncHandlerFn = (fn) => _asyncHandler(fn);
export const validate: ValidateFn = (s) => _validate(s);
export const auditMiddleware: AuditMiddlewareFn = (m) => _auditMiddleware(m);
export const setAuditData: SetAuditDataFn = (r, d) => _setAuditData(r, d);
export const moduleStack: ModuleStackFn = (m) => _moduleStack(m);

export function scopeContext(_req: Request, _res: Response, next: NextFunction) {
  next();
}
