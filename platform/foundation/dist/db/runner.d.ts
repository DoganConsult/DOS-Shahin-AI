import type { DbClient } from '../ports/database.port';
export interface MigrationRecord {
    filename: string;
    appliedAt: string;
}
export interface RunMigrationsResult {
    applied: string[];
    skipped: string[];
}
export declare function runMigrations(client: DbClient, opts?: {
    migrationsDir?: string;
}): Promise<RunMigrationsResult>;
