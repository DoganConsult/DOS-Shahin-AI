export { auditMiddleware, setAuditData } from '@dos/platform-core/http';
export { asyncHandler } from '@dos/platform-core/http';
export { moduleStack } from '@dos/platform-core/http';
export { validate } from '@dos/platform-core/http';
export { rateLimiter } from '@dos/platform-core/http';
export { requireOwnership } from '@dos/platform-core/http';
export { automationMiddleware } from '@dos/platform-core/http';
export { fieldRbacFilter } from '@dos/platform-core/http';
export { enforceMandatoryFields, enforceStageGates } from '@dos/platform-core/http';
export { lifecycleGate } from '@dos/platform-core/http';
export { mutationEventHook } from '@dos/platform-core/http';

// No-op lifecycle status endpoint middleware. Canonical implementation
// lives downstream in `@dos/platform-core/http.lifecycleGate`; the
// `lifecycleStatusEndpoint` wrapper was never migrated and would need an
// extraction pass. Until then this is a pass-through so routes compile.
import type { Request as _Req2, Response as _Res2, NextFunction as _Next2 } from 'express';
export function lifecycleStatusEndpoint(_moduleCode: string) {
  return (_req: _Req2, _res: _Res2, next: _Next2): void => next();
}
