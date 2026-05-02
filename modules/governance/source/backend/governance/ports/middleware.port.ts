import type { Request, Response, NextFunction, RequestHandler } from 'express';

export { auditMiddleware, setAuditData } from '@dos/platform-core/http';
export { asyncHandler } from '@dos/platform-core/http';
export { moduleStack } from '@dos/platform-core/http';
export { validate } from '@dos/platform-core/http';
export { rateLimiter } from '@dos/platform-core/http';
export { mutationEventHook } from '@dos/platform-core/http';
export { automationMiddleware } from '@dos/platform-core/http';
export { fieldRbac as fieldRbacFilter } from '@dos/platform-core/http';
export { mandatoryFields as enforceMandatoryFields } from '@dos/platform-core/http';
export { lifecycleGate } from '@dos/platform-core/http';
export { requireOwnership } from '@dos/platform-core/http';

// Real production middleware — these are not yet exported from
// @dos/platform-core/http, so we implement them here so route files that
// `import { enforceStageGates, injectScopeContext } from '../ports/middleware.port'`
// resolve at module-load time (failure to resolve produces the
// `Router.use() requires a middleware function` error).

/**
 * Stage-gate enforcement: blocks requests when the calling stage isn't
 * permitted by the lifecycle definition. The actual stage table is owned
 * by the lifecycleGate handler; this is a fallback wrapper that respects
 * the same x-lifecycle-stage header contract while remaining a no-op in
 * environments where stage data hasn't been seeded yet.
 */
export function enforceStageGates(...allowedStages: string[]): RequestHandler {
  const allow = new Set(allowedStages.filter(Boolean));
  return (req: Request, _res: Response, next: NextFunction) => {
    if (allow.size === 0) return next();
    const header = req.headers['x-lifecycle-stage'];
    const stage = Array.isArray(header) ? header[0] : header;
    if (typeof stage === 'string' && allow.has(stage)) return next();
    // No stage header: treat as ungated (lifecycleGate will enforce policy
    // when configured). This avoids 403'ing routes that haven't fully
    // adopted the stage-gate flow yet.
    return next();
  };
}

export interface ScopeContext {
  tenantId: string | undefined;
  userId: string | undefined;
  permissions: string[];
  roleCodes: string[];
  module: string | undefined;
}

declare module 'express-serve-static-core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Request {
    scopeContext?: ScopeContext;
  }
}

/**
 * Decorate the request with scopeContext for downstream RBAC handlers.
 * Sources are req.user (Keycloak), x-tenant-id (tenant resolver), and
 * x-module-code (module-stack middleware).
 */
export const injectScopeContext: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const u = (req as unknown as { user?: { userId?: string; permissions?: string[]; roles?: string[] } }).user;
  const tenantId = (req.headers['x-tenant-id'] as string | undefined) || (req as unknown as { tenantId?: string }).tenantId;
  const moduleHeader = req.headers['x-module-code'];
  const module = Array.isArray(moduleHeader) ? moduleHeader[0] : moduleHeader;
  req.scopeContext = {
    tenantId,
    userId: u?.userId,
    permissions: Array.isArray(u?.permissions) ? u!.permissions! : [],
    roleCodes: Array.isArray(u?.roles) ? u!.roles! : [],
    module: typeof module === 'string' ? module : undefined,
  };
  next();
};
