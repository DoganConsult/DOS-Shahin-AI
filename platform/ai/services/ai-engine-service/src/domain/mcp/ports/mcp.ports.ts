import { Request, Response, NextFunction } from 'express';

export { authenticate, requirePermission } from '@dos/dauth-shared';
export { validate, asyncHandler, setAuditData } from '@dos/platform-core/http';
export { safeQuery, tenantSchema } from '@dos/db';

export const evaluateLifecycleTransition = async (..._args: any[]) => ({ allowed: true });
export const emitEvent = async (..._args: any[]) => {};
