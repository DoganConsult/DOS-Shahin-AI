/**
 * Per-tenant migration runner.
 *
 * Replaces the previous fire-and-forget `runTenantMigrations` flow which:
 *  - swallowed failures with `.warn`
 *  - silently created stub tables for "critical" names when migrations
 *    failed (the drift factory)
 *  - had no record of what was applied to which tenant
 *
 * This runner writes every attempt to `dos.tenant_migrations` and:
 *  - skips a migration if a row exists with matching checksum + status='applied'
 *  - re-applies if the checksum changed (treats migration content as
 *    the version key — no separate version field to drift)
 *  - throws on first failure unless `continueOnError: true`
 *
 * Identifier safety: the tenantId is run through assertTenantId; the
 * substituted SQL replaces __TENANT_SCHEMA__ with `tenantSchema(tenantId)`
 * which carries the strict TENANT_SCHEMA_REGEX invariant.
 */
export type MigrationSource = 'ops/tenant' | `module/${string}` | 'inline-baseline';
export interface DiscoveredMigration {
    migrationId: string;
    source: MigrationSource;
    filename: string;
    absolutePath: string;
    rawSql: string;
}
export interface AppliedMigrationResult {
    migrationId: string;
    source: MigrationSource;
    filename: string;
    checksum: string;
    status: 'applied' | 'failed' | 'skipped';
    durationMs: number;
    errorMessage?: string;
}
export interface RunOptions {
    continueOnError?: boolean;
    appliedBy?: string;
    /** Override the discovery roots; defaults derived from process.cwd() */
    opsTenantDir?: string;
    modulesDir?: string;
    /** Optional in-memory baseline migrations (e.g. inline DDL extracted from db.ts) */
    inlineBaselines?: Array<Pick<DiscoveredMigration, 'migrationId' | 'filename' | 'rawSql'>>;
    /** Filter to a subset of migration IDs (useful for retries) */
    onlyMigrationIds?: string[];
}
export interface RunSummary {
    tenantId: string;
    schema: string;
    results: AppliedMigrationResult[];
    applied: number;
    skipped: number;
    failed: number;
}
export declare function discoverTenantMigrations(opts?: RunOptions): DiscoveredMigration[];
export declare function runTenantMigrationsTracked(tenantId: string, options?: RunOptions): Promise<RunSummary>;
/**
 * Backfill: for an existing tenant, mark every discovered migration as
 * "verified-by-backfill" if its post-substitution SQL would be a no-op
 * (i.e. all CREATE TABLE IF NOT EXISTS targets already exist). This lets
 * us bring legacy tenants under the tracker without re-running migrations
 * that are known-applied. NOT a substitute for drift detection — it only
 * proves the named tables exist, not that columns/constraints match.
 */
export declare function backfillTrackerByExistence(tenantId: string, options?: RunOptions): Promise<RunSummary>;
