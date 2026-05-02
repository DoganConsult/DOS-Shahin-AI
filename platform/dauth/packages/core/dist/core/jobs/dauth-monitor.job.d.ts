export declare function cleanupExpiredDelegations(tenantId: string): Promise<{
    deactivated: number;
}>;
export declare function cleanupExpiredSessions(tenantId: string): Promise<{
    terminated: number;
}>;
export declare function expireStaleInvitations(tenantId: string): Promise<{
    expired: number;
}>;
export declare function runSodPeriodicScan(tenantId: string): Promise<{
    conflicts: number;
}>;
export declare function expireStaleRoleAssignments(tenantId: string): Promise<{
    expired: number;
}>;
export declare function getDauthJobs(): Promise<any[]>;
