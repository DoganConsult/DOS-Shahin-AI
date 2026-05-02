export { auditMiddleware } from '@dos/platform-core/http';
// Phase 0.5: route through local compat shim (accepts both 2-arg and legacy
// 4-arg setAuditData signatures). Wave 2 will migrate risk callers to the
// strict 2-arg form and remove this indirection.
export { setAuditData } from '../_wave1-compat';
export { asyncHandler } from '@dos/platform-core/http';
export { moduleStack } from '@dos/platform-core/http';
export { validate } from '@dos/platform-core/http';
export { automationMiddleware, requireOwnership, fieldRbac, mandatoryFields, lifecycleGate, scopeContext } from '@dos/platform-core/http';
export { rateLimiter } from '@dos/platform-core/http';
