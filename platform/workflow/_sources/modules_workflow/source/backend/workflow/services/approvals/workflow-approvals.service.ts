import { safeQuery } from "@dos/db";

/**
 * Re-export from canonical location.
 * Law 1: One canonical engine per concern.
 */
export * from '../core/workflow-approvals.service';

export const validatePreconditions = (..._args: any[]): any => { return {} as any; };