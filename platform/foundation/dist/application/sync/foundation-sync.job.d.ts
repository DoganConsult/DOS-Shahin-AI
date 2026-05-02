/**
 * Foundation Sync Job
 * @owner DOS / Foundation module
 *
 * Scheduled background job that:
 *  1. Syncs org hierarchy integrity (units, departments, positions, teams)
 *  2. Detects and repairs orphaned org nodes across all provisioned tenants
 *  3. Refreshes denormalised ancestry paths for hierarchy-aware queries
 *  4. Emits foundation.org_hierarchy.synced events on the platform event bus
 *
 * Runs: every 6 hours (0 * /6 * * *)
 * Fallback schedule (node-cron): same cron when TEMPORAL_ENABLED=false
 */
/**
 * Register the foundation sync job with the platform scheduler.
 * Call this from the DOS job bootstrap (server startup Jobs phase).
 */
export declare function registerFoundationSyncJob(): void;
