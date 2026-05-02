import type { CsrfFailureReason } from './csrf-policy.contracts';
export interface RecordCsrfFailureOpts {
    tenantId?: string;
    sessionId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    path: string;
    method: string;
    reason: CsrfFailureReason;
    hintReturned?: string;
    correlationId?: string;
}
/** Persist a CSRF failure to DB + publish security event + log. */
export declare function recordCsrfFailure(opts: RecordCsrfFailureOpts): Promise<void>;
/** Count failures in a time window for rate limiting. */
export declare function getCsrfFailureCount(ip: string, windowMs: number): Promise<number>;
/** Get recent CSRF failures for admin dashboard. */
export declare function getRecentCsrfFailures(tenantId: string, limit?: number): Promise<Array<{
    failureId: string;
    ip: string;
    path: string;
    method: string;
    reason: string;
    occurredAt: string;
}>>;
