export { authenticate, requirePermission } from '@dos/module-auth';
export { validate, asyncHandler, setAuditData } from '@dos/platform-core/http';
export { safeQuery, tenantSchema } from '@dos/db';
export declare const evaluateLifecycleTransition: (..._args: any[]) => Promise<{
    allowed: boolean;
}>;
export declare const emitEvent: (..._args: any[]) => Promise<void>;
