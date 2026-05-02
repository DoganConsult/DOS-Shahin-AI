export interface RlsAuditOptions {
    /** Schemas to check. Default: all tenant schemas + public. */
    schemas?: string[];
    /**
     * Tables explicitly exempt from RLS (e.g. fully global lookup tables like
     * country codes). Keep this list empty in production.
     */
    exempt?: string[];
}
export interface RlsTableStatus {
    schema: string;
    table: string;
    rlsEnabled: boolean;
    rlsForced: boolean;
    policyCount: number;
}
export interface RlsAuditResult {
    scannedTables: number;
    compliant: RlsTableStatus[];
    missing: RlsTableStatus[];
    forcedMissing: RlsTableStatus[];
    noPolicies: RlsTableStatus[];
}
export declare function auditRls(options?: RlsAuditOptions): Promise<RlsAuditResult>;
/**
 * CI gate — throws when run in a mode where RLS is required and not
 * compliant. `DAUTH_RLS_FAIL_CLOSED=true` is the default in production.
 */
export declare function assertRlsCompliant(options?: RlsAuditOptions): Promise<void>;
