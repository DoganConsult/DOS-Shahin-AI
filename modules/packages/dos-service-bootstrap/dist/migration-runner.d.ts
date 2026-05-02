export interface MigrationRunnerOptions {
    serviceCode: string;
    connectionString: string;
    migrationsDir?: string;
    enabled?: boolean;
}
export declare function runServiceMigrations(options: MigrationRunnerOptions): Promise<{
    applied: number;
    skipped: number;
}>;
export declare function rollbackServiceMigrations(options: MigrationRunnerOptions): Promise<{
    rolledBack: number;
}>;
//# sourceMappingURL=migration-runner.d.ts.map