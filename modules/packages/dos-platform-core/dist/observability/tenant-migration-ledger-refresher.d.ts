interface QueryFn {
    (sql: string, params?: unknown[]): Promise<{
        rows: Array<Record<string, unknown>>;
    }>;
}
export declare function startTenantMigrationLedgerRefresher(safeQuery: QueryFn): void;
export declare function stopTenantMigrationLedgerRefresher(): void;
export {};
