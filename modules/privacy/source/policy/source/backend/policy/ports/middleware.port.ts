import type { Request, Response, NextFunction, RequestHandler } from 'express';

export { auditMiddleware, setAuditData } from '@dos/platform-core/http';
export { asyncHandler } from '@dos/platform-core/http';
export { moduleStack } from '@dos/platform-core/http';
export { automationMiddleware } from '@dos/platform-core/http';
export { requireOwnership } from '@dos/platform-core/http';
export { fieldRbacFilter } from '@dos/platform-core/http';
export { enforceMandatoryFields, enforceStageGates } from '@dos/platform-core/http';
export { lifecycleGate } from '@dos/platform-core/http';
export { validate } from '@dos/platform-core/http';
export { rateLimiter } from '@dos/platform-core/http';

// `injectScopeContext` is not yet exported from @dos/platform-core/http.
// This is a real middleware that decorates the request with the scope
// envelope downstream RBAC handlers expect: { tenantId, userId,
// permissions, roleCodes, module }. Each property is sourced from the
// already-authenticated `req.user` (Keycloak chokepoint at the gateway)
// and `x-tenant-id` header (tenant resolver). When any value is absent
// the middleware leaves the field undefined — handlers MUST treat
// `req.scopeContext.userId === undefined` as unauthenticated.
export interface ScopeContext {
  tenantId: string | undefined;
  userId: string | undefined;
  permissions: string[];
  roleCodes: string[];
  module: string | undefined;
}

declare module 'express-serve-static-core' {
  // augmentation merges with the existing express types
  // (intentionally optional to remain backwards-compatible with handlers
  //  that haven't been migrated yet)
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Request {
    scopeContext?: ScopeContext;
  }
}

export const injectScopeContext: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const u = (req as unknown as { user?: { userId?: string; permissions?: string[]; roles?: string[] } }).user;
  const tenantId = (req.headers['x-tenant-id'] as string | undefined) || (req as unknown as { tenantId?: string }).tenantId;
  const moduleHeader = req.headers['x-module-code'];
  const module = Array.isArray(moduleHeader) ? moduleHeader[0] : moduleHeader;
  req.scopeContext = {
    tenantId,
    userId: u?.userId,
    permissions: Array.isArray(u?.permissions) ? u!.permissions : [],
    roleCodes: Array.isArray(u?.roles) ? u!.roles : [],
    module: typeof module === 'string' ? module : undefined,
  };
  next();
};
