import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
export declare function setDbMetricsHook(hook: (operation: string, durationMs: number, error?: boolean) => void): void;
export declare function emptyResult<T extends Record<string, unknown> = Record<string, unknown>>(rows?: T[]): QueryResult<T>;
export declare function query<R extends QueryResultRow = any>(text: string, params?: unknown[]): Promise<QueryResult<R>>;
export declare function safeQuery<R extends QueryResultRow = any>(text: string, params?: unknown[]): Promise<QueryResult<R>>;
export declare function safeQueryWithClient<R extends QueryResultRow = any>(text: string, params?: unknown[], client?: PoolClient): Promise<QueryResult<R>>;
export declare function getClient(): Promise<PoolClient>;
export declare function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T>;
export declare function withPoolClient<T>(customPool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T>;
