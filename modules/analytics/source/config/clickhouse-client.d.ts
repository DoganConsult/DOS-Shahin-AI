/**
 * ClickHouse Client Configuration
 *
 * Singleton ClickHouse HTTP client for analytics queries.
 * Gated behind CLICKHOUSE_ENABLED=true.
 *
 * Environment variables:
 *   CLICKHOUSE_ENABLED=true
 *   CLICKHOUSE_HOST=127.0.0.1
 *   CLICKHOUSE_PORT=8123
 *   CLICKHOUSE_DATABASE=shahin_analytics
 *   CLICKHOUSE_USER=default
 *   CLICKHOUSE_PASSWORD=
 */
interface ClickHouseResultSetLike<T = Record<string, unknown>> {
    json(): Promise<T[]>;
}
interface ClickHouseClientLike {
    query(args: {
        query: string;
        query_params?: Record<string, unknown>;
        format: string;
    }): Promise<ClickHouseResultSetLike>;
    insert(args: {
        table: string;
        values: Record<string, unknown>[];
        format: string;
    }): Promise<unknown>;
    command(args: {
        query: string;
    }): Promise<unknown>;
}
export declare function isClickHouseEnabled(): boolean;
export declare function getClickHouseClient(): ClickHouseClientLike | null;
/**
 * Execute a ClickHouse query and return typed rows.
 */
export declare function chQuery<T = Record<string, unknown>>(query: string, params?: Record<string, unknown>): Promise<T[]>;
/**
 * Insert rows into a ClickHouse table.
 */
export declare function chInsert<T extends Record<string, unknown>>(table: string, values: T[]): Promise<void>;
/**
 * Health check — verifies ClickHouse is reachable and the database exists.
 */
export declare function checkClickHouseHealth(): Promise<{
    healthy: boolean;
    version?: string;
    database?: string;
    error?: string;
}>;
/**
 * Ensure analytics tables exist in ClickHouse.
 * Called once during server startup when ClickHouse is enabled.
 */
export declare function ensureClickHouseTables(): Promise<void>;
export {};
