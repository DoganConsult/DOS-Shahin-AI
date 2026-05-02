export { authenticate, requirePermission } from '@dos/dauth-shared';
export { validate, asyncHandler, setAuditData } from '@dos/platform-core/http';
export { safeQuery, tenantSchema } from '@dos/db';
export const evaluateLifecycleTransition = async (..._args) => ({ allowed: true });
export const emitEvent = async (..._args) => { };
//# sourceMappingURL=mcp.ports.js.map