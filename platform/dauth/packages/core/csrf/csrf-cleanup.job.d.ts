/** Delete CSRF failures older than retention policy. */
export declare function cleanupCsrfFailures(): Promise<{
    deleted: number;
}>;
/** Delete session security events older than retention policy. */
export declare function cleanupSessionSecurityEvents(): Promise<{
    deleted: number;
}>;
/** Return job definitions for the scheduler. */
export declare function getCsrfJobs(): {
    name: string;
    cron: string;
    description: string;
    handler: typeof cleanupCsrfFailures;
}[];
