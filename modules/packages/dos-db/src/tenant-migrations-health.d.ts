export interface TenantMigrationsHealth {
    generatedAt: string;
    tenantsTracked: number;
    tenantsWithFailures: number;
    totalFailures: number;
    topFailedMigrations: Array<{
        migrationId: string;
        failedTenants: number;
        sampleError: string | null;
    }>;
    oldestFailureAt: string | null;
    status: 'ok' | 'degraded' | 'critical';
}
export declare function summarizeTenantMigrationsHealth(): Promise<TenantMigrationsHealth>;
